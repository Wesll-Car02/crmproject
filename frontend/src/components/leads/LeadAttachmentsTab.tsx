import { useState } from 'react';
import { Paperclip, Upload, FileText, Image, FileArchive, File, Download, Trash2, X } from 'lucide-react';

interface LeadAttachmentsTabProps {
  leadId: string;
}

const FILE_ICONS: Record<string, JSX.Element> = {
  pdf:  <FileText size={20} className="text-rose-400" />,
  doc:  <FileText size={20} className="text-blue-400" />,
  docx: <FileText size={20} className="text-blue-400" />,
  xls:  <FileText size={20} className="text-emerald-400" />,
  xlsx: <FileText size={20} className="text-emerald-400" />,
  jpg:  <Image size={20} className="text-amber-400" />,
  jpeg: <Image size={20} className="text-amber-400" />,
  png:  <Image size={20} className="text-amber-400" />,
  zip:  <FileArchive size={20} className="text-purple-400" />,
  rar:  <FileArchive size={20} className="text-purple-400" />,
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || <File size={20} className="text-dark-400" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LeadAttachmentsTab({ leadId }: LeadAttachmentsTabProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-dark-100">Anexos</h3>
        <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Upload size={15} /> Enviar Arquivo
          <input type="file" className="sr-only" multiple disabled title="Em breve disponível" />
        </label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-dark-700 hover:border-dark-600 bg-dark-800/20'
        }`}
      >
        <Paperclip size={32} className="mx-auto mb-3 text-dark-500 opacity-50" />
        <p className="text-dark-300 font-medium text-sm">Arraste arquivos aqui ou clique em "Enviar Arquivo"</p>
        <p className="text-xs text-dark-500 mt-1">
          Suporte a PDF, Word, Excel, imagens, ZIP e outros formatos
        </p>
        <div className="mt-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 inline-block">
          <p className="text-xs text-amber-400">
            Upload de arquivos em desenvolvimento — disponível em breve
          </p>
        </div>
      </div>
    </div>
  );
}
