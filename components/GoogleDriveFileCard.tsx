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
  const { id, title, url, type, format, createdAt, bytes, icon, description, uploadedBy, userAvatar } = file;

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

  const handleDownload = () => window.open(url, "_blank");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.info("URL copiada!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Falha ao copiar a URL.");
    }
  };

  // Verifica se é um arquivo JSON
  const isJsonFile = type === 'application/json' || 
                     format === 'application/json' || 
                     title.toLowerCase().endsWith('.json');

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

  // Renomear arquivo
  const handleRenameTitle = async (e?: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== 'Escape') {
      return;
    }

    if (e && 'key' in e && e.key === 'Escape') {
      setEditedTitle(title);
      setIsEditingTitle(false);
      return;
    }

    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle || trimmedTitle === title || isLoading) {
      setEditedTitle(title);
      setIsEditingTitle(false);
      return;
    }
    
    await withLoading(async () => {
      try {
        const res = await fetch(`/api/file/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: id, newTitle: trimmedTitle })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao renomear o arquivo');
        }
        
        // Atualiza o título localmente
        file.title = trimmedTitle;
        toast.success('Arquivo renomeado com sucesso!');
      } catch (error) {
        console.error('Erro ao renomear arquivo:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao renomear o arquivo');
        setEditedTitle(title);
      } finally {
        setIsEditingTitle(false);
      }
    });
  };

  // Apagar arquivo
  const handleDeleteFile = async () => {
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
    const proxyUrl = `/api/file/view/${id}`;

    // Componente de placeholder de carregamento
    const renderLoader = () => (
      <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-t-lg">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );

    if (type.startsWith("image")) {
      return (
        <div className="relative w-full h-40">
          {isPreviewLoading && renderLoader()}
          <img
            src={proxyUrl}
            alt={title}
            className={`w-full h-full object-cover rounded-t-lg bg-gray-200 transition-opacity duration-300 ${
              isPreviewLoading ? 'opacity-0 absolute' : 'opacity-100'
            }`}
            onLoad={() => setIsPreviewLoading(false)}
            onError={() => setIsPreviewLoading(false)}
          />
        </div>
      );
    }
    
    if (type.startsWith("video")) {
      return (
        <div className="relative w-full h-40">
          {isPreviewLoading && renderLoader()}
          <video
            src={proxyUrl}
            controls
            className={`w-full h-full object-cover rounded-t-lg bg-gray-200 transition-opacity duration-300 ${
              isPreviewLoading ? 'opacity-0 absolute' : 'opacity-100'
            }`}
            onLoadedData={() => setIsPreviewLoading(false)}
            onError={() => setIsPreviewLoading(false)}
          />
        </div>
      );
    }
    
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-t-lg">
        {icon ? (
          <div className="relative w-full h-full">
            {isPreviewLoading && renderLoader()}
            <img 
              src={icon} 
              alt="Ícone do arquivo" 
              className={`w-20 h-20 object-contain transition-opacity duration-300 ${
                isPreviewLoading ? 'opacity-0 absolute' : 'opacity-100'
              }`}
              onLoad={() => setIsPreviewLoading(false)}
              onError={() => setIsPreviewLoading(false)}
            />
          </div>
        ) : (
          <span className="text-gray-400">Sem pré-visualização</span>
        )}
      </div>
    );
  };

  return (
    <Card 
      role="article"
      aria-labelledby={`file-${id}-title`}
      aria-describedby={`file-${id}-description`}
      className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100"
    >
      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-700">Processando...</span>
          </div>
        </div>
      )}
      <CardHeader className="p-0">{renderPreview()}</CardHeader>
      <CardBody>
        <div className="flex items-center gap-2 mb-2">
          {isContentLoading ? (
            <div className="w-full">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
            </div>
          ) : isEditingTitle ? (
            <input
              className="text-lg font-semibold truncate border-b border-gray-400 bg-transparent outline-none flex-1 w-full"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleRenameTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameTitle(e);
                if (e.key === 'Escape') {
                  setEditedTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              maxLength={100}
              title={editedTitle}
            />
          ) : (
            <h3
              id={`file-${id}-title`}
              className="text-lg font-semibold truncate flex-1 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded"
              title={title}
              onClick={() => setIsEditingTitle(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsEditingTitle(true);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Renomear arquivo: ${title}. Pressione Enter ou Espaço para editar.`}
            >
              {title}
            </h3>
          )}
          {!isContentLoading && (
            <button
              className="ml-1 text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
              title="Renomear arquivo"
              aria-label={`Renomear arquivo: ${title}`}
              onClick={() => setIsEditingTitle(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsEditingTitle(true);
                }
              }}
              style={{ display: isEditingTitle ? 'none' : 'block' }}
              type="button"
            >
              <span className="sr-only">Renomear arquivo</span>
              <Edit className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mb-2 min-h-[2.5rem] flex items-start">
          {isContentLoading ? (
            <div className="w-full space-y-1">
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            <p
              id={`file-${id}-description`}
              className="text-sm text-gray-500 leading-relaxed overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                wordBreak: 'break-word'
              }}
              title={description || "Sem descrição"}
              aria-label={`Descrição: ${description || 'Sem descrição'}`}
            >
              {description || "Sem descrição"}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 text-xs text-gray-600 mt-2">
          {/* Linha do usuário e informações do arquivo */}
          <div className="flex items-center justify-between">
            {isContentLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                {userAvatar ? (
                  <div className="relative">
                    <img 
                      src={userAvatar} 
                      alt={uploadedBy} 
                      className="w-5 h-5 rounded-full object-cover border border-gray-200" 
                      onError={(e) => {
                        // Fallback para ícone padrão se o avatar não carregar
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png';
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-gray-200">
                      <span className="text-xs font-medium text-blue-600">
                        {uploadedBy?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
                  </div>
                )}
                <span className="truncate font-medium text-gray-700" title={uploadedBy}>
                  {uploadedBy || 'Usuário'}
                </span>
              </div>
            )}
            {isContentLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                {bytes != null && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {filesize(bytes)}
                  </span>
                )}
                {format && (
                  <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {format.split('/').pop()?.toUpperCase() || format.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Linha da data */}
          {isContentLoading ? (
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ) : createdAt ? (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Upload em {dayjs(createdAt).format("DD/MM/YYYY")}</span>
              </div>
              <span className="text-gray-400">{dayjs(createdAt).fromNow()}</span>
            </div>
          ) : null}
        </div>
      </CardBody>
      <CardFooter className="grid grid-cols-2 gap-2">
        {/* Primeira linha de botões */}
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
