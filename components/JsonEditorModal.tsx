"use client";

import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Textarea } from "@heroui/input";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "py-6",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Editando JSON</h2>
          <p className="text-sm text-gray-500">{fileName}</p>
        </ModalHeader>
        
        <ModalBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Carregando arquivo...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Edite o conteúdo JSON abaixo:
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={formatJson}
                  className="text-xs"
                >
                  Formatar JSON
                </Button>
              </div>
              
              <Textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                minRows={20}
                maxRows={30}
                className="w-full font-mono text-sm"
                placeholder="Cole o conteúdo JSON aqui..."
                classNames={{
                  input: "font-mono text-sm",
                }}
              />
            </div>
          )}
        </ModalBody>
        
        <ModalFooter>
          <Button 
            color="danger" 
            variant="light" 
            onPress={onClose}
            isDisabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            color="primary" 
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={isLoading || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JsonEditorModal;
