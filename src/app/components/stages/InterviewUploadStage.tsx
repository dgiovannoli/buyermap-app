'use client';

import React, { useState } from 'react';
import { BuyerMapData } from '../../../types/buyermap';

interface InterviewUploadStageProps {
  assumptions: BuyerMapData[];
  onUploaded: () => void;
  onUpload: (files: File[], assumptions: BuyerMapData[], onSuccess: (data: any) => void) => void;
}

export default function InterviewUploadStage({
  assumptions,
  onUploaded,
  onUpload
}: InterviewUploadStageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
  };

  const handleUpload = () => {
    if (uploadedFiles.length > 0) {
      onUpload(uploadedFiles, assumptions, (data) => {
        console.log('Upload successful:', data);
        onUploaded();
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(files);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Upload Interview Transcripts
        </h2>
        <p className="text-gray-600">
          Upload your customer interview transcripts to validate the {assumptions.length} assumptions we found.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">📄</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop interview files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports .txt, .docx, .pdf files
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".txt,.docx,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Choose Files
          </label>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Selected Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-900">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpload}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload & Validate Assumptions
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 