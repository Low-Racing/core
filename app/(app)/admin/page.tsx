"use client";
import GoogleDriveFileCard, { GoogleDriveFile } from "@/components/GoogleDriveFileCard";

import axios from "axios";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type CloudFile = GoogleDriveFile;

function Admin() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca todos os arquivos do Google Drive
  const fetchFiles = useCallback(async () => {
    try {
      console.log("🔄 Fetching files from Google Drive API...");
      const token = (session as any)?.accessToken || localStorage.getItem("GOOGLE_DRIVE_ACCESS_TOKEN");
      const response = await axios.get("/api/listing/googledrive", {
        headers: token ? { "x-access-token": token } : undefined,
      });
      const filesData = response.data.files;
      if (Array.isArray(filesData)) {
        setFiles(filesData);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err) {
      console.error("❌ Error fetching files:", err);
      setError("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Store access token to localStorage whenever session changes
  useEffect(() => {
    if (session && (session as any).accessToken) {
      localStorage.setItem("GOOGLE_DRIVE_ACCESS_TOKEN", (session as any).accessToken as string);
    }
  }, [session]);

  useEffect(() => {
    // Recarrega sempre que o token da sessão mudar
    if (session !== undefined) {
      fetchFiles();
    }
  }, [fetchFiles, session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Arquivos na Nuvem</h1>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      {files.length === 0 && !loading ? (
        <div className="text-center text-lg text-gray-500 mt-8">
          <div className="hero min-h-[200px]">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold">Nenhum arquivo encontrado</h2>
                <p className="py-6">Não há arquivos em nuvem no momento.</p>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Carregando...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <GoogleDriveFileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Admin;
