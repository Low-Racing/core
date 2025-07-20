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

const GoogleDriveFileCard: React.FC<Props> = ({ file }) => {
  const { id, title, url, type, format, createdAt, bytes, icon, description, uploadedBy, userAvatar } = file;

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
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
  const handleRenameTitle = async () => {
    if (!editedTitle || editedTitle === title || isLoading) {
      setIsEditingTitle(false);
      setEditedTitle(title);
      return;
    }
    
    await withLoading(async () => {
      const res = await fetch(`/api/file/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id, newTitle: editedTitle })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('Arquivo renomeado!');
        setIsEditingTitle(false);
        // Ideal: disparar atualização global da listagem
      } else {
        throw new Error(data.error || 'Erro ao renomear');
      }
    });
    
    // Se houver erro, o withLoading já tratou
    if (isLoading) {
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  // Apagar arquivo
  const handleDeleteFile = async () => {
    if (!window.confirm('Tem certeza que deseja apagar este arquivo?')) return;
    
    await withLoading(async () => {
      const res = await fetch(`/api/file/delete?fileId=${id}`, { 
        method: 'DELETE' 
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao apagar o arquivo');
      }
      
      toast.success('Arquivo apagado com sucesso!');
      // Ideal: disparar atualização global da listagem
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
      className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-500/20 dark:hover:ring-blue-500/50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-10">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl flex items-center space-x-2 border border-gray-200 dark:border-gray-700">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Processando...</span>
          </div>
        </div>
      )}
      <CardHeader className="p-0">{renderPreview()}</CardHeader>
      <CardBody className="bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2">
          {isContentLoading ? (
            <div className="w-full">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1 animate-pulse"></div>
            </div>
          ) : isEditingTitle ? (
            <input
              className="text-lg font-semibold truncate border-b border-gray-400 dark:border-gray-600 bg-transparent outline-none flex-1 text-gray-900 dark:text-white"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleRenameTitle}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameTitle(); }}
              autoFocus
              maxLength={100}
              title={editedTitle}
            />
          ) : (
            <h3
              id={`file-${id}-title`}
              className="text-lg font-semibold truncate flex-1 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded text-gray-900 dark:text-white"
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
          {!isContentLoading && !isEditingTitle && (
            <button
              className="ml-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 rounded p-1"
              title="Renomear arquivo"
              aria-label={`Renomear arquivo: ${title}`}
              onClick={() => setIsEditingTitle(true)}
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
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            <p
              id={`file-${id}-description`}
              className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed overflow-hidden"
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
        
        <div className="flex flex-col gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
          {/* Linha do usuário e informações do arquivo */}
          <div className="flex items-center justify-between">
            {isContentLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                {userAvatar ? (
                  <div className="relative">
                    <img 
                      src={userAvatar} 
                      alt={uploadedBy || 'Usuário'} 
                      className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-600" 
                      onError={(e) => {
                        // Fallback para ícone padrão se o avatar não carregar
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png';
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                        {uploadedBy?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                  </div>
                )}
                <span 
                  className="truncate font-medium text-gray-700 dark:text-gray-300" 
                  title={uploadedBy || 'Usuário'}
                >
                  {uploadedBy || 'Usuário'}
                </span>
              </div>
            )}
            
            {isContentLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                {bytes != null && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    {filesize(bytes)}
                  </span>
                )}
                {format && (
                  <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {format.split('/').pop()?.toUpperCase() || format.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Linha da data */}
          {isContentLoading ? (
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
          ) : createdAt ? (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
      <CardFooter className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Primeira linha de botões */}
        {isJsonFile && (
          <Button
            variant="solid"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleEditJson}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Editando...
              </span>
            ) : (
              <span className="flex items-center">
                <Edit className="w-4 h-4 mr-2" />
                Editar JSON
              </span>
            )}
          </Button>
        )}
        
        <Button
          variant="bordered"
          className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleDownload}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar
        </Button>
        
        <Button
          variant="bordered"
          className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleCopy}
          disabled={isLoading}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar link
        </Button>
        
        <Button
          variant="ghost"
          className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={handleDeleteFile}
          disabled={isLoading || isDeleting}
        >
          {isDeleting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Excluindo...
            </span>
          ) : (
            <span>Excluir</span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoogleDriveFileCard;
