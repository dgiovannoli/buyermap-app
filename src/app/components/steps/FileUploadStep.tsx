'use client'

import { UploadedFiles } from '../../../types/buyer-map'
import FileDropzone from '../ui/FileDropzone'
import { InterviewBatch } from '../../../types/buyer-map'
import { FileWithPath } from 'react-dropzone'

interface FileUploadStepProps {
  uploadedFiles: {
    deck: File | null;
    interviews: File[];
  };
  currentBatch: File[];
  onDeckUpload: (file: File) => void;
  onInterviewBatchUpload: (files: FileList) => void;
  onRemoveDeck: () => void;
  onRemoveFromCurrentBatch: (index?: number) => void;
  onRemoveProcessedInterview: (index: number) => void;
  onNext: () => void;
  onBackToHome: () => void;
  isProcessing: boolean;
  processingStep: string;
  uploadType: 'deck' | 'interviews';
  processedBatches?: InterviewBatch[];
  interviewsProcessedCount?: number;
}

export default function FileUploadStep({
  uploadedFiles,
  currentBatch,
  onDeckUpload,
  onInterviewBatchUpload,
  onRemoveDeck,
  onRemoveFromCurrentBatch,
  onRemoveProcessedInterview,
  onNext,
  onBackToHome,
  isProcessing,
  processingStep,
  uploadType,
  processedBatches,
  interviewsProcessedCount
}: FileUploadStepProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">
          {uploadType === 'deck' ? 'Upload Sales Deck' : 'Upload Interview Files'}
        </h2>

        {uploadType === 'deck' ? (
          <div className="space-y-4">
            <FileDropzone
              onFileUpload={(files) => files[0] && onDeckUpload(files[0])}
              accept=".pdf,.pptx,.docx"
              multiple={false}
              title="Sales Deck & Pitch Materials"
              description="Upload your current sales presentation, pitch deck, or marketing materials"
              icon={<span className="text-blue-500">📊</span>}
              uploadedFiles={uploadedFiles.deck ? [uploadedFiles.deck] : []}
              onRemoveFile={() => onRemoveDeck()}
              maxFiles={1}
              disabled={isProcessing}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <FileDropzone
                onFileUpload={onInterviewBatchUpload}
                accept=".pdf,.docx"
                multiple={true}
                title="Customer Interview Transcripts"
                description="Upload your customer interview transcripts, notes, or recordings (up to 3 files per batch)"
                icon={<span className="text-green-500">🎤</span>}
                uploadedFiles={currentBatch}
                onRemoveFile={onRemoveFromCurrentBatch}
                maxFiles={3}
                disabled={isProcessing}
              />
            </div>

            {processedBatches && processedBatches.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Processed Batches:</h3>
                {processedBatches.map((batch, batchIndex) => (
                  <div key={batchIndex} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Batch {batchIndex + 1}</span>
                      <span className={`text-sm ${
                        batch.status === 'completed' ? 'text-green-600' :
                        batch.status === 'failed' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {batch.status}
                      </span>
                    </div>
                    {batch.files.map((file: File, fileIndex: number) => (
                      <div key={fileIndex} className="flex items-center justify-between text-sm text-gray-600">
                        <span>{file.name}</span>
                        {batch.status === 'completed' && (
                          <button
                            onClick={() => onRemoveProcessedInterview(fileIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {interviewsProcessedCount !== undefined && (
              <div className="text-sm text-gray-600">
                Total interviews processed: {interviewsProcessedCount}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={onBackToHome}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={
              isProcessing ||
              (uploadType === 'deck' && !uploadedFiles.deck) ||
              (uploadType === 'interviews' && currentBatch.length === 0)
            }
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? processingStep || 'Processing...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
} 