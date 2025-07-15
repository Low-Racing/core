import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Copy, Download } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { toast } from 'react-toastify';

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
}

interface Props {
  file: GoogleDriveFile;
}

const GoogleDriveFileCard: React.FC<Props> = ({ file }) => {
  const { id, title, url, type, format, createdAt, bytes, icon, description } = file;

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

  const renderPreview = () => {
    const proxyUrl = `/api/file/view/${id}`;

    if (type.startsWith("image")) {
      return <img src={proxyUrl} alt={title} className="w-full h-40 object-cover rounded-t-lg bg-gray-200" />;
    }
    if (type.startsWith("video")) {
      return <video src={proxyUrl} controls className="w-full h-40 object-cover rounded-t-lg bg-gray-200" />;
    }
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-t-lg">
        {icon ? (
          <img src={icon} alt="icon" className="w-20 h-20 object-contain" />
        ) : (
          <span className="text-gray-400">Sem pré-visualização</span>
        )}
      </div>
    );
  };

  return (
    <Card shadow="sm" className="overflow-hidden">
      <CardHeader className="p-0">{renderPreview()}</CardHeader>
      <CardBody>
        <h3 className="text-lg font-semibold mb-2 truncate" title={title}>{title}</h3>
        <p className="text-sm text-gray-500 mb-2 truncate h-5" title={description || ''}>{description || 'Sem descrição'}</p>
        <div className="flex flex-col gap-1 text-xs text-gray-600 mt-2">
          <div className="flex items-center justify-between">
            {bytes != null && <span>{filesize(bytes)}</span>}
            {format && <span>{format.toUpperCase()}</span>}
          </div>
          {createdAt && (
            <div className="flex justify-end">
              <span>{dayjs(createdAt).format("DD/MM/YYYY")}</span>
            </div>
          )}
        </div>
      </CardBody>
      <CardFooter className="flex gap-2">
        <Button className="flex-1" onClick={handleCopy}><Copy className="w-4 h-4 mr-1" /> Copiar URL</Button>
        <Button className="flex-1" onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Baixar</Button>
      </CardFooter>
    </Card>
  );
};

export default GoogleDriveFileCard;
