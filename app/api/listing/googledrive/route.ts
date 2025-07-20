/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

// Interface para os metadados locais
interface FileMetadata {
  id: string;
  title: string;
  description: string;
}

// Caminho para o arquivo de metadados
const metadataFilePath = path.join(process.cwd(), 'file-metadata.json');

// Função para ler os metadados locais
async function readMetadata(): Promise<FileMetadata[]> {
  try {
    const data = await fs.readFile(metadataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return []; // Retorna array vazio se o arquivo não existir
    }
    throw error;
  }
}

const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

async function fetchAllGoogleDriveFiles(accessToken: string, folderId?: string) {
  let files: any[] = [];
  let pageToken = '';
  const base = 'https://www.googleapis.com/drive/v3/files';
  let query = "trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  do {
    let url = `${base}?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,description,mimeType,createdTime,size,iconLink,thumbnailLink,webViewLink,webContentLink,lastModifyingUser)`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    url += '&pageSize=100';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erro ao buscar arquivos do Google Drive: ${res.statusText}`);
    }

    const data = await res.json();
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export async function GET(req: Request) {
  try {
    console.log('🔍 Iniciando requisição para listar arquivos do Google Drive');
    
    // Log dos headers recebidos
    const headers = Object.fromEntries(req.headers.entries());
    console.log('📋 Headers recebidos:', JSON.stringify(headers, null, 2));
    
    console.log('🔑 Iniciando obtenção da sessão do servidor...');
    const session = await getServerSession(authOptions);
    console.log('🔑 Sessão do servidor:', session ? 'Encontrada' : 'Não encontrada');
    
    let accessToken = (session as any)?.accessToken as string | undefined;
    console.log('🔑 Token de acesso da sessão:', accessToken ? 'Presente' : 'Ausente');

    if (!accessToken) {
      accessToken = req.headers.get("x-access-token") as string;
      console.log('🔑 Token de acesso do header x-access-token:', accessToken ? 'Presente' : 'Ausente');
    }

    if (!accessToken) {
      console.error('❌ Erro: Nenhum token de acesso encontrado na sessão ou nos headers');
      return NextResponse.json({ 
        error: 'Usuário não autenticado ou token ausente.',
        details: 'Nenhum token de acesso encontrado na sessão ou nos headers',
        session: session ? 'Sessão existe' : 'Sem sessão',
        headers: Object.keys(headers)
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || DEFAULT_FOLDER_ID || undefined;

    console.log('📂 Buscando arquivos...');
    const [driveFiles, localMetadata] = await Promise.all([
      fetchAllGoogleDriveFiles(accessToken, folderId),
      readMetadata().catch(err => {
        console.error('⚠️ Erro ao ler metadados locais:', err);
        return [];
      }),
    ]);

    console.log(`✅ ${driveFiles.length} arquivos encontrados no Google Drive`);
    console.log(`📊 ${localMetadata.length} metadados locais encontrados`);

    // Mapear os arquivos para o formato esperado pelo frontend
    const mappedFiles = driveFiles.map((file: any) => {
      const localFile = localMetadata.find((f: any) => f.id === file.id);
      
      // Gerar descrição baseada no tipo de arquivo
      let description = localFile?.description || '';
      if (!description) {
        if (file.mimeType === 'application/json') {
          description = 'Arquivo de configuração JSON';
        } else if (file.mimeType.startsWith('image/')) {
          description = `Imagem ${file.mimeType.split('/')[1].toUpperCase()}`;
        } else if (file.mimeType.startsWith('video/')) {
          description = `Vídeo ${file.mimeType.split('/')[1].toUpperCase()}`;
        } else if (file.mimeType === 'application/pdf') {
          description = 'Documento PDF';
        } else if (file.mimeType.includes('spreadsheet')) {
          description = 'Planilha';
        } else if (file.mimeType.includes('document')) {
          description = 'Documento de texto';
        } else if (file.mimeType.includes('presentation')) {
          description = 'Apresentação';
        } else {
          description = 'Arquivo';
        }
        
        // Adicionar informações de tamanho se disponível
        if (file.size) {
          const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          description += ` • ${sizeInMB} MB`;
        }
      }

      return {
        id: file.id,
        title: file.name,
        description,
        url: file.webContentLink || `https://drive.google.com/file/d/${file.id}/view`,
        type: file.mimeType,
        format: file.mimeType,
        createdAt: file.createdTime,
        bytes: parseInt(file.size || '0'),
        icon: file.iconLink,
        thumbnail: file.thumbnailLink,
        webContentLink: file.webContentLink,
        uploadedBy: file.lastModifyingUser?.displayName || 'Usuário',
        userAvatar: file.lastModifyingUser?.photoLink?.replace(/=s\d+$/, '=s64') // Tamanho padrão para o avatar
      };
    });

    console.log(`✅ ${mappedFiles.length} arquivos processados com sucesso`);
    return NextResponse.json({ files: mappedFiles });
  } catch (err: any) {
    console.error('❌ Erro ao listar arquivos:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name,
      code: (err as any).code
    });
    
    return NextResponse.json({ 
      error: 'Erro ao listar arquivos',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
