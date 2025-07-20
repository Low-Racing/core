/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises';
import path from 'path';

// Interface para os metadados locais
interface FileMetadata {
  id: string;
  title?: string;
  description?: string;
  uploadedBy?: string;
  userAvatar?: string;
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
  console.log('🔍 Iniciando busca de arquivos no Google Drive');
  console.log('📁 Pasta ID:', folderId || 'Nenhuma (diretório raiz)');
  
  let files: any[] = [];
  let pageToken = '';
  const base = 'https://www.googleapis.com/drive/v3/files';
  let query = "trashed=false";
  
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  
  console.log('🔎 Query de busca:', query);
  
  let page = 1;
  
  do {
    console.log(`📄 Buscando página ${page} de resultados...`);
    
    let url = `${base}?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,description,mimeType,createdTime,size,iconLink,thumbnailLink,webViewLink,webContentLink,owners(emailAddress,displayName,photoLink),lastModifyingUser(emailAddress,displayName,photoLink)`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    url += '&pageSize=100';
    
    console.log('🌐 Fazendo requisição para:', url);
    
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
    });

    console.log(`📡 Resposta recebida - Status: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erro na resposta da API do Google Drive:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: errorText
      });
      
      let errorMessage = `Erro ao buscar arquivos do Google Drive: ${res.status} ${res.statusText}`;
      try {
        const errJson = JSON.parse(errorText);
        console.error('📌 Detalhes do erro:', errJson);
        errorMessage = errJson?.error?.message || errorMessage;
      } catch (e) {
        console.error('❌ Não foi possível analisar a resposta de erro como JSON');
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json().catch(e => {
      console.error('❌ Erro ao analisar resposta JSON:', e);
      throw new Error('Resposta inválida da API do Google Drive');
    });
    
    console.log(`✅ Página ${page} - ${data.files?.length || 0} arquivos encontrados`);
    
    if (data.files && data.files.length > 0) {
      files = files.concat(data.files);
      console.log(`📊 Total acumulado: ${files.length} arquivos`);
    }
    
    pageToken = data.nextPageToken;
    page++;
    
  } while (pageToken);
  
  console.log(`✅ Busca concluída. Total de arquivos encontrados: ${files.length}`);
  return files;
}

export async function GET(req: Request) {
  console.log('🔍 Iniciando requisição para listar arquivos do Google Drive');
  
  // Log dos headers recebidos
  const headers = Object.fromEntries(req.headers.entries());
  console.log('📋 Headers recebidos:', headers);
  
  const session = await getServerSession(authOptions);
  console.log('🔑 Sessão do servidor:', session ? 'Encontrada' : 'Não encontrada');
  
  let accessToken = (session as any)?.accessToken as string | undefined;
  console.log('🔑 Token de acesso da sessão:', accessToken ? 'Presente' : 'Ausente');

  if (!accessToken) {
    accessToken = req.headers.get("x-access-token") || undefined;
    console.log('🔑 Token de acesso do header x-access-token:', accessToken ? 'Presente' : 'Ausente');
  }

  if (!accessToken) {
    console.error('❌ Erro: Nenhum token de acesso encontrado na sessão ou nos headers');
    return NextResponse.json({ 
      error: 'Usuário não autenticado ou token ausente.',
      details: 'Nenhum token de acesso encontrado na sessão ou nos headers'
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || DEFAULT_FOLDER_ID || undefined;

    const [driveFiles, localMetadata] = await Promise.all([
      fetchAllGoogleDriveFiles(accessToken, folderId),
      readMetadata(),
    ]);

    // Criar um mapa dos metadados locais, garantindo que todos os campos necessários existam
    const metadataMap = new Map();
    
    for (const item of localMetadata) {
      metadataMap.set(item.id, {
        title: item.title,
        description: item.description,
        uploadedBy: item.uploadedBy,
        userAvatar: item.userAvatar
      });
    }

    const files = await Promise.all(driveFiles.map(async (item: any) => {
      const localData = metadataMap.get(item.id);
      
      // Gerar descrição mais informativa
      // Prioriza a descrição do banco (Prisma) se existir
      let description = localData?.description ?? '';
      if (!description) {
        description = item.description;
      }
      
      if (!description) {
        if (item.mimeType.startsWith('image')) {
          description = 'Arquivo de imagem';
        } else if (item.mimeType.startsWith('video')) {
          description = 'Arquivo de vídeo';
        } else if (item.mimeType === 'application/json') {
          description = 'Arquivo JSON';
        } else if (item.mimeType === 'application/pdf') {
          description = 'Documento PDF';
        } else if (item.mimeType.includes('text')) {
          description = 'Arquivo de texto';
        } else if (item.mimeType.includes('spreadsheet') || item.mimeType.includes('excel')) {
          description = 'Planilha';
        } else if (item.mimeType.includes('document') || item.mimeType.includes('word')) {
          description = 'Documento';
        } else if (item.mimeType.includes('presentation') || item.mimeType.includes('powerpoint')) {
          description = 'Apresentação';
        } else {
          description = `Arquivo ${item.mimeType.split('/')[1]?.toUpperCase() || 'desconhecido'}`;
        }
      }
      
      // Buscar informações do usuário que fez o upload
      let uploadedBy = (session as any)?.user?.name || 'Usuário';
      let userAvatar = (session as any)?.user?.image || '';
      
      try {
        // Se tivermos o ID do usuário que fez o upload, podemos buscar detalhes adicionais
        if (item.lastModifyingUser?.emailAddress) {
          uploadedBy = item.lastModifyingUser.displayName || item.lastModifyingUser.emailAddress;
          userAvatar = item.lastModifyingUser.photoLink || '';
        } else if (item.owners?.[0]?.emailAddress) {
          // Se não tiver lastModifyingUser, tenta pegar do owner
          uploadedBy = item.owners[0].displayName || item.owners[0].emailAddress;
          userAvatar = item.owners[0].photoLink || '';
        }
      } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
      }
      
      return {
        id: item.id,
        title: localData?.title || item.name,
        description: description,
        url: item.webContentLink,
        type: item.mimeType.startsWith('image') ? 'image' : item.mimeType.startsWith('video') ? 'video' : 'file',
        format: item.mimeType,
        createdAt: item.createdTime,
        bytes: item.size ? Number(item.size) : undefined,
        icon: item.iconLink,
        thumbnail: item.thumbnailLink,
        webContentLink: item.webContentLink,
        // Mantém os dados do usuário dos metadados locais se existirem, senão usa os do Google Drive
        uploadedBy: localData?.uploadedBy || uploadedBy,
        userAvatar: localData?.userAvatar || userAvatar,
      };
    }));

    return NextResponse.json({ files });
  } catch (err: any) {
    console.error('Erro ao listar arquivos:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name,
      code: (err as any).code
    });
    
    return NextResponse.json({ 
      error: 'Erro ao listar arquivos',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }, { status: 500 });
  }
}
