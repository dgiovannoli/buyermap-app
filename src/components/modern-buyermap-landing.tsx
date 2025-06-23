import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Building, Target, AlertCircle, Trophy, Zap, Shield, MessageSquare, Info, BarChart3
} from 'lucide-react';
import { BuyerMapData } from '../types/buyermap';
import DetailedValidationCard from './DetailedValidationCard';
import { mapBuyerMapToValidationData } from '../utils/mapToValidationData';
import UploadComponent from './UploadComponent';
import { MOCK_BUYER_MAP_DATA } from './__mocks__/buyerMapData';
import InterviewProcessingOverlay from '../app/components/loading/InterviewProcessingOverlay';
import { useProcessingProgress } from '../app/hooks/useProcessingProgress';
import ProcessVisualization from '../app/components/loading/ProcessVisualization';
import { upload } from '@vercel/blob/client';
import FileConflictDialog from './ui/FileConflictDialog';
import { useFileConflictHandler, type FileConflictResolution } from '../hooks/useFileConflictHandler';

// Assume buyerMapData and overallScore are passed as props or from parent state
// interface BuyerMapData, Quote, etc. should be imported from types if needed

// Helper: Section and Icon Mapping
const getSectionInfo = (icpAttribute: string = '') => {
  const attribute = icpAttribute?.toLowerCase() || '';
  if (attribute.includes('buyer') || attribute.includes('title') || attribute.includes('decision maker')) {
    return {
      section: 'WHO',
      category: 'Buyer Titles',
      icon: Users,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      titleColor: 'text-blue-300'
    };
  }
  if (attribute.includes('company') || attribute.includes('size') || attribute.includes('firm')) {
    return {
      section: 'WHO',
      category: 'Company Size', 
      icon: Building,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      titleColor: 'text-purple-300'
    };
  }
  if (attribute.includes('pain') || attribute.includes('problem') || attribute.includes('challenge')) {
    return {
      section: 'WHAT',
      category: 'Pain Points',
      icon: AlertCircle,
      iconColor: 'text-red-400', 
      iconBg: 'bg-red-500/20',
      titleColor: 'text-red-300'
    };
  }
  if (attribute.includes('desired') || attribute.includes('outcome') || attribute.includes('goal')) {
    return {
      section: 'WHAT',
      category: 'Desired Outcomes',
      icon: Trophy,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20', 
      titleColor: 'text-emerald-300'
    };
  }
  if (attribute.includes('trigger') || attribute.includes('timing') || attribute.includes('when')) {
    return {
      section: 'WHEN',
      category: 'Triggers',
      icon: Zap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/20',
      titleColor: 'text-amber-300'
    };
  }
  if (attribute.includes('barrier') || attribute.includes('objection') || attribute.includes('concern')) {
    return {
      section: 'WHY',
      category: 'Barriers',
      icon: Shield,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/20',
      titleColor: 'text-indigo-300'
    };
  }
  if (attribute.includes('messaging') || attribute.includes('communication') || attribute.includes('emphasis')) {
    return {
      section: 'WHY',
      category: 'Messaging Emphasis',
      icon: MessageSquare,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/20',
      titleColor: 'text-teal-300'
    };
  }
  // Default fallback
  return {
    section: 'OTHER',
    category: icpAttribute || 'Unknown',
    icon: Target,
    iconColor: 'text-gray-400',
    iconBg: 'bg-gray-500/20',
    titleColor: 'text-gray-300'
  };
};

const getOutcomeTextColor = (outcome: string): string => {
  switch (outcome) {
    case 'Aligned': 
    case 'Validated': return 'text-emerald-400';
    case 'New Data Added': return 'text-blue-400'; 
    case 'Gap Identified': return 'text-amber-400'; 
    case 'Misaligned': 
    case 'Contradicted': return 'text-red-400';
    case 'Refined': return 'text-orange-400';
    case 'Insufficient Data': return 'text-gray-400';
    default: return 'text-gray-400';
  }
};

// Example getScoreMessage helper
const getScoreMessage = (score: number): string => {
  if (score >= 90) return 'Excellent alignment with ICP!';
  if (score >= 75) return 'Strong alignment, some areas to refine.';
  if (score >= 50) return 'Moderate alignment, review key assumptions.';
  return 'Significant misalignment, revisit ICP assumptions.';
};

interface ModernBuyerMapLandingProps {
  buyerMapData: BuyerMapData[];
  overallScore: number;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  initialInsights?: BuyerMapData[]; // Optional prop for testing/mock data
}

// Component to display score breakdown
const ScoreBreakdown: React.FC<{ 
  scoreBreakdown?: Record<string, { score: number; outcome: string; weight: number }>;
  outcomeWeights?: Record<string, number>;
  summary?: { aligned: number; newData: number; misaligned: number; pending: number };
}> = ({ scoreBreakdown, outcomeWeights, summary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!scoreBreakdown || !outcomeWeights || !summary) {
    return null;
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'Aligned': return 'text-green-400 bg-green-500/20';
      case 'New Data Added': return 'text-blue-400 bg-blue-500/20';
      case 'Misaligned': return 'text-red-400 bg-red-500/20';
      case 'Challenged': return 'text-yellow-400 bg-yellow-500/20';
      case 'Refined': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getOutcomeDescription = (outcome: string) => {
    switch (outcome) {
      case 'Aligned': return 'Perfectly matches interview data';
      case 'New Data Added': return 'Valuable insights gained from interviews';
      case 'Misaligned': return 'Contradicted by interview evidence';
      case 'Challenged': return 'Needs further investigation';
      case 'Refined': return 'Understanding improved through validation';
      default: return 'Status unclear';
    }
  };

  return (
    <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-center justify-between text-white/80 hover:text-white transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4" />
          <span className="text-sm font-medium">How is this score calculated?</span>
        </div>
        <span className="text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/20">
              <div className="text-lg font-bold text-green-400">{summary.aligned}</div>
              <div className="text-xs text-green-300">Aligned</div>
            </div>
            <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <div className="text-lg font-bold text-blue-400">{summary.newData}</div>
              <div className="text-xs text-blue-300">New Data</div>
            </div>
            <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/20">
              <div className="text-lg font-bold text-red-400">{summary.misaligned}</div>
              <div className="text-xs text-red-300">Misaligned</div>
            </div>
            <div className="text-center p-2 bg-gray-500/10 rounded border border-gray-500/20">
              <div className="text-lg font-bold text-gray-400">{summary.pending}</div>
              <div className="text-xs text-gray-300">Other</div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/80 mb-2">Individual Assumption Scores:</h4>
            {Object.entries(scoreBreakdown).map(([assumption, data]) => (
              <div key={assumption} className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
                <div className="flex-1">
                  <div className="text-white/90 font-medium">{assumption}</div>
                  <div className="text-white/60 text-xs">{getOutcomeDescription(data.outcome)}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${getOutcomeColor(data.outcome)}`}>
                    {data.outcome}
                  </span>
                  <span className="text-white/80 font-medium">{data.score}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Weighting Explanation */}
          <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
            <h4 className="text-sm font-medium text-white/80 mb-2">Scoring Weights:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-white/70">
              {Object.entries(outcomeWeights).map(([outcome, weight]) => (
                <div key={outcome} className="flex justify-between">
                  <span>{outcome}:</span>
                  <span>{Math.round(weight * 100)}% weight</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60 mt-2">
              Each assumption's base confidence score is multiplied by its outcome weight to calculate the final contribution to the overall score.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const ProcessingTimeEstimate: React.FC<{
  interviewCount: number;
  isProcessing: boolean;
  currentStep: number;
}> = ({ interviewCount, isProcessing, currentStep }) => {
  if (!isProcessing || currentStep !== 2) return null;

  const estimatedTimeSeconds = Math.max(60, interviewCount * 30); // Minimum 1 minute, ~30 seconds per interview
  const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Processing {interviewCount} interview file{interviewCount !== 1 ? 's' : ''}
          </h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Estimated time:</strong> {estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}</p>
            <p>• <strong>Current task:</strong> AI-powered quote extraction and classification</p>
            <p>• <strong>Progress:</strong> Processing files in parallel for faster results</p>
          </div>
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 rounded px-2 py-1">
            💡 <strong>Tip:</strong> Interview analysis takes longer than deck processing due to detailed AI analysis of customer quotes
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernBuyerMapLanding: React.FC<ModernBuyerMapLandingProps> = ({ 
  buyerMapData, 
  overallScore, 
  currentStep, 
  setCurrentStep,
  initialInsights 
}) => {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  // Debug logging for environment variable
  useEffect(() => {
    console.log('🔥 NEXT_PUBLIC_USE_MOCK is:', process.env.NEXT_PUBLIC_USE_MOCK);
    console.log('🔥 isMock boolean flag:', isMock);
  }, [isMock]);
  
  // Pick from real data or mocks - prioritize mock mode
  const initialLocalData = isMock 
    ? MOCK_BUYER_MAP_DATA 
    : (initialInsights ?? buyerMapData ?? []);
  
  // If we have buyerMapData, it means deck was already processed, so set uploaded to true
  const [uploaded, setUploaded] = useState<boolean>(isMock || (buyerMapData?.length ?? 0) > 0);
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    deck: File[];
    interviews: File[];
  }>({
    deck: [],
    interviews: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingInterviews, setUploadingInterviews] = useState(false);
  const [localBuyerMapData, setLocalBuyerMapData] = useState<BuyerMapData[]>(initialLocalData);
  const [score, setScore] = useState<number | null>(isMock ? overallScore : null);
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, { score: number; outcome: string; weight: number }> | undefined>(undefined);
  const [outcomeWeights, setOutcomeWeights] = useState<Record<string, number> | undefined>(undefined);
  const [summary, setSummary] = useState<{ aligned: number; newData: number; misaligned: number; pending: number } | undefined>(undefined);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const interviewProcessing = useProcessingProgress();

  // File conflict handling
  const {
    currentConflict,
    isDialogOpen,
    checkFilesForConflicts,
    resolveConflict,
    cancelConflict,
    setConflictsAndShow
  } = useFileConflictHandler();

  // Store files for conflict resolution
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Auto-setup for mock mode
  useEffect(() => {
    if (!isMock) return;         // bail out immediately when mocks are OFF
    
    if (!uploaded) {
      // Simulate the upload completion and jump directly to results
      setUploaded(true);
      setCurrentStep(3);
      // Set mock score based on the mock data (mock mode exception)
      const mockScore = calculateOverallScore(MOCK_BUYER_MAP_DATA);
      setScore(mockScore);
    }
  }, [isMock, uploaded, setCurrentStep]);

  // Add effect to log state changes
  useEffect(() => {
    console.log('showUploadMore state changed:', showUploadMore);
  }, [showUploadMore]);

  // Add debug logging for currentStep changes
  useEffect(() => {
    console.log('currentStep changed:', currentStep);
  }, [currentStep]);

  // Add effect to log localBuyerMapData updates
  useEffect(() => {
    console.log('localBuyerMapData updated:', localBuyerMapData);
  }, [localBuyerMapData]);

  // Add debug logging for render
  console.log('Rendering component with:', {
    currentStep,
    showUploadMore,
    score,
    uploaded,
    isDemoMode,
    isMock,
    localBuyerMapDataLength: localBuyerMapData?.length ?? 0
  });

  // Helper to calculate overall score (simple average for demo)
  const calculateOverallScore = (data: BuyerMapData[]) => {
    if (!data.length) return 0;
    const total = data.reduce((sum, item) => sum + (item.confidenceScore || 0), 0);
    return Math.round(total / data.length);
  };

  // Process deck with real API endpoint
  const handleProcessDeck = async (files: File[]) => {
    if (!files.length) {
      console.log('No deck files to process');
      return;
    }

    try {
      console.log('🚀 [BLOB] Starting deck upload process...');
      setIsProcessing(true);
      setProcessError(null);

      // Step 1: Upload deck to Vercel Blob
      const { head } = await import('@vercel/blob');
      const file = files[0];
      
      console.log(`📊 [BLOB] Uploading deck: ${file.name}`);
      
      // Check if file already exists
      let fileExists = false;
      let existingUrl = null;
      
      try {
        const existingBlob = await head(file.name);
        if (existingBlob) {
          fileExists = true;
          existingUrl = existingBlob.url;
          console.log(`🔍 [BLOB] Deck "${file.name}" already exists at: ${existingUrl}`);
        }
      } catch (error) {
        // File doesn't exist, continue with upload
        console.log(`📁 [BLOB] Deck "${file.name}" doesn't exist, proceeding with upload`);
      }
      
      let blobUrl = null;
      
      if (fileExists && existingUrl) {
        // Ask user what to do with existing file
        const userChoice = confirm(
          `The deck "${file.name}" already exists.\n\n` +
          `• Click "OK" to use the existing file\n` +
          `• Click "Cancel" to upload a new version (overwrite)`
        );
        
        if (userChoice) {
          // Use existing file
          console.log(`🔄 [BLOB] Using existing deck: ${existingUrl}`);
          blobUrl = existingUrl;
        } else {
          // User wants to overwrite, proceed with upload
          console.log(`🔄 [BLOB] User chose to overwrite deck: ${file.name}`);
        }
      }
      
      // Upload the deck if we don't have a URL yet
      if (!blobUrl) {
        const { upload } = await import('@vercel/blob/client');
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload-deck',
          clientPayload: JSON.stringify({ 
            allowOverwrite: fileExists // Allow overwrite if file exists
          }),
        });
        
        console.log(`✅ [BLOB] Deck uploaded:`, blob.url);
        blobUrl = blob.url;
      }

      // Step 2: Send blob URL to analysis API
      console.log('📊 [BLOB] Sending deck blob URL to analysis API...');
      const res = await fetch('/api/analyze-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blobUrl,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Deck analysis failed: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Real API responded:', data);
      
      // Update local state with deck analysis results
      if (data.assumptions) {
        setLocalBuyerMapData(data.assumptions);
        // Don't set score until interviews are processed
        // const calculatedScore = calculateOverallScore(data.assumptions);
        // setScore(calculatedScore);
      }
      
      setUploaded(true);
      setCurrentStep(3);
      
    } catch (err) {
      console.error('❌ Deck upload error', err);
      setProcessError(`Deck processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // File upload handlers
      const handleFileUpload = async (type: 'deck' | 'interviews', files: FileList | null) => {
      if (!files || files.length === 0) return;

      console.log(`handleFileUpload called with:`, { type, files });

      if (type === 'deck') {
        setUploadedFiles(prev => ({ ...prev, deck: Array.from(files) }));
        await handleProcessDeck(Array.from(files));
      } else if (type === 'interviews') {
        const filesArray = Array.from(files);
        console.log(`Processing new files:`, filesArray.map(f => f.name));
        
        // Check interview upload limits
        const currentInterviewCount = uploadedFiles.interviews.length;
        const newFileCount = filesArray.length;
        const maxInterviews = 10;
        
        if (currentInterviewCount + newFileCount > maxInterviews) {
          const allowedCount = maxInterviews - currentInterviewCount;
          const excessCount = (currentInterviewCount + newFileCount) - maxInterviews;
          
          alert(`⚠️ Upload Limit: You can upload ${allowedCount} more interview(s). ${excessCount} file(s) will be skipped.\n\nFor best results, limit to 10 interviews total to avoid processing timeouts.`);
          
          // Take only the allowed number of files
          if (allowedCount > 0) {
            const allowedFiles = filesArray.slice(0, allowedCount);
            setUploadedFiles(prev => ({ ...prev, interviews: [...prev.interviews, ...allowedFiles] }));
          } else {
            console.log('❌ No more interviews can be uploaded (limit reached)');
            return;
          }
        } else {
          setUploadedFiles(prev => ({ ...prev, interviews: [...prev.interviews, ...filesArray] }));
        }

              console.log('🎙️ [BLOB] Starting interview upload process for', filesArray.length, 'files');
        setUploadingInterviews(true);
        setProcessError(null);
        
        // Store files for conflict resolution
        setPendingFiles(filesArray);
        
        // Start enhanced interview processing visualization
        const assumptionTexts = localBuyerMapData.map(a => a.v1Assumption || '');
        interviewProcessing.startInterviewProcessing(filesArray.length, assumptionTexts);
        
        try {
          // Step 1: Check for file conflicts BEFORE starting any uploads
          console.log('🔍 [BLOB] Checking for file conflicts...');
          const { conflictFiles, clearFiles } = await checkFilesForConflicts(filesArray);
        
        console.log(`📊 [BLOB] Conflict check results: ${conflictFiles.length} conflicts, ${clearFiles.length} clear files`);

        // Step 2: Upload files without conflicts immediately
        const blobUrls: string[] = [];
        if (clearFiles.length > 0) {
          console.log(`✅ [BLOB] Uploading ${clearFiles.length} files without conflicts`);
          for (let i = 0; i < clearFiles.length; i++) {
            const file = clearFiles[i];
            console.log(`🎙️ [BLOB] Uploading file ${i + 1}/${clearFiles.length}:`, file.name);
            
            // Sanitize filename to avoid URL encoding issues
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            console.log('🔄 Sanitized interview filename:', file.name, '->', sanitizedFileName);
            
            // Use multipart upload for files larger than 10MB for better performance
            const useMultipart = file.size > 10 * 1024 * 1024;
            console.log(`🔄 Interview upload strategy: ${useMultipart ? 'multipart' : 'single'} for ${(file.size / 1024 / 1024).toFixed(2)}MB file`);
            
            const uploadStartTime = performance.now();
            const blob = await upload(sanitizedFileName, file, {
              access: 'public',
              handleUploadUrl: '/api/upload-interview',
              multipart: useMultipart,
              onUploadProgress: (progress) => {
                const percentage = Math.round(progress.percentage);
                console.log(`📈 Interview upload progress: ${percentage}% (${file.name})`);
              }
            });
            
            const uploadEndTime = performance.now();
            const uploadDuration = (uploadEndTime - uploadStartTime) / 1000;
            const throughputMbps = (file.size / 1024 / 1024) / uploadDuration;
            console.log(`✅ [BLOB] Interview uploaded in ${uploadDuration.toFixed(2)}s (${throughputMbps.toFixed(2)} MB/s): ${file.name} -> ${blob.url}`);
            
            blobUrls.push(blob.url);
          }
        }

        // Step 3: Handle conflicts if any exist
        if (conflictFiles.length > 0) {
          console.log(`⚠️ [BLOB] Found ${conflictFiles.length} file conflicts, will show dialog`);
          
          // Set conflicts to trigger dialog display
          setConflictsAndShow(conflictFiles);
          
          // For now, we'll handle the first conflict and let the user resolve them one by one
          // The actual resolution will be handled by the dialog component's onResolve callback
          console.log('🔄 [BLOB] Dialog will be shown for conflict resolution');
          
          // Note: The actual file processing will continue after dialog resolution
          // This is a simplified implementation - in a full implementation, you'd want to
          // suspend this function and resume after all conflicts are resolved
        }

        // Step 4: Process all uploaded files (for now, just the clear files)
        if (blobUrls.length > 0) {
          console.log(`🚀 [BLOB] Processing ${blobUrls.length} interview files...`);
          
          // Update progress indicator
          const resetProgress = interviewProcessing.startInterviewProcessing(blobUrls.length, localBuyerMapData.map(d => d.v1Assumption));
          // Note: The progress will be automatically managed by the processing hooks
          
          // Create a timeout for the analysis request (5 minutes)
          const timeoutMs = 5 * 60 * 1000; // 5 minutes
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Analysis request timed out after 5 minutes')), timeoutMs)
          );

          console.log(`⏰ [BLOB] Starting analysis with ${timeoutMs/1000}s timeout...`);
          
          const analysisPromise = fetch('/api/analyze-interviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              blobUrls,
              assumptions: JSON.stringify(localBuyerMapData),
            }),
          });

          const analysisResponse = await Promise.race([analysisPromise, timeoutPromise]) as Response;

          if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            console.error('❌ Analysis response error:', {
              status: analysisResponse.status,
              statusText: analysisResponse.statusText,
              body: errorText
            });
            throw new Error(`Analysis failed (${analysisResponse.status}): ${analysisResponse.statusText || errorText}`);
          }

          const payload = await analysisResponse.json();
          console.log('✅ [BLOB] Interview analysis completed:', payload);

          // Update state with interview data
          if (payload.success && payload.assumptions) {
            // Enhanced debugging before processing
            console.log('🔍 [DEBUG] Raw interview API response:', {
              payloadSuccess: payload.success,
              assumptionsLength: payload.assumptions?.length || 0,
              firstAssumption: payload.assumptions?.[0] ? {
                id: payload.assumptions[0].id,
                hasQuotes: !!(payload.assumptions[0].quotes && payload.assumptions[0].quotes.length > 0),
                quotesLength: payload.assumptions[0].quotes?.length || 0,
                hasRealityFromInterviews: !!payload.assumptions[0].realityFromInterviews,
                realityPreview: payload.assumptions[0].realityFromInterviews?.slice(0, 100) || 'empty',
                hasKeyFinding: !!payload.assumptions[0].keyFinding,
                hasInterviewInsights: !!payload.assumptions[0].interviewInsights,
                hasSummary: !!payload.assumptions[0].summary,
                firstQuote: payload.assumptions[0].quotes?.[0] ? {
                  hasText: !!payload.assumptions[0].quotes[0].text,
                  hasSpeaker: !!payload.assumptions[0].quotes[0].speaker,
                  textPreview: payload.assumptions[0].quotes[0].text?.slice(0, 50) || 'no text'
                } : 'no quotes'
              } : 'no first assumption',
              totalQuotes: payload.assumptions?.reduce((sum: number, a: any) => sum + (a.quotes?.length || 0), 0) || 0,
              metadataQuotes: payload.metadata?.totalQuotes || 'no metadata'
            });

            // Ensure realityFromInterviews is properly mapped
            const processedAssumptions = payload.assumptions.map((assumption: any) => ({
              ...assumption,
              realityFromInterviews: assumption.realityFromInterviews || 
                                   assumption.keyFinding || 
                                   assumption.interviewInsights || 
                                   assumption.summary ||
                                   (assumption.quotes?.length > 0 ? 
                                     'Interview insights available - see supporting quotes for details.' : 
                                     'No interview data available')
            }));
            
            console.log('🔍 [DEBUG] Processed assumptions with reality data:', {
              count: processedAssumptions.length,
              withReality: processedAssumptions.filter((a: any) => a.realityFromInterviews && a.realityFromInterviews !== 'No interview data available').length,
              processedFirstAssumption: processedAssumptions[0] ? {
                reality: processedAssumptions[0].realityFromInterviews?.slice(0, 100) || 'empty',
                quotesCount: processedAssumptions[0].quotes?.length || 0
              } : 'no first assumption'
            });

            setLocalBuyerMapData(processedAssumptions);
            
            // Update score if available
            if (payload.overallAlignmentScore) {
              setScore(payload.overallAlignmentScore);
            }
            
            // Update score breakdown data if available
            if (payload.scoreBreakdown) {
              setScoreBreakdown(payload.scoreBreakdown.breakdown);
              setOutcomeWeights(payload.scoreBreakdown.outcomeWeights);
              setSummary(payload.scoreBreakdown.summary);
            }
            
            setUploadingInterviews(false);
            interviewProcessing.resetProcessing();
            setCurrentStep(3);
            setUploaded(true);
            console.log('✅ Interview data integrated with buyer map');
          }
        } else if (conflictFiles.length === 0) {
          console.log('ℹ️ No files were uploaded');
        }

      } catch (error: any) {
        console.error('❌ Interview upload error:', error);
        setProcessError(`Interview upload failed: ${error.message}`);
        interviewProcessing.setError(error.message);
      } finally {
        setUploadingInterviews(false);
        interviewProcessing.resetProcessing();
      }
    }
  };

  // Handle conflict resolution from dialog
  const handleConflictResolve = async (action: 'use-existing' | 'overwrite' | 'rename') => {
    if (!currentConflict) return;

    console.log(`🔄 [BLOB] Resolving conflict for ${currentConflict.fileName} with action: ${action}`);
    
    try {
      const resolution = resolveConflict({ action });
      if (!resolution) return;

      // Find the original file from stored pendingFiles
      const originalFile = pendingFiles.find(f => f.name === currentConflict.fileName);
      
      if (!originalFile) {
        console.error('❌ Original file not found for conflict resolution');
        return;
      }

      let resultUrl: string | undefined;

      // Handle the resolution
      switch (resolution.action) {
        case 'use-existing':
          console.log(`♻️ [BLOB] Using existing file: ${resolution.fileName}`);
          resultUrl = resolution.url;
          break;
          
        case 'overwrite':
          console.log(`🔄 [BLOB] Overwriting file: ${resolution.fileName}`);
          const sanitizedOverwriteName = originalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          console.log('🔄 Sanitized overwrite filename:', originalFile.name, '->', sanitizedOverwriteName);
          const overwriteBlob = await upload(sanitizedOverwriteName, originalFile, {
            access: 'public',
            handleUploadUrl: '/api/upload-interview',
            clientPayload: JSON.stringify({ allowOverwrite: true })
          });
          resultUrl = overwriteBlob.url;
          break;
          
        case 'rename':
          console.log(`📝 [BLOB] Renaming and uploading file: ${resolution.fileName}`);
          const sanitizedRenameName = resolution.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          console.log('🔄 Sanitized rename filename:', resolution.fileName, '->', sanitizedRenameName);
          const renameBlob = await upload(sanitizedRenameName, originalFile, {
            access: 'public',
            handleUploadUrl: '/api/upload-interview',
          });
          resultUrl = renameBlob.url;
          break;
      }

      if (resultUrl) {
        console.log(`✅ [BLOB] Conflict resolved, file available at: ${resultUrl}`);
        
        // Process the resolved file with timeout protection
        const timeoutMs = 5 * 60 * 1000; // 5 minutes
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Single file analysis timed out after 5 minutes')), timeoutMs)
        );

        const analysisPromise = fetch('/api/analyze-interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blobUrls: [resultUrl],
            assumptions: JSON.stringify(localBuyerMapData),
          }),
        });

        const analysisResponse = await Promise.race([analysisPromise, timeoutPromise]) as Response;

        if (analysisResponse.ok) {
          const payload = await analysisResponse.json();
          console.log('✅ [BLOB] Single file analysis completed:', payload);
          
          // Update state with interview data
          if (payload.success && payload.assumptions) {
            setLocalBuyerMapData(payload.assumptions);
            setUploadingInterviews(false);
            setCurrentStep(3);
            setUploaded(true);
            console.log('✅ Interview data integrated with buyer map');
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Conflict resolution error:', error);
      setProcessError(`Conflict resolution failed: ${error.message}`);
    }
  };

  const removeFile = (type: string, index: number | null = null) => {
    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: [] }));
    } else {
      setUploadedFiles(prev => ({
        ...prev,
        interviews: prev.interviews.filter((_, i) => i !== index)
      }));
    }
  };

  // Section filter
  const getFilteredDataBySection = (section: string): BuyerMapData[] => {
    const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    return allData.filter((item: BuyerMapData) => {
      const sectionInfo = getSectionInfo(item.icpAttribute);
      return sectionInfo.section === section;
    });
  };

  // Helper to check if interviews exist
  const hasInterviews = uploadedFiles.interviews.length > 0;

  // Trigger deck processing when deck files are uploaded
  useEffect(() => {
    if (uploadedFiles.deck.length > 0 && !uploaded) {
      // Deck processing happens in handleFileUpload for 'deck' type
      console.log('Deck files detected, processing handled in upload handler');
    }
  }, [uploadedFiles.deck, uploaded]);

  // Auto-advance to results when buyerMapData is provided
  useEffect(() => {
    const hasData = localBuyerMapData.length > 0 || buyerMapData.length > 0;
    if (hasData && currentStep < 3) {
      setCurrentStep(3);
      setUploaded(true);
      // Don't calculate score until interviews are processed
      // const dataToScore = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
      // const calculatedScore = calculateOverallScore(dataToScore);
      // setScore(calculatedScore);
    }
  }, [localBuyerMapData, buyerMapData, currentStep, setCurrentStep]);

  // Transform buyerMapData to validationInsights format for DetailedValidationCard
  const validationInsights = useMemo(() => {
    const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    const hasInterviews = uploadedFiles.interviews.length > 0;
    
    // Debug: Log data transformation
    console.log('🔄 validationInsights useMemo triggered:', {
      localBuyerMapDataLength: localBuyerMapData.length,
      buyerMapDataLength: buyerMapData.length,
      hasInterviews,
      allDataLength: allData.length,
      firstItemQuotes: allData[0]?.quotes?.length || 0,
      firstItemReality: allData[0]?.realityFromInterviews?.slice(0, 50) || 'none',
      // Enhanced debugging for quote data flow
      sampleQuoteData: allData[0]?.quotes?.[0] ? {
        hasText: !!allData[0].quotes[0].text,
        hasSpeaker: !!allData[0].quotes[0].speaker,
        hasRole: !!allData[0].quotes[0].role,
        quotesCount: allData[0].quotes.length
      } : 'no_quotes'
    });
    
    const insights = allData.map(item => {
      // Use the enhanced mapping function that includes confidence breakdown
      const validationData = mapBuyerMapToValidationData(item);
      
      // Type-safe outcome mapping for new validation statuses
      const mapOutcome = (outcome: string): 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' | 'Pending Validation' => {
        switch (outcome) {
          case 'Validated': return 'Validated';
          case 'Contradicted': return 'Contradicted';
          case 'Gap Identified': return 'Gap Identified';
          case 'Insufficient Data': return 'Insufficient Data';
          // Legacy fallback for old values
          case 'Aligned': return 'Validated';
          case 'Misaligned': return 'Contradicted';
          case 'Challenged': return 'Contradicted';
          case 'New Data Added': return 'Gap Identified';
          case 'Refined': return 'Gap Identified';
          default: return 'Pending Validation';
        }
      };
      
      return {
        id: item.id,
        icpAttribute: item.icpAttribute || '',
        title: item.v1Assumption || item.whyAssumption || '',
        // Only show actual outcome and confidence if interviews have been uploaded
        outcome: hasInterviews ? mapOutcome(item.comparisonOutcome || '') : 'Pending Validation',
        confidence: hasInterviews ? (item.confidenceScore || 0) : 0,
        confidenceExplanation: item.confidenceExplanation || '',
        reality: item.realityFromInterviews || '',
        quotes: (item.quotes || []).map((q, qIndex) => {
          // Enhanced debugging for quote mapping
          if (qIndex === 0) {
            console.log(`🔍 [QUOTES] Mapping first quote for assumption ${item.id}:`, {
              hasOriginalQuotes: !!(item.quotes && item.quotes.length > 0),
              originalQuoteStructure: q ? Object.keys(q) : 'no_quote',
              quotesArrayLength: item.quotes?.length || 0
            });
          }
          
          return {
            text: q.text || (q as any).quote || (q as any).quoteText || '',
            author: q.speaker || (q as any).author || (q as any).speakerName || 'Anonymous',
            role: q.role || (q as any).speakerRole || '',
            companySnapshot: q.companySnapshot || ''
          };
        }),
        // Include enhanced confidence breakdown
        confidenceBreakdown: hasInterviews ? validationData.confidenceBreakdown : undefined,
        isPending: !hasInterviews
      };
    });
    
    // Debug log to verify reality field mapping
    console.log('🔍 ValidationInsights transformation:');
    insights.forEach(insight => {
      console.log(`  Assumption ${insight.id}: outcome="${insight.outcome}", isPending=${insight.isPending}, reality="${insight.reality ? insight.reality.substring(0, 50) + '...' : 'EMPTY'}", hasConfidenceBreakdown=${!!insight.confidenceBreakdown}"`);
    });
    
    return insights;
  }, [localBuyerMapData, buyerMapData, uploadedFiles.interviews.length]);

  // Bypass logic for mock mode or when no data is available to show
  if (!uploaded && localBuyerMapData.length === 0 && buyerMapData.length === 0) {
    return <UploadComponent onComplete={() => {
      // Load mock data directly
      setLocalBuyerMapData(MOCK_BUYER_MAP_DATA);
      // Don't set score until interviews are processed (mock mode exception)
      if (isMock) {
        setScore(calculateOverallScore(MOCK_BUYER_MAP_DATA));
      }
      setCurrentStep(3);
      setUploaded(true);
    }} />;
  }

  // Main return with step indicator and step conditionals
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= step ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 2: Upload */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Materials</h2>
              <p className="text-white/70">We'll validate your ICP assumptions against interview data</p>
            </div>
            {processError && (
              <div className="text-center text-red-400 font-semibold mb-4">{processError}</div>
            )}
            <div className="border-2 border-dashed border-white/30 rounded-lg p-8 bg-white/5">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2 text-white">Sales Deck / Pitch Materials</h3>
                <p className="text-white/60 mb-4">Upload your current sales presentation</p>
                {uploadedFiles.deck.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{uploadedFiles.deck[0].name}</span>
                      <button onClick={() => removeFile('deck')} className="text-red-500 hover:text-red-700 text-xl">×</button>
                    </div>
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload('deck', e.target.files)} />
                  <div className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">Choose File</div>
                </label>
              </div>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2">Customer Interview Transcripts</h3>
                <p className="text-gray-500 mb-4">Upload up to 10 interview transcripts</p>
                {uploadedFiles.interviews.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {uploadedFiles.interviews.map((file, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{file.name}</span>
                          <button onClick={() => removeFile('interviews', index)} className="text-red-500 hover:text-red-700 text-xl">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className={uploadingInterviews ? "cursor-not-allowed" : "cursor-pointer"}>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept=".txt,.doc,.docx,.pdf" 
                    disabled={uploadingInterviews}
                    onChange={(e) => {
                      if (!uploadingInterviews) {
                        handleFileUpload('interviews', e.target.files);
                      }
                    }}
                  />
                  <div className={`px-6 py-2 rounded-lg inline-block transition-colors ${
                    uploadingInterviews 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}>
                    {uploadingInterviews ? 'Uploading...' : 'Add Interview Files'}
                  </div>
                </label>
              </div>
            </div>
            <div className="text-center">
              {/* Show different button states based on progress */}
              {!uploaded && uploadedFiles.deck.length === 0 && (
                <p className="text-gray-500 mb-4">Please upload a sales deck to get started</p>
              )}
              {!uploaded && uploadedFiles.deck.length > 0 && (
                <p className="text-blue-600 mb-4">Processing deck...</p>
              )}
              {uploaded && (
                <div>
                  <p className="text-green-600 mb-4">
                    ✅ Deck processed! 
                    {uploadedFiles.interviews.length > 0 
                      ? ` ${uploadedFiles.interviews.length} interview(s) added for validation.`
                      : ' Add interviews to validate assumptions.'
                    }
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    View Results
                  </button>
                  {uploadingInterviews && (
                    <div className="mt-4">
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <p className="text-blue-600">🚀 Uploading and processing interviews...</p>
                      </div>
                      <ProcessingTimeEstimate
                        interviewCount={uploadedFiles.interviews.length || 1}
                        isProcessing={uploadingInterviews}
                        currentStep={currentStep}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <div className="space-y-8" data-testid={isMock ? "mock-dashboard" : "validation-dashboard"}>
            {/* Show deck processed message when no interviews uploaded yet */}
            {uploadedFiles.interviews.length === 0 && !isMock && (
              <div className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-8 mb-8">
                <h2 className="text-xl font-medium mb-2">Deck Analysis Complete</h2>
                <p className="text-lg opacity-90 mb-4">Your assumptions have been extracted from the sales deck.</p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                  <h3 className="font-semibold mb-2">💡 Next Step: Add Customer Interviews</h3>
                  <p className="text-sm opacity-90 mb-3">
                    Upload interview transcripts to validate these assumptions with real customer data.
                  </p>
                  <div className="bg-blue-900/50 rounded-lg p-3 text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold">📋 Processing Guidelines:</span>
                    </div>
                    <ul className="space-y-1 text-xs opacity-90">
                      <li>• <strong>Recommended:</strong> 3-5 interviews for balanced insights</li>
                      <li>• <strong>Maximum:</strong> 10 interviews per upload batch</li>
                      <li>• <strong>Processing time:</strong> ~3-8 minutes depending on file count</li>
                      <li>• <strong>File types:</strong> .txt, .doc, .docx, .pdf</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/30"
                >
                  Add Interviews
                </button>
              </div>
            )}

            {/* Show interview processing status when interviews are uploaded */}
            {uploadedFiles.interviews.length > 0 && uploadingInterviews && (
              <div className="text-center bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl p-8 mb-8">
                <h2 className="text-xl font-medium mb-2">Processing {uploadedFiles.interviews.length} Interview{uploadedFiles.interviews.length > 1 ? 's' : ''}</h2>
                <p className="text-lg opacity-90 mb-4">
                  Extracting insights and validating assumptions...
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">Processing batch of {uploadedFiles.interviews.length} files</span>
                  </div>
                  <div className="text-xs opacity-90">
                    <p>✓ Files are processed in parallel for faster results</p>
                    <p>✓ Expected completion: ~{Math.ceil(uploadedFiles.interviews.length / 3) * 3} minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Show successful processing when interviews are complete */}
            {uploadedFiles.interviews.length > 0 && !uploadingInterviews && (
              <div className="text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 mb-8">
                <h2 className="text-xl font-medium mb-2">✅ Analysis Complete</h2>
                <p className="text-lg opacity-90">
                  {uploadedFiles.interviews.length} interview{uploadedFiles.interviews.length > 1 ? 's' : ''} processed and integrated with deck assumptions
                </p>
              </div>
            )}

            {/* Enhanced Overall Score Header with integrated navigation */}
            {/* Only show score after interviews have been uploaded and processed */}
            {score !== null && uploadedFiles.interviews.length > 0 && (
              <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-8">
                {/* Page Title */}
                <h2 className="text-xl font-medium mb-2 opacity-90">BuyerMap Validation Results</h2>
                {/* Overall Score */}
                <div className="text-6xl font-bold mb-2">{score}%</div>
                <h3 className="text-lg font-medium mb-4">Overall Alignment Score</h3>
                {/* Score Message */}
                <p className="text-lg opacity-90 mb-4">{getScoreMessage(score)}</p>
                
                {/* Score Breakdown */}
                <ScoreBreakdown
                  scoreBreakdown={scoreBreakdown}
                  outcomeWeights={outcomeWeights}
                  summary={summary}
                />

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    disabled={uploadingInterviews}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors border border-white/30 ${
                      uploadingInterviews 
                        ? 'bg-white/10 text-white/60 cursor-not-allowed' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {uploadingInterviews 
                      ? 'Uploading...' 
                      : uploadedFiles.interviews.length === 0 
                        ? 'Add Interviews' 
                        : 'Upload More Interviews'
                    }
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      handleFileUpload('interviews', e.target.files);
                    }}
                  />
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-white text-indigo-600 px-8 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Generate Report
                  </button>
                </div>
              </div>
            )}

            {/* Main Container with Glassmorphism */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-8">
              


              {/* WHO Section */}
              {getFilteredDataBySection("WHO").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    WHO • Target Customer Profile
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHO";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHAT Section */}
              {getFilteredDataBySection("WHAT").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-red-400" />
                    WHAT • Problems & Solutions
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHAT";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHEN Section */}
              {getFilteredDataBySection("WHEN").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-amber-400" />
                    WHEN • Purchase Triggers
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHEN";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHY & HOW Section */}
              {getFilteredDataBySection("WHY").length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-indigo-400" />
                    WHY & HOW • Barriers & Messaging
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHY";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* Fallback for uncategorized items */}
              {getFilteredDataBySection("OTHER").length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-gray-400" />
                    Other Insights
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "OTHER";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Export */}
        {currentStep === 4 && (
          <div className="text-center p-12">
            <h2 className="text-2xl font-bold text-white mb-4">Export Your BuyerMap Report</h2>
            <p className="text-white/70">Export functionality coming soon.</p>
          </div>
        )}
        </div>
      </div>
      
      {/* Interview Processing Overlay */}
      <InterviewProcessingOverlay
        isVisible={uploadingInterviews && interviewProcessing.phase === 'interview'}
        progress={interviewProcessing.progress}
        stats={interviewProcessing.stats}
        assumptions={localBuyerMapData.map(a => a.v1Assumption || '')}
        onComplete={() => {
          // Processing visualization completed, API call should finish soon
        }}
      />

      {/* File Conflict Dialog */}
      <FileConflictDialog
        isOpen={isDialogOpen}
        fileName={currentConflict?.fileName || ''}
        existingFileInfo={currentConflict?.existingFileInfo}
        onResolve={handleConflictResolve}
        onCancel={cancelConflict}
      />
    </div>
  );
};

export default ModernBuyerMapLanding; 