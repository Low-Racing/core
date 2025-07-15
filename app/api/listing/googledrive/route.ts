import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
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
    let url = `${base}?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,description,mimeType,createdTime,size,iconLink,thumbnailLink,webViewLink,webContentLink)`;
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
    let folderId = searchParams.get('folderId') || DEFAULT_FOLDER_ID || undefined;

    const [driveFiles, localMetadata] = await Promise.all([
      fetchAllGoogleDriveFiles(accessToken, folderId),
      readMetadata(),
    ]);

    const metadataMap = new Map(localMetadata.map(item => [item.id, item]));

    const files = driveFiles.map((item: any) => {
      const localData = metadataMap.get(item.id);
      return {
        id: item.id,
        title: localData?.title || item.name,
        description: localData?.description || item.description,
        url: item.webContentLink,
        type: item.mimeType.startsWith('image') ? 'image' : item.mimeType.startsWith('video') ? 'video' : 'file',
        format: item.mimeType,
        createdAt: item.createdTime,
        bytes: item.size ? Number(item.size) : undefined,
        icon: item.iconLink,
        thumbnail: item.thumbnailLink,
        webContentLink: item.webContentLink,
      };
    });

    return NextResponse.json({ files });
  } catch (err: any) {
    console.error('Erro ao listar arquivos:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
