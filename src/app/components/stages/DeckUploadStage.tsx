import { useState, useEffect } from 'react';
import { ProcessingProgress } from '../../../types/buyer-map';
import { ICPValidationResponse } from '../../../types/buyermap';
import FileDropzone from '../ui/FileDropzone';
import ProcessVisualization from '../loading/ProcessVisualization';
import { useProcessingProgress } from '../../hooks/useProcessingProgress';
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
  BarChart3
} from 'lucide-react';

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
  
  console.log('🔄 State check:', {
    isProcessing,
    phase: processingProgress.phase,
    progress: processingProgress.progress,
    uploadedDeck: !!uploadedDeck
  });

  // Reset processing state when component mounts
  useEffect(() => {
    console.log('🔄 Component mounted, resetting processing state');
    processingProgress.resetProcessing();
  }, []);

  const handleFileUpload = (file: File | null) => {
    console.log('🔄 File uploaded:', file?.name);
    
    if (file) {
      // Check file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        onError(`File too large. Maximum size is 50MB, but your file is ${fileSizeMB}MB. Please compress your file or convert to a more efficient format.`);
        return;
      }
      
      // Clear any previous errors
      onError(null);
    }
    
    setUploadedDeck(file);
    if (file) {
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);
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
    console.log('🔄 handleProcessDeck called, uploadedDeck:', !!uploadedDeck);
    if (!uploadedDeck) return;

    setIsProcessing(true);
    onError(null);

    // Estimate slide count based on file size and type for more realistic loading
    const estimatedSlides = estimateSlideCount(uploadedDeck);
    console.log('🔄 Estimated slides:', estimatedSlides);

    // Start the enhanced processing visualization with dynamic slide count
    processingProgress.startDeckProcessing(estimatedSlides);

    try {
      console.log('🔄 Starting API call');
      
      // Check if we need to use chunked upload (for files > 4MB to handle Vercel limits)
      const CHUNK_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB
      let apiResponse: Response;
      
      if (uploadedDeck.size > CHUNK_SIZE_LIMIT) {
        console.log('🔄 Using chunked upload for large file:', uploadedDeck.size, 'bytes');
        
        // Convert file to base64 for chunked upload
        const fileBuffer = await uploadedDeck.arrayBuffer();
        const base64Data = Buffer.from(fileBuffer).toString('base64');
        
        apiResponse = await fetch('/api/analyze-deck', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: uploadedDeck.name,
            fileData: base64Data,
            mimeType: uploadedDeck.type
          })
        });
      } else {
        console.log('🔄 Using regular FormData upload');
        const formData = new FormData();
        formData.append('deck', uploadedDeck);
        
        apiResponse = await fetch('/api/analyze-deck', {
          method: 'POST',
          body: formData
        });
      }

      console.log('🔄 API call completed, status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Failed to process deck: ${apiResponse.status} ${errorText}`);
      }

      const data = await apiResponse.json();
      console.log('🔄 API data parsed:', data);

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
                    Maximum file size: 50MB
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
                    <div>
                      <h4 className="font-medium text-white">{uploadedDeck.name}</h4>
                      <p className="text-sm text-gray-300">{formatFileSize(uploadedDeck.size)}</p>
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
                {uploadProgress < 100 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Uploading...</span>
                      <span className="text-sm text-blue-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success State */}
                {uploadProgress === 100 && (
                  <div className="flex items-center space-x-2 text-green-400 mb-4">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Upload complete</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Process Button */}
        {uploadedDeck && uploadProgress === 100 && (
          <div className="text-center">
            <button
              onClick={handleProcessDeck}
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
      </div>
    </div>
  );
} 