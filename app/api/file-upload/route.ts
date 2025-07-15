import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;

async function uploadToGoogleDrive(accessToken: string, file: File, filename: string, folderId?: string) {
  // Step 1: Get upload URL (multipart)
  const metadata = {
    name: filename,
    parents: folderId ? [folderId] : undefined,
  };
  const boundary = "foo_bar_baz";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';

  let body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${contentType}\r\n\r\n`;
  const preBody = Buffer.from(body, 'utf-8');
  const postBody = Buffer.from(closeDelimiter, 'utf-8');
  const multipartBody = Buffer.concat([preBody, fileBuffer, postBody]);

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Erro ao enviar arquivo para o Google Drive');
  }
  return await res.json();
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: 'Usuário não autenticado ou token ausente.' }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = (formData.get("file") as File) || null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const originalSize = formData.get("originalSize") as string;
    if (!file) {
      return NextResponse.json({ error: "No file found" }, { status: 400 });
    }

    // Upload para o Google Drive
    const driveResult = await uploadToGoogleDrive(accessToken, file, title || file.name, GOOGLE_DRIVE_FOLDER_ID);
    const publicId = driveResult.id;
    const createdAt = driveResult.createdTime || new Date().toISOString();
    const url = driveResult.webViewLink || `https://drive.google.com/file/d/${publicId}/view`;
    const mimeType = driveResult.mimeType;
    const bytes = driveResult.size || originalSize;

    // Salvar no Prisma
    const dbFile = await prisma.file.create({
      data: {
        title: title || file.name,
        description,
        publicId,
        originalSize: bytes?.toString() || '',
        compressedSize: '',
        duration: 0,
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: dbFile.id,
        title: dbFile.title,
        url,
        type: mimeType,
        createdAt: dbFile.createdAt,
        bytes,
        icon: driveResult.iconLink,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao fazer upload.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
