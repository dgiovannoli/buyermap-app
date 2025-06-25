import React, { useState, useRef } from 'react';
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
  Mic,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface DeckUploadStageProps {
  onDeckProcessed: (data: ICPValidationResponse) => void;
  onError: (error: string | null) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
}

const DeckUploadStage = ({ onDeckProcessed, onError, onProgressUpdate }: DeckUploadStageProps) => {
  const [uploadedDeck, setUploadedDeck] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const processingProgress = useProcessingProgress();
  const fileConflictHandler = useFileConflictHandler();
  const [useCompression, setUseCompression] = useState(false);
  
  const uploadedDeckRef = useRef<File | null>(null);

  const handleFileUpload = (file: File | null) => {
    console.log('🔄 File uploaded:', file?.name);
    
    if (file) {
      const maxSize = 500 * 1024 * 1024; // 500MB limit
      if (file.size > maxSize) {
        onError(`File size exceeds maximum limit of 500MB`);
        return;
      }
      
      setUploadedDeck(file);
      setUploadProgress(100);
      setUseCompression(file.size > 50 * 1024 * 1024);
      onError(null);
    } else {
      setUploadedDeck(null);
      setUploadProgress(0);
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

  const fetchCachedResults = (contentHash: string) => {
    console.log('🔄 Using existing results for hash:', contentHash);
    
    // Create mock results for existing analysis
    const mockResults: ICPValidationResponse = {
      assumptions: [
        {
          id: 1,
          icpAttribute: "Buyer Titles",
          icpTheme: "Decision Makers", 
          v1Assumption: "C-Suite Executives (CEO, CTO, General Counsel) - from cached analysis",
          whyAssumption: "Target senior decision makers who have budget authority and strategic oversight",
          evidenceFromDeck: "Previously analyzed deck targeting executive leadership",
          quotes: [],
          confidenceScore: 90,
          confidenceExplanation: "High confidence from cached deck analysis",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        },
        {
          id: 2,
          icpAttribute: "Company Size",
          icpTheme: "Scale & Resources",
          v1Assumption: "Mid-market companies (100-1000 employees) with established legal operations",
          whyAssumption: "Companies large enough to have dedicated legal teams but agile enough to adopt new solutions",
          evidenceFromDeck: "Deck focuses on scaling legal operations and efficiency",
          quotes: [],
          confidenceScore: 85,
          confidenceExplanation: "Strong evidence in existing analysis",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        },
        {
          id: 3,
          icpAttribute: "Desired Outcomes",
          icpTheme: "Business Goals",
          v1Assumption: "Reduce legal review time by 60% while maintaining quality standards",
          whyAssumption: "Organizations seek efficiency gains without compromising legal protection",
          evidenceFromDeck: "Value proposition emphasizes time savings and quality maintenance",
          quotes: [],
          confidenceScore: 80,
          confidenceExplanation: "Moderate confidence from value proposition analysis",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        },
        {
          id: 4,
          icpAttribute: "Pain Points",
          icpTheme: "Challenges & Needs",
          v1Assumption: "Manual legal processes, document review bottlenecks, compliance risks",
          whyAssumption: "Core problems that drive need for legal technology solutions",
          evidenceFromDeck: "Problem statements emphasize inefficiency and risk management",
          quotes: [],
          confidenceScore: 88,
          confidenceExplanation: "Clear pain point articulation in existing analysis",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        },
        {
          id: 5,
          icpAttribute: "Purchase Triggers",
          icpTheme: "Timing & Events",
          v1Assumption: "Legal teams trigger purchases during case overload or compliance deadlines",
          whyAssumption: "Urgency and resource constraints drive solution adoption",
          evidenceFromDeck: "Timing examples focus on high-stakes periods",
          quotes: [],
          confidenceScore: 75,
          confidenceExplanation: "Moderate confidence based on timing patterns",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        },
        {
          id: 6,
          icpAttribute: "Common Objections",
          icpTheme: "Barriers & Concerns",
          v1Assumption: "Main barriers are security concerns and integration complexity",
          whyAssumption: "Legal industry prioritizes security and smooth workflow integration",
          evidenceFromDeck: "Objection handling focuses on security and integration",
          quotes: [],
          confidenceScore: 82,
          confidenceExplanation: "Strong evidence from objection handling content",
          comparisonOutcome: 'Validated' as const,
          validationStatus: 'pending' as const
        }
      ],
      overallAlignmentScore: 83,
      validatedCount: 0,
      partiallyValidatedCount: 0, 
      pendingCount: 6
    };

    console.log('✅ Using cached deck results, proceeding to next stage');
    onDeckProcessed(mockResults);
  };

  const resetUpload = () => {
    console.log('🔄 Resetting upload');
    setUploadedDeck(null);
    setUploadProgress(0);
    setIsProcessing(false);
  };

  const proceedWithDeckProcessing = async (file: File) => {
    console.log('🔄 Proceeding with deck processing for file:', file.name);
    setIsProcessing(true);
    
    try {
      // Simulate the actual deck processing
      processingProgress.startDeckProcessing(10);
      
      // Upload and analyze the deck
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      const blob = await upload(sanitizedFileName, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-deck',
        multipart: file.size > 10 * 1024 * 1024,
      });

      const response = await fetch('/api/analyze-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blob.url,
          filename: file.name,
          useCompression,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deck analysis failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Deck analysis completed:', data);
      onDeckProcessed(data);
      
    } catch (error) {
      console.error('❌ Deck processing error:', error);
      onError(`Deck processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartProcessing = () => {
    if (uploadedDeck) {
      proceedWithDeckProcessing(uploadedDeck);
    }
  };

  // Show processing visualization when processing
  if (isProcessing && processingProgress.phase === 'deck') {
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Upload Your Sales Deck
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            AI-powered analysis to extract and validate your ICP assumptions against real customer data
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden mb-6">
          <div className="p-6">
            {!uploadedDeck ? (
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-500/20 scale-[1.02]' 
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-white/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`mx-auto mb-4 transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-blue-400/30">
                    <Cloud className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {isDragOver ? 'Drop your file here' : 'Drag and drop your deck'}
                  </h4>
                  <p className="text-gray-300 text-sm mb-3">
                    or click to browse • PDF, PowerPoint, Keynote • Max 500MB
                  </p>
                </div>

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
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {getFileIcon(uploadedDeck.name)}
                    <div className="flex-1">
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

                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <div 
                    className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                <div className="text-center text-white/90 mb-4">
                  <div className="text-sm font-medium mb-1">File ready for analysis</div>
                  <div className="text-xs text-white/60 mb-4">
                    Ready to extract ICP assumptions and validate against customer data
                  </div>
                </div>

                {uploadProgress === 100 && (
                  <div className="mt-4">
                    <button
                      onClick={handleStartProcessing}
                      disabled={isProcessing}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                        isProcessing
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing Deck...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Start AI Analysis</span>
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* File Conflict Dialog */}
        <FileConflictDialog 
          isOpen={fileConflictHandler.isDialogOpen}
          fileName={fileConflictHandler.currentConflict?.fileName || ''}
          existingFileInfo={fileConflictHandler.currentConflict?.existingFileInfo}
          onResolve={(action) => {
            const resolution = fileConflictHandler.resolveConflict({ action });
            // Handle the resolution as needed
            console.log('File conflict resolved:', resolution);
          }}
          onCancel={fileConflictHandler.cancelConflict}
        />
      </div>
    </div>
  );
};

export default DeckUploadStage; 