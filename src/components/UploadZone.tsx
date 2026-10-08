'use client';
import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

type UploadFile = {
  id: string;
  file?: File;
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress?: number;
  error?: string;
  billId?: number;
};

export default function UploadZone({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = async (currentUploads: UploadFile[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const queued = currentUploads.filter(u => u.status === 'queued');
    if (queued.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    const CONCURRENCY = 3;
    let active = 0;
    let index = 0;

    const processNext = async () => {
      if (index >= queued.length) return;
      const file = queued[index++];
      active++;

      setUploads(prev => prev.map(u => u.id === file.id ? { ...u, status: 'processing' } : u));

      let attempt = 0;
      const maxAttempts = 4;
      let success = false;
      let lastError = '';
      let billId = undefined;

      while (attempt < maxAttempts && !success) {
        try {
          const formData = new FormData();
          formData.append('file', file.file!);

          const res = await fetch('/api/extract', {
            method: 'POST',
            body: formData,
          });

          if (res.status === 429 || res.status >= 500) {
            throw new Error(`Server error ${res.status}`);
          }

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to extract');

          success = true;
          billId = data.id;
        } catch (err: any) {
          attempt++;
          lastError = err.message;
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      setUploads(prev => prev.map(u => u.id === file.id ? {
        ...u,
        status: success ? 'done' : 'failed',
        error: success ? undefined : lastError,
        billId
      } : u));

      if (success && onUploadComplete) {
        onUploadComplete();
      }

      active--;
      await processNext();
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(processNext());
    }
    await Promise.all(workers);
    isProcessingRef.current = false;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'queued' as const,
    }));

    setUploads(prev => {
      const updated = [...prev, ...newFiles];
      setTimeout(() => processQueue(updated), 100);
      return updated;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    }
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-gray-100"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-900">
          Click or drag bill images here
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Supports JPG, PNG, WEBP. You can upload multiple files.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-md font-medium text-gray-900">Uploads ({uploads.length})</h3>
          <ul className="space-y-2">
            {uploads.map(file => (
              <li key={file.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {file.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />}
                  {file.status === 'queued' && <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                  {file.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                  {file.status === 'failed' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                  <span className="text-sm font-medium text-gray-700 truncate">{file.file?.name || 'Unknown'}</span>
                </div>
                <div>
                  {file.status === 'failed' && <span className="text-xs text-red-500">{file.error}</span>}
                  {file.status === 'done' && <span className="text-xs text-green-600">Success</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
