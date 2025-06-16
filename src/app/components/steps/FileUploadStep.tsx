'use client'

import { UploadedFiles } from '@/types/buyer-map'
import FileDropzone from '../ui/FileDropzone'

interface FileUploadStepProps {
  uploadedFiles: {
    deck: File | null;
    interviews: File[];
  };
  onFileUpload: (type: string, files: FileList | null) => void;
  onRemoveFile: (type: string, index?: number) => void;
  onNext: () => void;
  onBackToHome: () => void;
  isProcessing: boolean;
  processingStep: 'deck' | 'interviews' | null;
}

export default function FileUploadStep({ 
  uploadedFiles, 
  onFileUpload, 
  onRemoveFile, 
  onNext, 
  onBackToHome,
  isProcessing,
  processingStep
}: FileUploadStepProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 space-y-8">
        <h1 className="text-3xl font-bold text-center mb-2">Upload Your Materials</h1>
        <p className="text-center text-gray-600 mb-6">We&apos;ll analyze your sales deck and validate your assumptions against real customer interview data.</p>

        {/* Sales Deck Upload */}
        <FileDropzone
          onFileUpload={files => onFileUpload('deck', files)}
          accept=".pdf,.ppt,.pptx"
          multiple={false}
          title="Sales Deck & Pitch Materials"
          description="Upload your current sales presentation, pitch deck, or marketing materials"
          icon={<span className="text-blue-500">📊</span>}
          uploadedFiles={uploadedFiles.deck ? [uploadedFiles.deck] : []}
          onRemoveFile={() => onRemoveFile('deck')}
          maxFiles={1}
          disabled={isProcessing}
        />

        {/* Interview Transcripts Upload */}
        <FileDropzone
          onFileUpload={files => onFileUpload('interviews', files)}
          accept=".txt,.doc,.docx,.pdf"
          multiple={true}
          title="Customer Interview Transcripts"
          description="Upload your customer interview transcripts, notes, or recordings (up to 10 files)"
          icon={<span className="text-green-500">🎤</span>}
          uploadedFiles={uploadedFiles.interviews}
          onRemoveFile={index => onRemoveFile('interviews', index)}
          maxFiles={10}
          disabled={isProcessing}
        />

        {/* Progress Indicator */}
        {isProcessing && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 font-medium">
                {processingStep === 'deck' ? 'Analyzing Sales Deck...' : 'Processing Interviews...'}
              </span>
              <span className="text-blue-500">⏳</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={onBackToHome}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isProcessing}
          >
            Back to Home
          </button>
          <button
            onClick={onNext}
            disabled={!uploadedFiles.deck || isProcessing}
            className={`px-6 py-2 rounded-lg transition-colors ${
              !uploadedFiles.deck || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Analyze Materials'}
          </button>
        </div>
      </div>
    </div>
  );
} 