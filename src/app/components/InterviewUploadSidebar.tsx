import { useState } from 'react';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import FileDropzone from './FileDropzone';

export interface InterviewUploadSidebarProps {
  currentBatch: File[];
  processedBatches: { files: File[]; status: 'completed' | 'failed' | 'processing'; error?: string }[];
  onInterviewBatchUpload: (files: FileList) => void;
  onRemoveFromCurrentBatch: (index?: number) => void;
  onProcessBatch: () => void;
  isProcessing: boolean;
}

export default function InterviewUploadSidebar({
  currentBatch,
  processedBatches,
  onInterviewBatchUpload,
  onRemoveFromCurrentBatch,
  onProcessBatch,
  isProcessing
}: InterviewUploadSidebarProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Upload</h3>
      
      {/* Current Batch */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Batch</h4>
        <FileDropzone
          onFileUpload={onInterviewBatchUpload}
          accept=".doc,.docx,.pdf,.txt"
          maxFiles={3}
          currentFiles={currentBatch}
          onRemoveFile={onRemoveFromCurrentBatch}
          disabled={isProcessing}
        />
        
        {currentBatch.length > 0 && (
          <button
            onClick={onProcessBatch}
            disabled={isProcessing}
            className={`mt-4 w-full px-4 py-2 rounded-md text-sm font-medium text-white
              ${isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isProcessing ? 'Processing...' : 'Process Batch'}
          </button>
        )}
      </div>

      {/* Batch History */}
      {processedBatches.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Batch History</h4>
          <div className="space-y-2">
            {processedBatches.map((batch, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {batch.files.map(f => f.name).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.files.length} file{batch.files.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${batch.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : batch.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {batch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 