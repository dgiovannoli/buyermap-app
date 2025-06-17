import { useState, useCallback } from 'react';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FileDropzoneProps {
  onFileUpload: (files: FileList) => void;
  accept?: string;
  maxFiles?: number;
  currentFiles?: File[];
  onRemoveFile?: (index?: number) => void;
  disabled?: boolean;
}

export default function FileDropzone({
  onFileUpload,
  accept = '*',
  maxFiles = 3,
  currentFiles = [],
  onRemoveFile,
  disabled = false
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    onFileUpload(files);
  }, [disabled, maxFiles, onFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = e.target.files;
    if (files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    onFileUpload(files);
  }, [disabled, maxFiles, onFileUpload]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />
      
      <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {disabled
          ? 'Processing files...'
          : `Drag and drop files here, or click to select files (max ${maxFiles})`
        }
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {accept !== '*' && `Accepted formats: ${accept}`}
      </p>

      {currentFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {currentFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center space-x-2">
                <DocumentIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              {onRemoveFile && !disabled && (
                <button
                  onClick={() => onRemoveFile(index)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 