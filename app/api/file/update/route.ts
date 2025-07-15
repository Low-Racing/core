import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Interface genérica para metadados de arquivo
interface FileMetadata {
  id: string;
  [key: string]: any; // Permite qualquer outra propriedade
}

// Define o caminho para o arquivo JSON que armazena os metadados
const metadataFilePath = path.join(process.cwd(), 'file-metadata.json');

async function readMetadata(): Promise<FileMetadata[]> {
  try {
    const data = await fs.readFile(metadataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Se o arquivo não existir, retorna um array vazio.
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeMetadata(data: FileMetadata[]): Promise<void> {
  await fs.writeFile(metadataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function PATCH(request: Request) {
  try {
    const { fileId, content } = await request.json();

    if (!fileId || typeof content !== 'object' || content === null || content.id !== fileId) {
      return NextResponse.json({ success: false, error: 'Dados inválidos ou ID inconsistente.' }, { status: 400 });
    }

    const metadata = await readMetadata();
    
    let fileFound = false;
    const updatedMetadata = metadata.map(file => {
      if (file.id === fileId) {
        fileFound = true;
        return content; // Substitui o objeto inteiro
      }
      return file;
    });

    if (!fileFound) {
      updatedMetadata.push(content); // Adiciona o novo objeto se não for encontrado
    }

    await writeMetadata(updatedMetadata);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao atualizar metadados:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
