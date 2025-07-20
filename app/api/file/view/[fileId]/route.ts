/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  const session = await getServerSession(authOptions);
  let accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    accessToken = request.headers.get('x-access-token') || undefined;
  }

  if (!accessToken) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const { fileId } = params;
  if (!fileId) {
    return new NextResponse('ID do arquivo ausente', { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro ao buscar arquivo do Google Drive:', errorData);
      return new NextResponse(`Erro ao buscar arquivo: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Retransmite o conteúdo do arquivo
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Erro no proxy de visualização:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}
