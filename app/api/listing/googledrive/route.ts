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
  let files: any[] = [];
  let pageToken = '';
  const base = 'https://www.googleapis.com/drive/v3/files';
  let query = "trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  do {
    let url = `${base}?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,description,mimeType,createdTime,size,iconLink,thumbnailLink,webViewLink,webContentLink,owners(emailAddress,displayName,photoLink),lastModifyingUser(emailAddress,displayName,photoLink)`;
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
  const session = await getServerSession(authOptions);
  let accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    accessToken = req.headers.get("x-access-token") || undefined;
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Usuário não autenticado ou token ausente.' }, { status: 401 });
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
