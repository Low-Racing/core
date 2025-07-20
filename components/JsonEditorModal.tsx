"use client";

import { Button } from "@heroui/button";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface UserInfo {
  name: string;
  avatar?: string;
}

interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  userInfo?: UserInfo;
}

const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
  userInfo = { name: 'Usuário' }
}) => {
  const [jsonContent, setJsonContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && fileId) {
      loadJsonContent();
    }
  }, [isOpen, fileId]);

  const loadJsonContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/file/view/${fileId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar o arquivo JSON');
      }
      
      const text = await response.text();
      
      // Tentar fazer parse do JSON para validar e formatar
      try {
        const parsed = JSON.parse(text);
        setJsonContent(JSON.stringify(parsed, null, 2));
      } catch {
        // Se não for JSON válido, mostrar o texto como está
        setJsonContent(text);
      }
    } catch (error) {
      console.error('Erro ao carregar JSON:', error);
      toast.error('Erro ao carregar o arquivo JSON');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validar JSON
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonContent);
      } catch (error) {
        toast.error('JSON inválido. Verifique a sintaxe.');
        return;
      }
      
      // Salvar no Google Drive
      const response = await fetch(`/api/file/update-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          content: parsedJson,
          fileName: fileName.endsWith('.json') ? fileName : `${fileName}.json`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao salvar as alterações');
      }

      toast.success('Arquivo JSON atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar JSON:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar o arquivo JSON');
    } finally {
      setIsSaving(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      toast.success('JSON formatado!');
    } catch (error) {
      toast.error('JSON inválido. Não foi possível formatar.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-70" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {userInfo.avatar ? (
                <img 
                  src={userInfo.avatar} 
                  alt={userInfo.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center border border-gray-600">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                    {userInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Editando JSON</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 truncate max-w-xs" title={fileName}>
                  {fileName}
                </p>
                <span className="text-xs text-gray-500">•</span>
                <p className="text-xs text-gray-400">
                  por {userInfo.name}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 p-6 overflow-auto bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-2 text-gray-300">Carregando arquivo...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">
                  Edite o conteúdo JSON abaixo:
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  onClick={formatJson}
                  className="text-xs bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  Formatar JSON
                </Button>
              </div>
              
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                rows={20}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm text-gray-100 resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-500"
                placeholder="Cole o conteúdo JSON aqui..."
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-gray-800">
          <Button 
            color="danger" 
            variant="light" 
            onClick={onClose}
            disabled={isSaving}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            Cancelar
          </Button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors ${
              isLoading || isSaving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonEditorModal;
