import { NextResponse } from 'next/server';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Função para buscar assets da Cloudinary
async function fetchCloudinaryAssets({ nextCursor }: { nextCursor?: string } = {}) {
  const url =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/all` +
    (nextCursor ? `?next_cursor=${nextCursor}` : '');

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Erro ao buscar arquivos da Cloudinary: ${res.statusText}`);
  }

  return res.json();
}

export async function GET() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('[Cloudinary] Variáveis de ambiente ausentes:', { CLOUD_NAME, API_KEY, API_SECRET });
    return NextResponse.json({ error: 'Cloudinary env vars missing. Adicione NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env.local.' }, { status: 500 });
  }

  try {
    let allResources: any[] = [];
    let nextCursor: string | undefined = undefined;
    let count = 0;
    do {
      const data = await fetchCloudinaryAssets({ nextCursor });
      allResources = allResources.concat(data.resources);
      nextCursor = data.next_cursor;
      count++;
      // Evita loop infinito
      if (count > 10) break;
    } while (nextCursor);

    // Normaliza os dados para o frontend
    const files = allResources.map((item) => ({
      id: item.asset_id || item.public_id,
      publicId: item.public_id,
      title: item.filename || item.public_id,
      url: item.secure_url,
      type: item.resource_type === 'image' ? 'image' : item.resource_type === 'video' ? 'video' : 'file',
      format: item.format,
      createdAt: item.created_at,
      bytes: item.bytes,
      width: item.width,
      height: item.height,
      duration: item.duration,
      folder: item.folder,
      // Adicione outros campos relevantes conforme necessário
    }));

    return NextResponse.json(files, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro desconhecido.' }, { status: 500 });
  }
}
