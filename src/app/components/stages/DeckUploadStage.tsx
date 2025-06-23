import React, { useState, useEffect } from 'react';
import { ProcessingProgress } from '../../../types/buyer-map';
import { ICPValidationResponse } from '../../../types/buyermap';
import FileDropzone from '../ui/FileDropzone';
import ProcessVisualization from '../loading/ProcessVisualization';
import { useProcessingProgress } from '../../hooks/useProcessingProgress';
import { useFileConflictHandler } from '../../../hooks/useFileConflictHandler';
import FileConflictDialog from '../../../components/ui/FileConflictDialog';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  X, 
  Cloud, 
  Presentation,
  FileCheck,
  ArrowRight,
  Sparkles,
  Target,
  BarChart3,
  Mic
} from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface DeckUploadStageProps {
  onDeckProcessed: (data: ICPValidationResponse) => void;
  onError: (error: string | null) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
}

export default function DeckUploadStage({ onDeckProcessed, onError, onProgressUpdate }: DeckUploadStageProps) {
  console.log('🔄 DeckUploadStage component rendered');
  const [uploadedDeck, setUploadedDeck] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const processingProgress = useProcessingProgress();
  const fileConflictHandler = useFileConflictHandler();
  const [useCompression, setUseCompression] = useState(false);
  
  console.log('🔄 State check:', {
    isProcessing,
    phase: processingProgress.phase,
    progress: processingProgress.progress,
    uploadedDeck: !!uploadedDeck,
    uploadProgress: uploadProgress,
    shouldShowProcessButton: !!(uploadedDeck && uploadProgress === 100)
  });

  // Reset processing state when component mounts
  useEffect(() => {
    console.log('🔄 Component mounted, resetting processing state');
    processingProgress.resetProcessing();
  }, []);

  const handleFileUpload = (file: File | null) => {
    console.log('🔄 File uploaded:', file?.name);
    
    if (file) {
      const maxSize = 500 * 1024 * 1024; // 500MB limit
      if (file.size > maxSize) {
        onError(`File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(maxSize)}`);
        return;
      }
      
      setUploadedDeck(file);
      setUploadProgress(100); // Mark file selection as complete
      // Auto-enable compression for files larger than 50MB
      setUseCompression(file.size > 50 * 1024 * 1024);
      onError(null); // Clear any previous errors
      console.log('🔄 File upload progress set to 100%, process button should now be visible');
    } else {
      setUploadedDeck(null);
      setUploadProgress(0); // Reset progress when file is removed
      setUseCompression(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-400" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-8 h-8 text-orange-400" />;
      default:
        return <FileCheck className="w-8 h-8 text-blue-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimateSlideCount = (file: File): number => {
    const fileSizeInMB = file.size / (1024 * 1024);
    const fileName = file.name.toLowerCase();
    
    // Rough estimates based on file type and size
    if (fileName.endsWith('.pdf')) {
      // PDFs: roughly 0.1-0.5MB per slide depending on content
      return Math.max(3, Math.min(50, Math.round(fileSizeInMB / 0.3)));
    } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      // PowerPoint: roughly 0.5-2MB per slide with images
      return Math.max(3, Math.min(50, Math.round(fileSizeInMB / 1.2)));
    } else if (fileName.endsWith('.key')) {
      // Keynote: similar to PowerPoint but often larger files
      return Math.max(3, Math.min(50, Math.round(fileSizeInMB / 1.5)));
    }
    
    // Default fallback
    return Math.max(5, Math.min(25, Math.round(fileSizeInMB / 0.8)));
  };

  const handleProcessDeck = async () => {
    console.log('🔄 [BLOB] handleProcessDeck called with Vercel Blob integration, uploadedDeck:', !!uploadedDeck);
    if (!uploadedDeck) return;

    setIsProcessing(true);
    onError(null);

    // Estimate slide count based on file size and type for more realistic loading
    const estimatedSlides = estimateSlideCount(uploadedDeck);
    console.log('🔄 Estimated slides:', estimatedSlides);

    try {
      console.log('🔄 File size:', uploadedDeck.size, 'bytes');
      
      // Step 1: Check for conflicts first
      console.log('🔄 Step 1: Checking for file conflicts...');
      
      // Use sanitized filename for conflict check
      const sanitizedName = uploadedDeck.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      console.log('🔄 Checking conflicts for sanitized name:', uploadedDeck.name, '->', sanitizedName);
      
      const conflict = await fileConflictHandler.checkFileExists(sanitizedName);
      
      let blobUrl: string;
      let finalFileName = uploadedDeck.name;
      
      if (conflict) {
        // Update conflict with original filename for display but sanitized for processing
        const displayConflict = { 
          ...conflict, 
          fileName: uploadedDeck.name // Show original name in dialog
        };
        fileConflictHandler.setConflictsAndShow([displayConflict]);
        // The dialog will handle the resolution
        // For now, we'll exit and let the dialog handle the upload
        setIsProcessing(false);
        return;
      } else {
        // No conflict, proceed with direct upload
        console.log('🔄 No conflicts, uploading directly...');
        
        // Start processing visualization
        processingProgress.startDeckProcessing(estimatedSlides);
        
        // Sanitize filename to avoid URL encoding issues
        const sanitizedFileName = uploadedDeck.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        console.log('🔄 Sanitized filename:', uploadedDeck.name, '->', sanitizedFileName);
        
        let blob;
        try {
          // Use multipart upload for files larger than 10MB for better performance
          const useMultipart = uploadedDeck.size > 10 * 1024 * 1024;
          
          console.log(`🔄 Upload strategy: ${useMultipart ? 'multipart' : 'single'} for ${(uploadedDeck.size / 1024 / 1024).toFixed(2)}MB file`);
          const uploadStartTime = performance.now();
          
          // Simulate progress updates during upload since onUploadProgress might not work reliably
          let progressInterval: NodeJS.Timeout | null = null;
          let currentProgress = 0;
          
          const updateProgress = () => {
            if (currentProgress < 45) { // Stop at 45% to leave room for actual completion
              currentProgress += Math.random() * 10; // Random increment between 0-10%
              const uploadPercentage = Math.min(45, currentProgress);
              
              console.log(`📈 Simulated upload progress: ${uploadPercentage.toFixed(1)}%`);
              onProgressUpdate({
                phase: 'deck',
                step: 'deck-upload',
                currentBatch: 0,
                totalBatches: 1,
                percentage: uploadPercentage,
                status: 'processing'
              });
            }
          };
          
          // Start progress simulation
          progressInterval = setInterval(updateProgress, 500); // Update every 500ms
          
          try {
            blob = await upload(sanitizedFileName, uploadedDeck, {
              access: 'public',
              handleUploadUrl: '/api/upload-deck',
              multipart: useMultipart, // Enable multipart for large files
              onUploadProgress: (progress) => {
                // This may or may not work depending on version
                if (progress && typeof progress.percentage === 'number') {
                  const percentage = Math.round(progress.percentage);
                  console.log(`📈 Real upload progress: ${percentage}% (${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB)`);
                  
                  const uploadPercentage = Math.min(50, percentage * 0.5);
                  onProgressUpdate({
                    phase: 'deck',
                    step: 'deck-upload',
                    currentBatch: 0,
                    totalBatches: 1,
                    percentage: uploadPercentage,
                    status: 'processing'
                  });
                  
                  // Cancel simulation if real progress is working
                  if (progressInterval) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                  }
                }
              }
            });
          } finally {
            // Clean up progress simulation
            if (progressInterval) {
              clearInterval(progressInterval);
            }
          }
          
          const uploadEndTime = performance.now();
          const uploadDuration = (uploadEndTime - uploadStartTime) / 1000;
          const throughputMbps = (uploadedDeck.size / 1024 / 1024) / uploadDuration;
          
          console.log(`✅ Upload completed in ${uploadDuration.toFixed(2)}s (${throughputMbps.toFixed(2)} MB/s throughput)`);
          
          blobUrl = blob.url;
          console.log('🔄 Direct upload completed:', blobUrl);
        } catch (uploadError: any) {
          console.error('❌ Upload failed:', uploadError);
          console.error('❌ Upload error details:', {
            message: uploadError.message,
            stack: uploadError.stack,
            cause: uploadError.cause
          });
          throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
        }
      }
      
      // Step 2: Analyze the uploaded file
      console.log('🔄 Step 2: Analyzing deck...');
      const analysisResponse = await fetch('/api/analyze-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blobUrl,
          filename: finalFileName
        })
      });

      console.log('🔄 Analysis completed, status:', analysisResponse.status);

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        throw new Error(`Failed to analyze deck: ${analysisResponse.status} ${errorText}`);
      }

      const data = await analysisResponse.json();
      console.log('🔄 Analysis data parsed:', data);

      console.log('🔄 About to call onDeckProcessed');
      onDeckProcessed(data);
      console.log('🔄 onDeckProcessed called successfully');
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-results',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 100,
        status: 'completed'
      });
    } catch (err) {
      processingProgress.setError(err instanceof Error ? err.message : 'Failed to process deck');
      onError(err instanceof Error ? err.message : 'Failed to process deck');
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-upload',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to process deck'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle conflict resolution from dialog
  const handleConflictResolution = async (resolution: { action: 'use-existing' | 'overwrite' | 'rename' }) => {
    if (!uploadedDeck || !fileConflictHandler.currentConflict) return;

    const conflictResolution = fileConflictHandler.resolveConflict(resolution);
    if (!conflictResolution) return;

    setIsProcessing(true);
    
    try {
      let blobUrl: string;
      let finalFileName = conflictResolution.fileName;

      if (conflictResolution.action === 'use-existing' && conflictResolution.url) {
        // Use existing file
        blobUrl = conflictResolution.url;
        console.log('🔄 Using existing file:', blobUrl);
      } else {
        // Upload new file (overwrite or rename)
        console.log(`🔄 Uploading file with action: ${conflictResolution.action}`);
        
        // Start processing visualization
        const estimatedSlides = estimateSlideCount(uploadedDeck);
        processingProgress.startDeckProcessing(estimatedSlides);
        
        // Sanitize filename to avoid URL encoding issues
        const sanitizedFinalFileName = finalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        console.log('🔄 Sanitized conflict filename:', finalFileName, '->', sanitizedFinalFileName);
        
        // Use multipart upload for files larger than 10MB for better performance
        const useMultipart = uploadedDeck.size > 10 * 1024 * 1024;
        console.log(`🔄 Conflict upload strategy: ${useMultipart ? 'multipart' : 'single'} for ${(uploadedDeck.size / 1024 / 1024).toFixed(2)}MB file`);
        const uploadStartTime = performance.now();
        
        // Simulate progress updates during conflict upload
        let conflictProgressInterval: NodeJS.Timeout | null = null;
        let conflictCurrentProgress = 0;
        
        const updateConflictProgress = () => {
          if (conflictCurrentProgress < 45) {
            conflictCurrentProgress += Math.random() * 10;
            const uploadPercentage = Math.min(45, conflictCurrentProgress);
            
            console.log(`📈 Simulated conflict upload progress: ${uploadPercentage.toFixed(1)}%`);
            onProgressUpdate({
              phase: 'deck',
              step: 'deck-upload',
              currentBatch: 0,
              totalBatches: 1,
              percentage: uploadPercentage,
              status: 'processing'
            });
          }
        };
        
        conflictProgressInterval = setInterval(updateConflictProgress, 500);
        
        let blob;
        try {
          blob = await upload(sanitizedFinalFileName, uploadedDeck, {
            access: 'public',
            handleUploadUrl: '/api/upload-deck',
            multipart: useMultipart,
            clientPayload: JSON.stringify({ 
              allowOverwrite: conflictResolution.action === 'overwrite' 
            }),
            onUploadProgress: (progress) => {
              if (progress && typeof progress.percentage === 'number') {
                const percentage = Math.round(progress.percentage);
                console.log(`📈 Real conflict upload progress: ${percentage}% (${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB)`);
                
                const uploadPercentage = Math.min(50, percentage * 0.5);
                onProgressUpdate({
                  phase: 'deck',
                  step: 'deck-upload',
                  currentBatch: 0,
                  totalBatches: 1,
                  percentage: uploadPercentage,
                  status: 'processing'
                });
                
                if (conflictProgressInterval) {
                  clearInterval(conflictProgressInterval);
                  conflictProgressInterval = null;
                }
              }
            }
          });
        } finally {
          // Clean up conflict progress simulation
          if (conflictProgressInterval) {
            clearInterval(conflictProgressInterval);
          }
        }
        
        const uploadEndTime = performance.now();
        const uploadDuration = (uploadEndTime - uploadStartTime) / 1000;
        const throughputMbps = (uploadedDeck.size / 1024 / 1024) / uploadDuration;
        console.log(`✅ Conflict upload completed in ${uploadDuration.toFixed(2)}s (${throughputMbps.toFixed(2)} MB/s throughput)`);
        
        blobUrl = blob.url;
        console.log('🔄 File uploaded:', blobUrl);
      }

      // Continue with analysis
      console.log('🔄 Step 2: Analyzing deck...');
      const analysisResponse = await fetch('/api/analyze-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blobUrl,
          filename: finalFileName
        })
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        throw new Error(`Failed to analyze deck: ${analysisResponse.status} ${errorText}`);
      }

      const data = await analysisResponse.json();
      console.log('🔄 Analysis data parsed:', data);

      onDeckProcessed(data);
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-results',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 100,
        status: 'completed'
      });
    } catch (err) {
      processingProgress.setError(err instanceof Error ? err.message : 'Failed to process deck');
      onError(err instanceof Error ? err.message : 'Failed to process deck');
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-upload',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to process deck'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show processing visualization when processing
  if (isProcessing && processingProgress.phase === 'deck') {
    console.log('🔄 Showing ProcessVisualization, progress:', processingProgress.progress);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <ProcessVisualization
          phase="deck"
          progress={processingProgress.progress}
          stats={processingProgress.stats}
          onComplete={() => {
            console.log('🔄 ProcessVisualization onComplete called');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">BuyerMap Analysis</h1>
              <p className="text-sm text-gray-300">Upload & Analyze Your Sales Deck</p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium border border-blue-400/30">Step 1 of 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl border border-blue-400/30">
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Upload Your Sales Deck
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
            We'll extract your ICP assumptions and validate them against real customer interview data. 
            Get insights that help you refine your targeting and messaging.
          </p>
          
          {/* Value Props */}
          <div className="flex items-center justify-center space-x-8 mt-8">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span>Data-Driven Insights</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Target className="w-4 h-4 text-purple-400" />
              <span>ICP Validation</span>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden mb-8">
          
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-b border-white/20 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Sales Deck / Pitch Materials
                </h3>
                <p className="text-sm text-gray-300">
                  Upload your current sales presentation or pitch deck
                </p>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="p-6">
            {!uploadedDeck ? (
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-500/20 scale-[1.02]' 
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-white/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Upload Icon with Animation */}
                <div className={`mx-auto mb-6 transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30">
                      <Cloud className="w-12 h-12 text-blue-400" />
                    </div>
                    {isDragOver && (
                      <div className="absolute inset-0 bg-blue-500/30 rounded-2xl animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Upload Text */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {isDragOver ? 'Drop your file here' : 'Drag and drop your deck'}
                  </h4>
                  <p className="text-gray-300 mb-4">
                    or click to browse your files
                  </p>
                  
                  {/* File Format Support */}
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mb-2">
                    <div className="flex items-center space-x-1">
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Presentation className="w-3 h-3" />
                      <span>PowerPoint</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileCheck className="w-3 h-3" />
                      <span>Keynote</span>
                    </div>
                  </div>
                  
                  {/* File Size Limit */}
                  <div className="text-xs text-gray-500">
                    Maximum file size: 500MB (optimized uploads available)
                  </div>
                </div>

                {/* Browse Button */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,.key"
                    onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                  />
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                    <Upload className="w-4 h-4" />
                    <span>Browse Files</span>
                  </div>
                </label>
              </div>
            ) : (
              /* File Preview */
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {getFileIcon(uploadedDeck.name)}
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{uploadedDeck.name}</h4>
                      <p className="text-sm text-gray-300">{formatFileSize(uploadedDeck.size)}</p>
                      
                      {/* Upload Optimization Info */}
                      {uploadedDeck.size > 10 * 1024 * 1024 && (
                        <div className="mt-2 flex items-center space-x-2 text-xs">
                          <div className="flex items-center space-x-1 text-green-400">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            <span>Multipart upload</span>
                          </div>
                          <div className="flex items-center space-x-1 text-blue-400">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span>Progress tracking</span>
                          </div>
                        </div>
                      )}
                      
                      {uploadedDeck.size > 50 * 1024 * 1024 && (
                        <div className="mt-1 text-xs text-amber-400">
                          ⚡ Large file detected - using optimized upload strategy
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleFileUpload(null)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload Progress */}
                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                {/* Progress Text */}
                <div className="text-center text-white/90 mb-6">
                  <div className="text-lg font-semibold mb-2">
                    {uploadProgress < 30 && "Reading your presentation..."}
                    {uploadProgress >= 30 && uploadProgress < 60 && "Extracting ICP assumptions..."}
                    {uploadProgress >= 60 && uploadProgress < 90 && "Analyzing messaging framework..."}
                    {uploadProgress >= 90 && "Finalizing analysis..."}
                  </div>
                  <div className="text-sm text-white/70">
                    {uploadProgress < 50 ? (
                      "This typically takes 30-45 seconds for larger presentations"
                    ) : (
                      "Almost done - generating your buyer map..."
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Process Button */}
        {uploadedDeck && uploadProgress === 100 && (
          <div className="text-center">
            <button
              onClick={() => {
                console.log('🔄 Process button clicked!');
                handleProcessDeck();
              }}
              disabled={isProcessing}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Processing Deck...</span>
                </>
              ) : (
                <>
                  <span>Process & Analyze Deck</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-sm text-gray-400 mt-3">
              This will extract assumptions from your deck for validation
            </p>
          </div>
        )}

        {/* Error Display */}
        {processingProgress.error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <span className="text-red-300">{processingProgress.error}</span>
            </div>
          </div>
        )}

        {/* Feature Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-blue-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-400/30">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">AI Extraction</h3>
            <p className="text-sm text-gray-300">
              Automatically identifies key assumptions about your target market
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-green-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 border border-green-400/30">
              <BarChart3 className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Data Validation</h3>
            <p className="text-sm text-gray-300">
              Compares assumptions against real customer interview data
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-purple-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-400/30">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Actionable Insights</h3>
            <p className="text-sm text-gray-300">
              Provides specific recommendations to improve your messaging
            </p>
          </div>
        </div>

                  {/* Interview Upload Information */}
          <div className="border-2 border-dashed border-white/30 rounded-lg p-8 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/30 mx-auto mb-4 rounded-full flex items-center justify-center">
                <Mic className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Next: Add Interview Transcripts</h3>
              <p className="text-white/60 mb-2">Upload customer interview transcripts to validate your assumptions</p>
              <p className="text-sm text-white/40 mb-4">
                📝 Supports: .txt, .doc, .docx, .pdf files<br/>
                🎯 Limit: Up to 10 interviews for optimal processing<br/>
                ⏱️ Processing time: ~3-8 minutes depending on file count
              </p>
              <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3 mt-4">
                <div className="text-sm text-blue-200">
                  ℹ️ You'll be able to upload interviews after your deck analysis completes
                </div>
              </div>
            </div>
          </div>
      </div>
      
      {/* File Conflict Dialog */}
      <FileConflictDialog
        isOpen={fileConflictHandler.isDialogOpen}
        fileName={fileConflictHandler.currentConflict?.fileName || ''}
        existingFileInfo={fileConflictHandler.currentConflict?.existingFileInfo}
        onResolve={(action) => handleConflictResolution({ action })}
        onCancel={fileConflictHandler.cancelConflict}
      />
    </div>
  );
} 