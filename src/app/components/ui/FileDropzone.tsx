'use client'
import { useState, useCallback } from 'react';

interface FileDropzoneProps {
  onFileUpload: (files: FileList) => void;
  accept: string;
  multiple?: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  uploadedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  maxFiles?: number;
}

const FileDropzone = ({ 
  onFileUpload, 
  accept, 
  multiple, 
  title, 
  description, 
  icon,
  uploadedFiles = [],
  onRemoveFile,
  maxFiles = 10
}: FileDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    console.log('🎯 Drop - files received:', files);
    console.log('🎯 Drop - files length:', files.length);
    
    if (files.length > 0) {
      // ✅ Convert FileList to Array immediately to preserve files
      const fileArray = Array.from(files);
      console.log('🎯 Drop - converted to array:', fileArray);
      
      setIsUploading(true);
      // Create a new FileList-like object from the array
      setTimeout(() => {
        console.log('🎯 Drop - calling onFileUpload with preserved files');
        // Convert array back to FileList format
        const dt = new DataTransfer();
        fileArray.forEach(file => dt.items.add(file));
        onFileUpload(dt.files);
        setIsUploading(false);
      }, 500);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('📁 Input files selected:', files);
    console.log('📁 Files length:', files?.length);
    
    if (files && files.length > 0) {
      // ✅ Convert FileList to Array immediately to preserve files
      const fileArray = Array.from(files);
      console.log('📁 Input - converted to array:', fileArray);
      
      setIsUploading(true);
      setTimeout(() => {
        console.log('📁 Input - calling onFileUpload with preserved files');
        // Convert array back to FileList format
        const dt = new DataTransfer();
        fileArray.forEach(file => dt.items.add(file));
        onFileUpload(dt.files);
        setIsUploading(false);
      }, 500);
    } else {
      console.log('❌ No files selected or empty FileList');
    }
    // Reset input
    e.target.value = '';
  }, [onFileUpload]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'ppt':
      case 'pptx': return '📊';
      case 'txt': return '📃';
      default: return '📁';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          isDragging 
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-105 shadow-lg' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isUploading ? 'pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Upload Animation Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-blue-600 font-medium">Processing files...</p>
            </div>
          </div>
        )}

        {/* Icon with Animation */}
        <div className={`text-6xl mb-4 transition-transform duration-300 ${
          isDragging ? 'scale-125' : 'scale-100'
        }`}>
          {icon}
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
        
        <label className="cursor-pointer">
          <input 
            type="file" 
            className="hidden" 
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105">
            <span className="font-semibold">Choose Files</span>
            <span className="text-xl">📁</span>
          </div>
        </label>
        
        <p className="text-sm text-gray-500 mt-4">
          or drag and drop files here
        </p>
        
        {multiple && (
          <p className="text-xs text-gray-400 mt-2">
            Maximum {maxFiles} files • {accept.replace(/\./g, '').toUpperCase()}
          </p>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📋</span>
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="grid gap-3">
            {uploadedFiles.map((file, index) => (
              <div 
                key={index} 
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file.name)}</span>
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Ready
                  </span>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-colors"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropzone; 