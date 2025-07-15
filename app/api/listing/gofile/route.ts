import { NextResponse } from 'next/server';

// Coloque sua API key do GoFile em .env.local se necessário
const GOFILE_API_KEY = process.env.GOFILE_API_KEY;
const GOFILE_FOLDER_ID = process.env.GOFILE_FOLDER_ID; // Pasta raiz ou específica

// Função para buscar arquivos do GoFile
async function fetchGoFileContent() {
  // Obter servidor (recomendado pela doc do GoFile)
  const serverRes = await fetch('https://api.gofile.io/getServer');
  const serverData = await serverRes.json();
  const server = serverData.data.server;

  // Montar URL de listagem
  let url = `https://${server}.gofile.io/getContent?contentId=${GOFILE_FOLDER_ID}&token=${GOFILE_API_KEY}&websiteToken=websiteToken&cache=true`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Erro ao buscar arquivos do GoFile: ${res.statusText}`);
  }
  return res.json();
}

export async function GET() {
  if (!GOFILE_FOLDER_ID) {
    return NextResponse.json({ error: 'GOFILE_FOLDER_ID não definido no .env.local.' }, { status: 500 });
  }

  try {
    const data = await fetchGoFileContent();
    const files = Object.values(data.data.contents || {})
      .filter((item: any) => item.type === 'file')
      .map((item: any) => ({
        id: item.id,
        publicId: item.id,
        title: item.name,
        url: item.link,
        type: 'file',
        format: item.mimeType,
        createdAt: item.createTime,
        bytes: item.size,
      }));
    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
