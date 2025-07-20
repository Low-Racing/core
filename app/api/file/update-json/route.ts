/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  let accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    accessToken = request.headers.get('x-access-token') || undefined;
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { fileId, content, fileName } = await request.json();

    if (!fileId || !content || !fileName) {
      return NextResponse.json({ 
        error: 'ID do arquivo, conteúdo e nome do arquivo são obrigatórios' 
      }, { status: 400 });
    }

    // Configura o cliente da API do Google Drive
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Converte o conteúdo JSON para string
    const jsonString = JSON.stringify(content, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    // Atualiza o arquivo no Google Drive
    const response = await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'application/json',
        body: buffer,
      },
      requestBody: {
        name: fileName,
        mimeType: 'application/json',
      },
    });

    if (!response.data) {
      throw new Error('Falha ao atualizar o arquivo no Google Drive');
    }

    return NextResponse.json({
      success: true,
      message: 'Arquivo JSON atualizado com sucesso',
      fileId: response.data.id,
    });

  } catch (error: any) {
    console.error('Erro ao atualizar arquivo JSON:', error);
    
    // Tratamento específico para erros da API do Google
    if (error.response?.data?.error) {
      const googleError = error.response.data.error;
      return NextResponse.json({ 
        error: `Erro do Google Drive: ${googleError.message || googleError}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
