'use client';

import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { BuyerMapData } from '../../../types/buyermap';
import { checkForDuplicatesAPI, DuplicateCheckResult } from '../../../utils/deduplication';
import DuplicateDetectionDialog from '../../../components/ui/DuplicateDetectionDialog';
import { Loader2, AlertTriangle, CheckCircle, Upload as UploadIcon } from 'lucide-react';

interface InterviewUploadStageProps {
  assumptions: BuyerMapData[];
  onUploaded: () => void;
  onUpload: (files: File[], assumptions: BuyerMapData[], onSuccess: (data: any) => void) => void;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'checking' | 'duplicate' | 'ready' | 'uploading' | 'uploaded' | 'error';
  duplicateCheck?: DuplicateCheckResult;
  error?: string;
}

export default function InterviewUploadStage({
  assumptions,
  onUploaded,
  onUpload
}: InterviewUploadStageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [currentDuplicateCheck, setCurrentDuplicateCheck] = useState<{
    fileIndex: number;
    duplicateCheck: DuplicateCheckResult;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFileStatuses: FileStatus[] = files.map(file => ({
      file,
      status: 'pending'
    }));
    setFileStatuses(newFileStatuses);
    
    // Auto-check for duplicates
    checkAllForDuplicates(newFileStatuses);
  };

  const checkAllForDuplicates = async (fileStatuses: FileStatus[]) => {
    console.log('🔍 Starting duplicate check for', fileStatuses.length, 'interview files');
    console.log('🔍 File details:', fileStatuses.map(fs => ({ name: fs.file.name, size: fs.file.size, type: fs.file.type })));
    
    // Duplicate checking is running (removed alert for cleaner UX)
    
    // Update all statuses to 'checking' 
    setFileStatuses(prev => prev.map(fs => ({ ...fs, status: 'checking' })));
    
    for (let i = 0; i < fileStatuses.length; i++) {
      const fileStatus = fileStatuses[i];
      
      try {
        console.log(`🔍 Checking file ${i + 1}/${fileStatuses.length}: ${fileStatus.file.name}`);
        console.log(`🔍 File details:`, {
          name: fileStatus.file.name,
          size: fileStatus.file.size,
          type: fileStatus.file.type,
          lastModified: fileStatus.file.lastModified
        });
        
        const duplicateCheck = await checkForDuplicatesAPI(fileStatus.file, 'interview', {
          checkSimilarity: true,
          similarityThreshold: 0.90 // Slightly lower threshold for interviews
        });
        
        console.log(`🔍 Duplicate check result for ${fileStatus.file.name}:`, duplicateCheck);
        
        // Update individual file status
        setFileStatuses(prev => prev.map((fs, index) => {
          if (index === i) {
            return {
              ...fs,
              status: duplicateCheck.hasExactDuplicate || duplicateCheck.hasSimilarDuplicate ? 'duplicate' : 'ready',
              duplicateCheck
            };
          }
          return fs;
        }));
        
        // Show duplicate dialog if needed
        if (duplicateCheck.hasExactDuplicate || duplicateCheck.hasSimilarDuplicate) {
          console.log(`🚨 DUPLICATE DETECTED for ${fileStatus.file.name}:`, {
            hasExact: duplicateCheck.hasExactDuplicate,
            hasSimilar: duplicateCheck.hasSimilarDuplicate,
            exactFile: duplicateCheck.exactDuplicate?.filename,
            similarFile: duplicateCheck.similarDuplicate?.filename,
            similarityScore: duplicateCheck.similarityScore
          });
          
          // Duplicate detected - will show dialog component
          
          setCurrentDuplicateCheck({ fileIndex: i, duplicateCheck });
          break; // Handle one duplicate at a time
        } else {
          console.log(`✅ No duplicates found for ${fileStatus.file.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Duplicate check failed for ${fileStatus.file.name}:`, error);
        console.error(`❌ Error details:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
        
        // Error logged to console
        
        setFileStatuses(prev => prev.map((fs, index) => {
          if (index === i) {
            return {
              ...fs,
              status: 'ready', // Continue with upload if duplicate check fails
              error: `Duplicate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
          return fs;
        }));
      }
    }
    
    console.log('✅ Duplicate check completed for all files');
    console.log('📊 Final file statuses:', fileStatuses.map((fs, i) => ({ 
      index: i, 
      name: fs.file.name, 
      status: fileStatuses[i]?.status || 'unknown' 
    })));
    
    // Duplicate check completed
  };

  const handleDuplicateResolution = async (action: 'use-existing' | 'process-anyway' | 'cancel') => {
    if (!currentDuplicateCheck) return;
    
    const { fileIndex } = currentDuplicateCheck;
    
    switch (action) {
      case 'use-existing':
        console.log('🔄 Using existing interview results');
        // Remove the duplicate file from processing
        setFileStatuses(prev => prev.filter((_, index) => index !== fileIndex));
        // TODO: In a future phase, we could fetch and use existing results
        break;
        
      case 'process-anyway':
        console.log('🔄 Processing interview anyway despite duplicates');
        // Mark file as ready for processing
        setFileStatuses(prev => prev.map((fs, index) => {
          if (index === fileIndex) {
            return { ...fs, status: 'ready' };
          }
          return fs;
        }));
        break;
        
      case 'cancel':
        console.log('🔄 User cancelled upload due to duplicates');
        // Remove the duplicate file from processing
        setFileStatuses(prev => prev.filter((_, index) => index !== fileIndex));
        break;
    }
    
    setCurrentDuplicateCheck(null);
    
    // Continue checking remaining files for duplicates
    const remainingFiles = fileStatuses.filter((_, index) => index > fileIndex);
    if (remainingFiles.length > 0 && action !== 'cancel') {
      // Check next file
      const nextFileIndex = fileStatuses.findIndex((fs, index) => 
        index > fileIndex && fs.status === 'checking'
      );
      if (nextFileIndex !== -1) {
        // Continue with next file check
        checkAllForDuplicates(fileStatuses.slice(nextFileIndex));
      }
    }
  };

  const handleUpload = async () => {
    const readyFiles = fileStatuses.filter(fs => fs.status === 'ready');
    if (readyFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadProgress('Uploading files to storage...');
      console.log('🎙️ [BLOB] Starting interview upload process with', readyFiles.length, 'files');
      
      // Step 1: Upload files to Vercel Blob
      const blobUrls: string[] = [];
      
      for (let i = 0; i < readyFiles.length; i++) {
        const fileStatus = readyFiles[i];
        const originalIndex = fileStatuses.findIndex(fs => fs.file === fileStatus.file);
        
        setUploadProgress(`Uploading file ${i + 1} of ${readyFiles.length}: ${fileStatus.file.name}`);
        
        // Update file status to uploading
        setFileStatuses(prev => prev.map((fs, index) => {
          if (index === originalIndex) {
            return { ...fs, status: 'uploading' };
          }
          return fs;
        }));
        
        console.log(`🎙️ [BLOB] Uploading file ${i + 1}:`, fileStatus.file.name);
        const blob = await upload(fileStatus.file.name, fileStatus.file, {
          access: 'public',
          handleUploadUrl: '/api/upload-interview',
        });
        
        console.log(`✅ [BLOB] File ${i + 1} uploaded:`, blob.url);
        blobUrls.push(blob.url);
        
        // Update file status to uploaded
        setFileStatuses(prev => prev.map((fs, index) => {
          if (index === originalIndex) {
            return { ...fs, status: 'uploaded' };
          }
          return fs;
        }));
      }
      
      setUploadProgress('Processing interviews...');
      console.log('🎙️ [BLOB] All files uploaded, starting analysis with blob URLs:', blobUrls);
      
      // Step 2: Send blob URLs to analysis API
      const response = await fetch('/api/analyze-interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrls: blobUrls,
          assumptions: JSON.stringify(assumptions),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ [BLOB] Interview analysis completed:', data);
      
      // Call the success callback with the analysis results
      onUploaded();
      
    } catch (error) {
      console.error('❌ [BLOB] Interview upload/analysis failed:', error);
      setUploadProgress(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
      // Mark failed files as error
      setFileStatuses(prev => prev.map(fs => {
        if (fs.status === 'uploading') {
          return { ...fs, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' };
        }
        return fs;
      }));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(''), 3000); // Clear progress message after 3 seconds
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
    const newFileStatuses: FileStatus[] = files.map(file => ({
      file,
      status: 'pending'
    }));
    setFileStatuses(newFileStatuses);
    
    // Auto-check for duplicates
    checkAllForDuplicates(newFileStatuses);
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'duplicate':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'uploaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: FileStatus['status']) => {
    switch (status) {
      case 'checking':
        return 'Checking for duplicates...';
      case 'duplicate':
        return 'Duplicate found';
      case 'ready':
        return 'Ready to upload';
      case 'uploading':
        return 'Uploading...';
      case 'uploaded':
        return 'Uploaded';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const readyFilesCount = fileStatuses.filter(fs => fs.status === 'ready').length;
  const duplicateFilesCount = fileStatuses.filter(fs => fs.status === 'duplicate').length;

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

      {/* Duplicate Detection Dialog */}
      {currentDuplicateCheck && (
        <DuplicateDetectionDialog
          isOpen={true}
          fileName={fileStatuses[currentDuplicateCheck.fileIndex]?.file.name || ''}
          duplicateType={currentDuplicateCheck.duplicateCheck.hasExactDuplicate ? 'exact' : 'similar'}
          existingFile={currentDuplicateCheck.duplicateCheck.exactDuplicate || currentDuplicateCheck.duplicateCheck.similarDuplicate!}
          similarityScore={currentDuplicateCheck.duplicateCheck.similarityScore}
          onResolve={handleDuplicateResolution}
        />
      )}

      {fileStatuses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Selected Files ({fileStatuses.length})
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              {readyFilesCount > 0 && (
                <span className="text-green-600">
                  {readyFilesCount} ready
                </span>
              )}
              {duplicateFilesCount > 0 && (
                <span className="text-orange-600">
                  {duplicateFilesCount} duplicates
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            {fileStatuses.map((fileStatus, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(fileStatus.status)}
                  <span className="text-sm text-gray-900">{fileStatus.file.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">
                    {getStatusText(fileStatus.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 space-y-3">
            {uploadProgress && (
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {uploadProgress}
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={isUploading || readyFilesCount === 0}
                className={`inline-flex items-center px-6 py-3 font-medium rounded-lg transition-colors ${
                  isUploading || readyFilesCount === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Upload & Validate {readyFilesCount > 0 ? `${readyFilesCount} ` : ''}Files
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 