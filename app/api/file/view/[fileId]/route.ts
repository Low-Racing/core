/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
);

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
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

    // Configura o cliente OAuth2 com o token de acesso
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Primeiro, obtém os metadados do arquivo para verificar as permissões
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,webContentLink',
    });

    // Em seguida, obtém o conteúdo do arquivo
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const contentLength = response.headers['content-length'] || '0';
    
    // Cria uma resposta com o conteúdo do arquivo
    return new NextResponse(response.data as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar arquivo:', error);
    
    // Mensagem de erro mais detalhada
    let errorMessage = 'Erro ao processar a solicitação';
    let statusCode = 500;

    if (error.code === 401) {
      errorMessage = 'Não autorizado - Token de acesso inválido ou expirado';
      statusCode = 401;
    } else if (error.code === 404) {
      errorMessage = 'Arquivo não encontrado';
      statusCode = 404;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
