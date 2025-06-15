'use client'

import { UploadedFiles } from '@/types/buyer-map'
import FileDropzone from '../ui/FileDropzone'

interface FileUploadStepProps {
  uploadedFiles: UploadedFiles;
  onFileUpload: (type: 'deck' | 'interviews', files: FileList | null) => void;
  onRemoveFile: (type: 'deck' | 'interviews', index?: number) => void;
  onNext: () => void;
  onBackToHome: () => void;
}

export default function FileUploadStep({ uploadedFiles, onFileUpload, onRemoveFile, onNext, onBackToHome }: FileUploadStepProps) {
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
        />

        {/* Progress Indicator */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upload Progress</h3>
            <span className="text-sm text-gray-600">
              {(uploadedFiles.deck ? 1 : 0) + uploadedFiles.interviews.length} files ready
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Sales Deck</span>
              <span className={`text-sm ${uploadedFiles.deck ? 'text-green-600' : 'text-gray-400'}`}>
                {uploadedFiles.deck ? '✓ Ready' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Interview Transcripts</span>
              <span className={`text-sm ${uploadedFiles.interviews.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {uploadedFiles.interviews.length > 0 ? `✓ ${uploadedFiles.interviews.length} files` : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col items-center gap-4 mt-6">
          <button
            onClick={onNext}
            disabled={!uploadedFiles.deck || uploadedFiles.interviews.length === 0}
            className={`w-full px-8 py-4 rounded-xl text-lg font-semibold transition-all ${
              uploadedFiles.deck && uploadedFiles.interviews.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Analyze & Process Files
          </button>
          <button
            onClick={onBackToHome}
            className="w-full bg-gray-600 text-white px-8 py-3 rounded-lg"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
} 