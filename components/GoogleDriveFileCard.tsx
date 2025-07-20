import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Copy, Download, Edit } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-toastify";
import JsonEditorModal from "./JsonEditorModal";

dayjs.extend(relativeTime);

export interface GoogleDriveFile {
  id: string;
  title: string;
  url: string;
  type: string;
  mimeType?: string;
  description?: string;
  format?: string;
  createdAt?: string;
  bytes?: number;
  icon?: string;
  thumbnail?: string;
  webContentLink?: string;
  uploadedBy?: string; // Nome do usuário que fez o upload
  userAvatar?: string; // URL do avatar do usuário
}

interface Props {
  file: GoogleDriveFile;
}

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  fileName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  fileName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Confirmar Exclusão</h3>
          <p className="text-gray-500 mb-6">
            Tem certeza que deseja excluir o arquivo <span className="font-medium">{fileName}</span>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sim, excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleDriveFileCard: React.FC<Props> = ({ file }) => {
  const { 
    id, 
    title, 
    type, 
    format = '', 
    icon, 
    thumbnail, 
    webContentLink, 
    mimeType = type, 
    description = '',
    bytes,
    createdAt,
    uploadedBy = 'Usuário',
    userAvatar
  } = file;

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(true);

  // Atualiza o título localmente após rename
  React.useEffect(() => {
    setEditedTitle(title);
    // Simula carregamento do conteúdo
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [title]);

  const handleDownload = () => {
    try {
      if (!webContentLink) {
        throw new Error('Link de download não disponível');
      }
      window.open(webContentLink, "_blank");
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      toast.error('Não foi possível baixar o arquivo');
    }
  };

  const handleCopy = async () => {
    try {
      if (!webContentLink) {
        throw new Error('Link não disponível');
      }
      await navigator.clipboard.writeText(webContentLink);
      toast.info("URL copiada!");
    } catch (err) {
      console.error("Falha ao copiar: ", err);
      toast.error("Falha ao copiar a URL.");
    }
  };

  // Verifica se é um arquivo JSON
  const isJsonFile = (type && type.includes('json')) || 
                     (format && format.includes('json')) || 
                     (title && typeof title === 'string' && title.toLowerCase().endsWith('.json')) ||
                     (mimeType && mimeType.includes('json'));

  const handleEditJson = () => {
    setIsJsonModalOpen(true);
  };

  // Função para exibir loading durante operações assíncronas
  const withLoading = async (asyncFunction: () => Promise<void>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await asyncFunction();
    } catch (error) {
      console.error('Erro na operação:', error);
      toast.error('Ocorreu um erro ao processar a operação');
    } finally {
      setIsLoading(false);
    }
  };

  // Apagar arquivo

  // Renomear arquivo
  const handleRenameTitle = async (e?: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    // Se for um evento de teclado e não for Enter ou Escape, não faz nada
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== 'Escape') {
      return;
    }

    // Se pressionou Escape, cancela a edição
    if (e && 'key' in e && e.key === 'Escape') {
      setEditedTitle(title || '');
      setIsEditingTitle(false);
      return;
    }

    // Garante que editedTitle é uma string e remove espaços em branco
    const newTitle = typeof editedTitle === 'string' ? editedTitle.trim() : '';
    const currentTitle = title || '';
    
    // Se o título estiver vazio ou não mudou, cancela a edição
    if (!newTitle || newTitle === currentTitle || isLoading) {
      setEditedTitle(currentTitle);
      setIsEditingTitle(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Faz a requisição para renomear o arquivo
      const response = await fetch(`/api/file/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: id, 
          newTitle: newTitle 
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao renomear o arquivo');
      }
      
      // Atualiza o título localmente
      file.title = newTitle;
      
      // Dispara evento para atualizar a lista de arquivos
      window.dispatchEvent(new CustomEvent('fileRenamed', { 
        detail: { fileId: id, newTitle: newTitle } 
      }));
      
      toast.success('Arquivo renomeado com sucesso!');
    } catch (error) {
      console.error('Erro ao renomear arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao renomear o arquivo');
      setEditedTitle(currentTitle); // Volta para o título original em caso de erro
    } finally {
      setIsLoading(false);
      setIsEditingTitle(false);
    }
  };

  // Apagar arquivo
  const handleDeleteFile = async () => {
    if (!id) {
      toast.error('ID do arquivo não encontrado');
      return;
    }
    
    setIsDeleteModalOpen(false);
    
    await withLoading(async () => {
      try {
        setIsDeleting(true);
        const res = await fetch(`/api/file/delete?fileId=${id}`, { 
          method: 'DELETE' 
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao apagar o arquivo');
        }
        
        toast.success('Arquivo apagado com sucesso!');
        // Disparar atualização da lista de arquivos
        window.dispatchEvent(new CustomEvent('fileDeleted', { detail: { fileId: id } }));
      } catch (error) {
        console.error('Erro ao apagar arquivo:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao apagar o arquivo');
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const renderPreview = () => {
    // Usar webContentLink para visualização direta quando disponível
    const previewUrl = webContentLink || `/api/file/view/${id}`;

    // Componente de placeholder de carregamento
    const renderLoader = () => (
      <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-t-lg">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );

    try {
      // Para imagens
      if (type && type.startsWith("image")) {
        return (
          <div className="relative w-full h-40">
            {isPreviewLoading && renderLoader()}
            <img
              src={previewUrl}
              alt={title || 'Imagem'}
              className={`w-full h-full object-cover rounded-t-lg bg-gray-200 transition-opacity duration-300 ${
                isPreviewLoading ? 'opacity-0 absolute' : 'opacity-100'
              }`}
              onLoad={() => setIsPreviewLoading(false)}
              onError={(e) => {
                console.error('Erro ao carregar imagem:', e);
                setIsPreviewLoading(false);
              }}
            />
          </div>
        );
      }
      
      // Para vídeos
      if (type && type.startsWith("video")) {
        return (
          <div className="relative w-full h-40">
            {isPreviewLoading && renderLoader()}
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-cover rounded-t-lg bg-gray-200"
              onLoadedData={() => setIsPreviewLoading(false)}
              onError={(e) => {
                console.error('Erro ao carregar vídeo:', e);
                setIsPreviewLoading(false);
              }}
            >
              Seu navegador não suporta a reprodução de vídeos.
            </video>
          </div>
        );
      }
      
      // Para arquivos JSON
      if (isJsonFile) {
        return (
          <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-t-lg">
            <div className="text-center p-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 text-2xl font-bold">{'{}'}</span>
              </div>
              <p className="text-sm text-gray-500">Arquivo JSON</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Editar" para visualizar</p>
            </div>
          </div>
        );
      }
      
      // Para outros tipos de arquivo
      return (
        <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-t-lg">
          {icon ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {isPreviewLoading && renderLoader()}
              <img 
                src={icon} 
                alt="Ícone do arquivo" 
                className={`w-16 h-16 object-contain transition-opacity duration-300 ${
                  isPreviewLoading ? 'opacity-0 absolute' : 'opacity-100'
                }`}
                onLoad={() => setIsPreviewLoading(false)}
                onError={(e) => {
                  console.error('Erro ao carregar ícone:', e);
                  setIsPreviewLoading(false);
                }}
              />
              <p className="text-sm text-gray-500 mt-2">{format ? format.toUpperCase() : 'ARQUIVO'}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                <span className="text-gray-400 text-2xl">?</span>
              </div>
              <span className="text-gray-400 text-sm">Sem pré-visualização</span>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Erro ao renderizar pré-visualização:', error);
      return (
        <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-t-lg">
          <div className="text-center p-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <p className="text-sm text-gray-700">Erro ao carregar pré-visualização</p>
          </div>
        </div>
      );
    }
  };

  // Renderização do cartão de arquivo
  return (
    <Card className="w-full max-w-sm overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Preview do arquivo */}
      {renderPreview()}
      
      <CardBody className="p-4 space-y-2">
        {/* Título editável */}
        <div className="min-h-[40px] flex items-center">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleRenameTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameTitle(e)}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h3 
              className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditingTitle(true)}
              title={title}
            >
              {title}
            </h3>
          )}
        </div>
        
        {/* Metadados */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Upload em {createdAt ? dayjs(createdAt).format("DD/MM/YYYY") : 'Data desconhecida'}</span>
          </div>
          {createdAt && (
            <span className="text-gray-400">{dayjs(createdAt).fromNow()}</span>
          )}
        </div>
        
        {bytes && (
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {filesize(bytes)}
          </div>
        )}
      </CardBody>
      
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        {/* Botão de Editar (apenas para JSON) */}
        {isJsonFile && (
          <Button
            variant="solid"
            className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleEditJson}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </span>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-1" /> Editar
              </>
            )}
          </Button>
        )}
        
        {/* Botão de Copiar URL */}
        <Button
          variant="solid"
          className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCopy}
          disabled={isLoading}
        >
          <Copy className="w-4 h-4 mr-1" /> URL
        </Button>
        
        {/* Segunda linha de botões */}
        <Button
          variant="solid"
          className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDownload}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-1" /> Baixar
        </Button>
        <Button
          variant="solid"
          className="w-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={isDeleting || isLoading}
        >
          {isDeleting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Apagando...
            </span>
          ) : 'Apagar'}
        </Button>
      </CardFooter>
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteFile}
        fileName={title}
      />
      
      <JsonEditorModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        fileId={id}
        fileName={title}
      />
    </Card>
  );
};

export default GoogleDriveFileCard;
