import FileDropzone from '../ui/FileDropzone';
import { InterviewBatch } from '../../../types/buyer-map';
import { Clock, Users } from 'lucide-react';

interface InterviewUploadPanelProps {
  currentBatch: File[];
  processedBatches: InterviewBatch[];
  interviewsProcessedCount: number;
  onInterviewBatchUpload: (files: FileList) => void;
  onRemoveFromCurrentBatch: (index?: number) => void;
  onRemoveProcessedInterview: (index?: number) => void;
  onProcessBatch: () => void;
  isProcessing: boolean;
}

// Time estimation based on real data
const estimateProcessingTime = (fileCount: number): string => {
  if (fileCount === 0) return '0s';
  
  // ~78 seconds for 3 interviews, scales with batching (max 5 concurrent)
  const baseTimePerBatch = 78; // seconds for 3 interviews
  const maxConcurrent = 5;
  const batches = Math.ceil(fileCount / maxConcurrent);
  const totalSeconds = batches * baseTimePerBatch;
  
  if (totalSeconds < 60) return `~${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (remainingSeconds === 0) return `~${minutes}m`;
  return `~${minutes}m ${remainingSeconds}s`;
};

export default function InterviewUploadPanel({
  currentBatch,
  processedBatches,
  interviewsProcessedCount,
  onInterviewBatchUpload,
  onRemoveFromCurrentBatch,
  onRemoveProcessedInterview,
  onProcessBatch,
  isProcessing
}: InterviewUploadPanelProps) {
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalFiles = currentBatch.length + interviewsProcessedCount;
  const estimatedTime = estimateProcessingTime(currentBatch.length);

  return (
    <div className="w-96 bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <h3 className="text-xl font-bold mb-4">Interview Uploads</h3>
      
      {/* Processing Info */}
      {totalFiles > 5 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 text-blue-700">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">
              Processing up to 5 interviews simultaneously for optimal performance
            </span>
          </div>
        </div>
      )}
      
      {/* Current Batch */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Current Batch</h4>
          {currentBatch.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{estimatedTime}</span>
            </div>
          )}
        </div>
        
        <FileDropzone
          onFileUpload={onInterviewBatchUpload}
          accept=".pdf,.doc,.docx,.txt"
          multiple={true}
          title="Interview Transcripts"
          description="Upload interview transcripts (max 3 per batch)"
          icon={<span className="text-purple-500">🎙️</span>}
          uploadedFiles={currentBatch}
          onRemoveFile={onRemoveFromCurrentBatch}
          maxFiles={3}
          disabled={isProcessing}
        />
        
        {/* Time Estimate for Current Batch */}
        {currentBatch.length > 0 && !isProcessing && (
          <div className="mt-2 p-2 bg-gray-50 rounded border text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Estimated processing time:</span>
              <span className="font-medium">{estimatedTime}</span>
            </div>
            {currentBatch.length > 5 && (
              <div className="mt-1 text-gray-500">
                Will process in batches of 5 for optimal performance
              </div>
            )}
          </div>
        )}
        
        {currentBatch.length > 0 && (
          <button
            onClick={onProcessBatch}
            disabled={isProcessing}
            className={`w-full mt-4 px-4 py-2 rounded-lg ${
              isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isProcessing ? 'Processing...' : `Process Batch (${estimatedTime})`}
          </button>
        )}
      </div>

      {/* Queue Status for Large Batches */}
      {isProcessing && currentBatch.length > 5 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Processing Queue</h4>
          <div className="space-y-2">
            {/* Processing slots visualization */}
            <div className="flex space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="h-4 w-6 rounded border bg-blue-200 border-blue-300 animate-pulse"
                />
              ))}
            </div>
            <div className="text-xs text-blue-600">
              Processing 5 interviews simultaneously, {Math.max(0, currentBatch.length - 5)} queued
            </div>
          </div>
        </div>
      )}

      {/* Processed Batches */}
      {processedBatches.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Processed Interviews ({interviewsProcessedCount})
          </h4>
          <div className="space-y-3">
            {processedBatches.map((batch, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Batch {index + 1}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.files.length} files • {estimateProcessingTime(batch.files.length)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(batch.status)}
                  <button
                    onClick={() => onRemoveProcessedInterview(index)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isProcessing}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 