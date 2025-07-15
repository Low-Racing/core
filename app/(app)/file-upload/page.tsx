"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);

  const router = useRouter();
  //max file size of mb

  const MAX_FILE_SIZE = 200 * 1024 * 1024;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      //Todo:add notification
      toast.error("File size is too large. Max size is 5MB.", {
        position: "top-right",
        autoClose: 5000, // Close after 5 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);
    const formdata = new FormData();
    formdata.append("file", file);
    formdata.append("title", title);
    formdata.append("description", description);
    formdata.append("originalSize", file.size.toString());

    try {
      const controller = new AbortController();
      setAbortCtrl(controller);
      const response = await axios.post("/api/file-upload", formdata, {
        signal: controller.signal,
        onUploadProgress: (e: any) => {
          if (e.total) {
            const percent = Math.round((e.loaded * 100) / e.total);
            setProgress(percent);
          }
        },
      });
      //check for 200 response
      if (response.status === 200) {
        toast.success("Upload concluído!", {
          position: "top-right",
          autoClose: 3000,
        });
        // Limpa os campos do formulário
        setTitle("");
        setDescription("");
        setFile(null);
        // Limpa o input de arquivo
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        toast.warn("Unexpected response from the server.", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsUploading(false);
      setAbortCtrl(null);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Enviar Arquivo</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">
            <span className="label-text">Título</span>
          </label>
          <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Título"
            required
            className="border-green-800"
          />
        </div>
        <div>
          <label className="label">
            <span className="label-text">Descrição</span>
          </label>
          <Textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="border-green-800"
          />
        </div>
        <div>
          <label className="label">
            <span className="label-text">Arquivo</span>
          </label>
          <Input
            className="border-green-800"
            type="file"
            accept="*"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>
        {isUploading && (
          <div className="space-y-2">
            <Progress value={progress} max={100} className="h-2 bg-green-500" />
            <div className="flex items-center justify-between text-sm">
              <span>{progress}%</span>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => abortCtrl?.abort()}
              >
                Cancelar envio
              </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="bg-green-500 text-white hover:bg-green-600" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Enviar Arquivo"}
          </Button>
      </form>
    </div>
  );
}

export default FileUpload;
