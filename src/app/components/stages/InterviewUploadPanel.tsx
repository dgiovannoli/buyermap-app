import FileDropzone from '../ui/FileDropzone';
import { InterviewBatch } from '../../../types/buyer-map';

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

  return (
    <div className="w-96 bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <h3 className="text-xl font-bold mb-4">Interview Uploads</h3>
      
      {/* Current Batch */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Batch</h4>
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
            {isProcessing ? 'Processing...' : 'Process Batch'}
          </button>
        )}
      </div>

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
                      {batch.files.length} files
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