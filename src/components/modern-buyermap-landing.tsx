import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Building, Target, AlertCircle, Trophy, Zap, Shield, MessageSquare, Info, BarChart3, Upload, X, AlertTriangle, CheckCircle, Clock, Brain, FileText, Download, Plus
} from 'lucide-react';
import { BuyerMapData, ExampleQuote, Quote, ConfidenceBreakdown } from '../types/buyermap';
import DetailedValidationCard from './DetailedValidationCard';
import { mapBuyerMapToValidationData } from '../utils/mapToValidationData';
import UploadComponent from './UploadComponent';
import InterviewProcessingOverlay from '../app/components/loading/InterviewProcessingOverlay';
import { useProcessingProgress } from '../app/hooks/useProcessingProgress';
import ProcessVisualization from '../app/components/loading/ProcessVisualization';
import { upload, put } from '@vercel/blob/client';
import FileConflictDialog from './ui/FileConflictDialog';
import { useFileConflictHandler, type FileConflictResolution } from '../hooks/useFileConflictHandler';
import sampleBuyerMapData from '../mocks/sampleBuyerMapData.json';


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

// Add this transformation function
const transformAssumptionForCard = (assumption: any) => {
  // Prioritize keyFinding if present, otherwise use realityFromInterviews or reality
  const realityText = assumption?.keyFinding || assumption?.realityFromInterviews || assumption?.reality || '';
  const hasInterviewData = !!assumption?.realityFromInterviews || (assumption?.quotes && assumption?.quotes.length > 0);
  const parseOutcomeFromReality = (reality: string) => {
    if (!reality) return 'Pending Validation';
    const upperReality = reality.toUpperCase();
    if (upperReality.startsWith('GAP IDENTIFIED:') || upperReality.startsWith('- GAP IDENTIFIED:')) {
      return 'Gap Identified';
    } else if (upperReality.startsWith('VALIDATED:')) {
      return 'Validated';
    } else if (upperReality.startsWith('CONTRADICTED:')) {
      return 'Contradicted';
    } else if (upperReality.startsWith('INSUFFICIENT DATA:')) {
      return 'Insufficient Data';
    } else {
      if (upperReality.includes('GAP IDENTIFIED') || upperReality.includes('INSUFFICIENT DATA')) {
        return 'Gap Identified';
      } else if (upperReality.includes('VALIDATED')) {
        return 'Validated';
      } else if (upperReality.includes('CONTRADICTED')) {
        return 'Contradicted';
      }
      return 'Pending Validation';
    }
  };

  // If no interview data, always return Pending Validation
  const correctOutcome = hasInterviewData ? parseOutcomeFromReality(realityText) : 'Pending Validation';
  return {
    ...assumption,
    displayOutcome: correctOutcome,
    displayReality: hasInterviewData ? (realityText.replace(/^(GAP IDENTIFIED:|VALIDATED:|CONTRADICTED:|INSUFFICIENT DATA:|ALIGNED:|MISALIGNED:|CHALLENGED:|NEW DATA ADDED:|REFINED:)\s*/i, '') || 'Pending validation...') : 'Upload customer interviews to validate this assumption.',
    displayConfidence: assumption?.confidence || 0,
    _parsedFromReality: realityText?.substring(0, 50) + '...',
    _originalOutcome: assumption?.outcome,
    _correctedOutcome: correctOutcome
  };
};

interface ModernBuyerMapLandingProps {
  buyerMapData: BuyerMapData[];
  overallScore: number;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  initialInsights?: BuyerMapData[]; // Optional prop for testing/mock data
  onInterviewDataUpdated?: (data: BuyerMapData[]) => void; // Callback to notify parent of interview data updates
  lastInterviewResult?: any; // Last successful interview result for replay
  onReplayLastInterview?: () => void; // Function to replay last interview
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

const ModernBuyerMapLanding: React.FC<ModernBuyerMapLandingProps & { onInterviewUpload?: (files: FileList) => void }> = ({ 
  buyerMapData, 
  overallScore, 
  currentStep, 
  setCurrentStep,
  initialInsights,
  onInterviewDataUpdated,
  lastInterviewResult,
  onReplayLastInterview,
  onInterviewUpload
}) => {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  // Detect if we're in demo mode (when initialInsights is passed and matches demo data)
  const isDemoMode = initialInsights && initialInsights.length > 0 && 
    (initialInsights[0] as any)?.keyFinding && (initialInsights[0] as any)?.icpTheme === 'DTC Returns Management';
  
  // Debug logging for environment variable
  useEffect(() => {
    console.log('🔥 NEXT_PUBLIC_USE_MOCK is:', process.env.NEXT_PUBLIC_USE_MOCK);
    console.log('🔥 isMock boolean flag:', isMock);
    console.log('🔥 isDemoMode:', isDemoMode);
  }, [isMock, isDemoMode]);
  
  // Pick from real data or mocks - prioritize demo mode, then mock mode
  const initialLocalData = isDemoMode 
    ? (initialInsights as any)
    : isMock 
    ? (sampleBuyerMapData as any)
    : (initialInsights ?? buyerMapData ?? []);
  
  // If we have buyerMapData, it means deck was already processed, so set uploaded to true
  const [uploaded, setUploaded] = useState<boolean>(isDemoMode || isMock || (buyerMapData?.length ?? 0) > 0);
  
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
  const [processingOverlayVisible, setProcessingOverlayVisible] = useState(false);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localBuyerMapData, setLocalBuyerMapData] = useState<BuyerMapData[]>(initialLocalData);
  const [score, setScore] = useState<number | null>(isMock ? overallScore : null);
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, { score: number; outcome: string; weight: number }> | undefined>(undefined);
  const [outcomeWeights, setOutcomeWeights] = useState<Record<string, number> | undefined>(undefined);
  const [summary, setSummary] = useState<{ aligned: number; newData: number; misaligned: number; pending: number } | undefined>(undefined);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const interviewProcessing = useProcessingProgress();

  // Add file conflict handler
  const {
    currentConflict,
    isDialogOpen,
    checkFileExists,
    checkFilesForConflicts,
    resolveConflict,
    cancelConflict,
    setConflictsAndShow
  } = useFileConflictHandler();

  // Store files for conflict resolution
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [resultsSummary, setResultsSummary] = useState<string>('');

  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Add state to track if a session exists
  const [hasPersistedSession, setHasPersistedSession] = useState(false);
  const [localStorageRestored, setLocalStorageRestored] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [selectedInterviewsForAnalysis, setSelectedInterviewsForAnalysis] = useState<any[]>([]);
  const [interviewDataReady, setInterviewDataReady] = useState(false);
  // Add state for upload info popover
  const [showFileInfo, setShowFileInfo] = useState(false);

  // Debug logging moved to useEffect to prevent excessive re-renders
  useEffect(() => {
    console.log('🔍 ModernBuyerMapLanding received props:', {
      buyerMapDataLength: buyerMapData?.length || 0,
      overallScore,
      currentStep,
      initialInsightsLength: initialInsights?.length || 0,
      firstBuyerMapItem: buyerMapData?.[0],
      localBuyerMapDataLength: localBuyerMapData?.length || 0,
      hasInterviewDataInLocal: localBuyerMapData?.some((a: any) => a.quotes && a.quotes.length > 0) || false
    });
  }, [buyerMapData, overallScore, currentStep, initialInsights, localBuyerMapData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const buyerMapData = localStorage.getItem('buyerMapData');
      const interviewData = localStorage.getItem('interviewData');
      const selectedInterviews = localStorage.getItem('selectedInterviewsForAnalysis');
      
      setHasPersistedSession(!!buyerMapData && buyerMapData !== '[]');
      
      // Check for selected interviews from interview library
      if (selectedInterviews) {
        try {
          const parsedSelectedInterviews = JSON.parse(selectedInterviews);
          console.log('🔍 [SELECTED_INTERVIEWS] Found selected interviews in localStorage:', {
            count: parsedSelectedInterviews.length,
            interviews: parsedSelectedInterviews.map((i: any) => ({
              filename: i.filename,
              hasBlobUrl: !!i.blobUrl,
              blobUrl: i.blobUrl ? `${i.blobUrl.substring(0, 50)}...` : 'null'
            }))
          });
          
          setSelectedInterviewsForAnalysis(parsedSelectedInterviews);
          
          // Clear the localStorage to prevent re-triggering
          localStorage.removeItem('selectedInterviewsForAnalysis');
          
          // Trigger analysis of selected interviews
          if (parsedSelectedInterviews.length > 0) {
            console.log('🚀 [SELECTED_INTERVIEWS] Triggering analysis of selected interviews...');
            analyzeSelectedInterviews(parsedSelectedInterviews);
          }
        } catch (error) {
          console.error('❌ [SELECTED_INTERVIEWS] Failed to parse selected interviews:', error);
          localStorage.removeItem('selectedInterviewsForAnalysis');
        }
      }
      
      // Restore interview data if it exists
      if (interviewData) {
        try {
          const parsedInterviewData = JSON.parse(interviewData);
          console.log('🔄 [PERSISTENCE] Restoring interview data from localStorage:', {
            count: parsedInterviewData.length,
            hasQuotes: parsedInterviewData.some((a: any) => a.quotes && a.quotes.length > 0),
            sampleAssumption: parsedInterviewData[0] ? {
              assumption: parsedInterviewData[0].v1Assumption?.slice(0, 30),
              hasQuotes: !!(parsedInterviewData[0].quotes && parsedInterviewData[0].quotes.length > 0),
              quotesCount: parsedInterviewData[0].quotes?.length || 0,
              hasReality: !!parsedInterviewData[0].reality,
              reality: parsedInterviewData[0].reality?.slice(0, 50),
              hasValidationAttributes: !!parsedInterviewData[0].validationAttributes,
              validationReality: parsedInterviewData[0].validationAttributes?.[0]?.reality?.slice(0, 50)
            } : 'No data'
          });
          setLocalBuyerMapData(parsedInterviewData);
        } catch (error) {
          console.error('❌ [PERSISTENCE] Failed to parse interview data from localStorage:', error);
        }
      }
      
      // Mark localStorage restoration as complete
      setLocalStorageRestored(true);
    }
  }, []);

  // Function to analyze selected interviews from interview library
  const analyzeSelectedInterviews = async (selectedInterviews: any[]) => {
    console.log('🎙️ [SELECTED_INTERVIEWS] Starting analysis of selected interviews:', {
      count: selectedInterviews.length,
      interviews: selectedInterviews.map((i: any) => i.filename)
    });
    
    setUploadingInterviews(true);
    setProcessError(null);
    
    try {
      // Extract blob URLs from selected interviews
      const blobUrls = selectedInterviews
        .filter((interview: any) => interview.blobUrl) // Only include interviews with blob URLs
        .map((interview: any) => interview.blobUrl);
      
      if (blobUrls.length === 0) {
        throw new Error('No valid blob URLs found in selected interviews');
      }
      
      console.log('🔗 [SELECTED_INTERVIEWS] Extracted blob URLs:', blobUrls);
      
      // Start enhanced interview processing visualization
      const assumptionTexts = localBuyerMapData.map(a => a.v1Assumption || '');
      interviewProcessing.startInterviewProcessing(blobUrls.length, assumptionTexts);
      
      // Create a timeout for the analysis request (5 minutes)
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis request timed out after 5 minutes')), timeoutMs)
      );

      console.log(`⏰ [SELECTED_INTERVIEWS] Starting analysis with ${timeoutMs/1000}s timeout...`);
      
      const analysisPromise = fetch('http://localhost:3000/api/analyze-interviews', {
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
        console.error('❌ [SELECTED_INTERVIEWS] Analysis response error:', {
          status: analysisResponse.status,
          statusText: analysisResponse.statusText,
          body: errorText
        });
        throw new Error(`Analysis failed (${analysisResponse.status}): ${analysisResponse.statusText || errorText}`);
      }

      const payload = await analysisResponse.json();
      console.log('✅ [SELECTED_INTERVIEWS] Interview analysis completed:', payload);
      
      // Process assumptions and add interview data 
      const processedAssumptions = payload.assumptions.map((assumption: any) => ({
        ...assumption,
        // Use the realityFromInterviews field from API response
        reality: assumption.realityFromInterviews || assumption.reality || 'No interview data available for this assumption.',
        // Add quote count for debugging
        quotesCount: assumption.quotes?.length || 0,
        // Ensure we have interview data flag
        hasInterviewData: !!(assumption.quotes && assumption.quotes.length > 0)
      }));

      console.log('🔍 [SELECTED_INTERVIEWS] Processed assumptions with reality data:', {
        count: processedAssumptions.length,
        withReality: processedAssumptions.filter((a: any) => a.reality !== 'No interview data available for this assumption.').length,
        sampleRealityData: processedAssumptions[0]?.reality || 'No data',
        quoteCounts: processedAssumptions.map((a: any) => ({ 
          assumption: a.v1Assumption?.slice(0, 30), 
          quotes: a.quotesCount,
          hasData: a.hasInterviewData 
        }))
      });

      setLocalBuyerMapData(processedAssumptions);
      
      // Persist interview data to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('interviewData', JSON.stringify(processedAssumptions));
          // Also persist to backend for dashboard reliability
          fetch('/api/user-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: processedAssumptions })
          }).then(r => r.json()).then(r => {
            if (!r.success) console.warn('Failed to persist results to backend:', r.error);
          }).catch(e => console.warn('Failed to persist results to backend:', e));
        } catch (error) {
          console.error('❌ [PERSISTENCE] Failed to save interview data to localStorage:', error);
        }
      }
      
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
      
      // Mark interview data as ready after a short delay to ensure UI updates
      setTimeout(() => {
        setInterviewDataReady(true);
      }, 500);
      
      console.log('✅ [SELECTED_INTERVIEWS] Interview data integrated with buyer map');
      
      // Call the callback to notify parent component of updated data
      if (onInterviewDataUpdated && processedAssumptions) {
        // Create the correct data structure with validationAttributes properly mapped
        const updatedData = processedAssumptions.map((assumption: any) => ({
          ...assumption,
          validationAttributes: [{
            reality: assumption.realityFromInterviews || assumption.reality || "Pending validation...",
            outcome: assumption.realityFromInterviews ? "Validated" : "Gap Identified",
            confidence: assumption.confidenceScore || 85,
            quotes: assumption.quotes || [],
            confidence_explanation: assumption.confidenceExplanation || "Based on interview analysis"
          }]
        }));

        console.log('🚀 [SELECTED_INTERVIEWS] Calling onInterviewDataUpdated with CORRECT data:', {
          assumptionsCount: updatedData.length,
          sampleReality: updatedData[0]?.validationAttributes?.[0]?.reality,
          hasInterviewData: updatedData[0]?.validationAttributes?.[0]?.reality !== "Pending validation..."
        });
        
        onInterviewDataUpdated(updatedData);
      }
      
    } catch (error: any) {
      console.error('❌ [SELECTED_INTERVIEWS] Interview analysis error:', error);
      setProcessError(`Selected interview analysis failed: ${error.message}`);
      setIsProcessing(false);
      setUploadingInterviews(false);
      interviewProcessing.resetProcessing();
    } finally {
      setUploadingInterviews(false);
      interviewProcessing.resetProcessing();
    }
  };

  // Handler to resume last session
  const handleResumeSession = () => {
    if (typeof window !== 'undefined') {
      const buyerMapData = localStorage.getItem('buyerMapData');
      if (buyerMapData && buyerMapData !== '[]') {
        setLocalBuyerMapData(JSON.parse(buyerMapData));
        setUploaded(true);
        setCurrentStep(3);
      }
    }
  };

  // Auto-setup for mock mode
  useEffect(() => {
    if (!isMock) return;         // bail out immediately when mocks are OFF
    
    if (!uploaded) {
      // Simulate the upload completion and jump directly to results
      setUploaded(true);
      setCurrentStep(3);
      // Set mock score based on the mock data (mock mode exception)
      const mockScore = calculateOverallScore(sampleBuyerMapData as BuyerMapData[]);
      setScore(mockScore);
    }
  }, [isMock, uploaded, setCurrentStep]);

  // Add effect to log state changes
  useEffect(() => {
    // console.log('showUploadMore state changed:', showUploadMore);
  }, [showUploadMore]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Add debug logging for currentStep changes
  useEffect(() => {
    // console.log('currentStep changed:', currentStep);
  }, [currentStep]);

  // Add effect to log localBuyerMapData updates
  useEffect(() => {
    // console.log('localBuyerMapData updated:', localBuyerMapData);
  }, [localBuyerMapData]);

  // Sync localBuyerMapData with buyerMapData prop (but preserve interview data)
  useEffect(() => {
    // Only run sync after localStorage restoration is complete
    if (!localStorageRestored) return;
    
    if (buyerMapData && buyerMapData.length > 0) {
      // Check if we have interview data in the current localBuyerMapData
      const hasInterviewDataInLocal = localBuyerMapData.some(assumption => 
        assumption.quotes && assumption.quotes.length > 0
      );
      
      // Also check if we have interview data in localStorage that hasn't been loaded yet
      let hasInterviewDataInStorage = false;
      if (typeof window !== 'undefined') {
        const interviewData = localStorage.getItem('interviewData');
        if (interviewData) {
          try {
            const parsedInterviewData = JSON.parse(interviewData);
            hasInterviewDataInStorage = parsedInterviewData.some((a: any) => a.quotes && a.quotes.length > 0);
          } catch (error) {
            console.error('❌ [SYNC] Failed to parse interview data from localStorage:', error);
          }
        }
      }
      
      if (!hasInterviewDataInLocal && !hasInterviewDataInStorage) {
        console.log('🔄 [SYNC] Updating localBuyerMapData with buyerMapData (no interview data to preserve)');
      setLocalBuyerMapData(buyerMapData);
      } else {
        console.log('🔄 [SYNC] Preserving interview data in localBuyerMapData (not overwriting with buyerMapData)', {
          hasInterviewDataInLocal,
          hasInterviewDataInStorage
        });
      }
    }
  }, [buyerMapData, localBuyerMapData, localStorageRestored]);

  // Add this logic to detect if interviews have been uploaded
  const hasInterviewData = useMemo(() => {
    const data = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    if (!data?.length) return false;
    
    const result = data.some(assumption => {
      const hasQuotes = assumption.quotes && assumption.quotes.length > 0;
      const hasRealValidation = assumption.reality && 
        assumption.reality !== 'Pending validation...' &&
        !assumption.reality.startsWith('Pending');
      const hasValidationData = assumption.validationAttributes?.[0]?.reality &&
        assumption.validationAttributes[0].reality !== 'Pending validation...' &&
        !assumption.validationAttributes[0].reality.startsWith('Pending');
      
      return hasQuotes || hasRealValidation || hasValidationData;
    });
    
    return result;
  }, [localBuyerMapData, buyerMapData]);

  // Memoized data processing - moved outside conditional blocks
  const whoAssumptions = useMemo(() => {
    return localBuyerMapData
      .filter(assumption => {
        const attribute = assumption.icpAttribute?.toLowerCase() || '';
        return attribute.includes('buyer') || attribute.includes('title') || attribute.includes('decision maker') ||
               attribute.includes('company') || attribute.includes('size') || attribute.includes('firm');
      })
      .map(transformAssumptionForCard);
  }, [localBuyerMapData]);

  const whatAssumptions = useMemo(() => {
    return localBuyerMapData
      .filter(assumption => {
        const attribute = assumption.icpAttribute?.toLowerCase() || '';
        return attribute.includes('pain') || attribute.includes('problem') || attribute.includes('challenge') ||
               attribute.includes('desired') || attribute.includes('outcome') || attribute.includes('goal');
      })
      .map(transformAssumptionForCard);
  }, [localBuyerMapData]);

  const whenAssumptions = useMemo(() => {
    return localBuyerMapData
      .filter(assumption => {
        const attribute = assumption.icpAttribute?.toLowerCase() || '';
        return attribute.includes('trigger') || attribute.includes('timing') || attribute.includes('when');
      })
      .map(transformAssumptionForCard);
  }, [localBuyerMapData]);

  const whyAssumptions = useMemo(() => {
    return localBuyerMapData
      .filter(assumption => {
        const attribute = assumption.icpAttribute?.toLowerCase() || '';
        return attribute.includes('barrier') || attribute.includes('objection') || attribute.includes('concern') ||
               attribute.includes('messaging') || attribute.includes('communication') || attribute.includes('emphasis');
      })
      .map(transformAssumptionForCard);
  }, [localBuyerMapData]);

  const otherAssumptions = useMemo(() => {
    return localBuyerMapData
      .filter(assumption => {
        const attribute = assumption.icpAttribute?.toLowerCase() || '';
        return !(attribute.includes('buyer') || attribute.includes('title') || attribute.includes('decision maker') ||
                attribute.includes('company') || attribute.includes('size') || attribute.includes('firm') ||
                attribute.includes('pain') || attribute.includes('problem') || attribute.includes('challenge') ||
                attribute.includes('desired') || attribute.includes('outcome') || attribute.includes('goal') ||
                attribute.includes('trigger') || attribute.includes('timing') || attribute.includes('when') ||
                attribute.includes('barrier') || attribute.includes('objection') || attribute.includes('concern') ||
                attribute.includes('messaging') || attribute.includes('communication') || attribute.includes('emphasis'));
      })
      .map(transformAssumptionForCard);
  }, [localBuyerMapData]);

  // Add this before rendering the main results UI
  const summaryCounts = useMemo(() => {
    let validated = 0, gaps = 0, pending = 0;
    localBuyerMapData.forEach((a: any) => {
      const outcome = a.displayOutcome;
      if (outcome === 'Validated') validated++;
      else if (outcome === 'Gap Identified') gaps++;
      else pending++;
    });
    return { validated, gaps, pending };
  }, [localBuyerMapData]);

  // Debug log for transformation
  useEffect(() => {
    if (buyerMapData && buyerMapData.length > 0) {
      console.log('🔍 PARSING TEST:', {
        reality: buyerMapData[0]?.reality,
        originalOutcome: (buyerMapData[0] as any)?.outcome,
        parsedOutcome: transformAssumptionForCard(buyerMapData[0])?.displayOutcome
      });
    }
  }, [buyerMapData]);

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

      const file = files[0];
      console.log(`📊 [BLOB] Processing deck: ${file.name}`);
      
      // Step 1: Check for file conflicts with enhanced handling
      const conflict = await checkFileExists(file.name);
      
      let blobUrl: string | null = null;
      let shouldUpload = true;
      
      if (conflict) {
        console.log(`🔍 [BLOB] Deck conflict detected for "${file.name}"`);
        
        // Set up conflict for resolution
        setConflictsAndShow([conflict]);
        
        // Wait for user resolution
        return new Promise<void>((resolve, reject) => {
          const handleResolution = async (resolution: FileConflictResolution) => {
            try {
              let processFile = file; // Create mutable reference
              
              switch (resolution.action) {
                case 'use-existing':
                  console.log(`🔄 [BLOB] Using existing deck: ${resolution.url}`);
                  blobUrl = resolution.url!;
                  shouldUpload = false;
                  break;
                case 'overwrite':
                  console.log(`🔄 [BLOB] User chose to overwrite deck: ${file.name}`);
                  shouldUpload = true;
                  break;
                case 'rename':
                  console.log(`🔄 [BLOB] User chose to rename deck: ${resolution.fileName}`);
                  // Update file name for upload
                  processFile = new File([file], resolution.fileName, { type: file.type });
                  shouldUpload = true;
                  break;
              }
              
              // Continue with upload process
              await continueProcessDeck(processFile, blobUrl, shouldUpload);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          
          // Store resolution handler for conflict dialog
          (window as any).deckConflictResolver = handleResolution;
        });
      } else {
        console.log(`📁 [BLOB] Deck "${file.name}" doesn't exist, proceeding with upload`);
        await continueProcessDeck(file, blobUrl, shouldUpload);
      }
      
    } catch (err) {
      console.error('❌ Deck upload error', err);
      setProcessError(`Deck processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Continue deck processing after conflict resolution
  const continueProcessDeck = async (file: File, existingBlobUrl: string | null, shouldUpload: boolean) => {
    try {
      let blobUrl = existingBlobUrl;
      
      // Upload the deck if needed
      if (shouldUpload && !blobUrl) {
        const { upload } = await import('@vercel/blob/client');
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload-deck',
          clientPayload: JSON.stringify({ 
            allowOverwrite: true // Allow overwrite when explicitly chosen
          }),
        });
        
        console.log(`✅ [BLOB] Deck uploaded:`, blob.url);
        blobUrl = blob.url;
      }

      // Step 2: Send blob URL to analysis API
      console.log('📊 [BLOB] Sending deck blob URL to analysis API...');
      const res = await fetch('http://localhost:3000/api/analyze-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blobUrl,
          filename: file.name
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Deck analysis failed: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Deck analysis completed:', data);
      
      // Check if analysis was cached
      if (data.cached) {
        console.log(`⚡ Analysis retrieved from cache (content hash: ${data.contentHash})`);
      } else {
        console.log(`🆕 New analysis completed and stored in RAG system`);
      }
      
      // Update local state with deck analysis results
      if (data.assumptions) {
        setLocalBuyerMapData(data.assumptions);
      }
      
      setUploaded(true);
      setCurrentStep(3);
      
      // After setLocalBuyerMapData(processedAssumptions); and related updates
      console.log('🔍 AFTER INTEGRATION - buyerMapData state:', buyerMapData);
      console.log('🔍 Sample reality:', buyerMapData?.[0]?.validationAttributes?.[0]?.reality);
      
      if (onInterviewDataUpdated) {
        onInterviewDataUpdated(data.assumptions);
      }
      
    } catch (err) {
      console.error('❌ Deck processing error', err);
      setProcessError(`Deck processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add this before the handleFileUpload function
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/test-auth');
      const data = await response.json();
      console.log('🔐 [AUTH] Current auth status:', data);
      setAuthStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
      return data.authenticated;
    } catch (error) {
      console.error('❌ [AUTH] Failed to check auth status:', error);
      setAuthStatus('unauthenticated');
      return false;
    }
  };

  // File upload handlers
  const handleFileUpload = async (type: 'deck' | 'interviews', files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log(`handleFileUpload called with:`, { type, files });

    // Check authentication before proceeding
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
      alert('Please log in to upload files. You will be redirected to the login page.');
      // You could redirect to login here if needed
      return;
    }

    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: Array.from(files) }));
      await handleProcessDeck(Array.from(files));
    } else if (type === 'interviews') {
      const filesArray = Array.from(files);
      console.log(`Processing new files:`, filesArray.map(f => f.name));
      
      // PHASE 1.1: Implement 5-interview limit for optimal quality
      const maxInterviewsPerBatch = 5; // Reduced from 10 to 5 for better quality
      
      if (filesArray.length > maxInterviewsPerBatch) {
        const excessCount = filesArray.length - maxInterviewsPerBatch;
        const allowedFiles = filesArray.slice(0, maxInterviewsPerBatch);
        
        // Enhanced user feedback with clear reasoning
        const message = `📊 Interview Upload Limit Applied

✅ Processing ${allowedFiles.length} interviews (optimal batch size for quality)
⚠️ Skipped ${excessCount} additional files to prevent processing issues

💡 Why this limit?
• Better quote extraction quality
• Faster processing and feedback
• Prevents system timeouts
• More reliable results

🔄 Next steps:
• These ${allowedFiles.length} interviews will be processed now
• Upload the remaining ${excessCount} interviews after this batch completes
• All interviews will be stored in your Interview Library for future analysis`;
        
        alert(message);
        
        // Process only the allowed files
        setUploadedFiles(prev => ({ ...prev, interviews: allowedFiles }));
        await processInterviewBatch(allowedFiles);
        } else {
        // Process all files if within limit
        setUploadedFiles(prev => ({ ...prev, interviews: filesArray }));
        await processInterviewBatch(filesArray);
        }
      }
  };

  // PHASE 1.1: Extract interview processing logic for better organization
  const processInterviewBatch = async (filesArray: File[]) => {
      console.log('🎙️ [BLOB] Starting interview upload process for', filesArray.length, 'files');
      setUploadingInterviews(true);
      setProcessError(null);
    
    // Track upload start time for processing time calculation
    const uploadStartTime = performance.now();
    
    // PHASE 1.2: Enhanced logging for contribution tracking
    console.log('📊 [CONTRIBUTION] Starting contribution tracking for batch:', {
      fileCount: filesArray.length,
      fileNames: filesArray.map(f => f.name),
      assumptionCount: localBuyerMapData.length,
      assumptions: localBuyerMapData.map(a => a.v1Assumption?.slice(0, 50))
    });
      
      // Store files for conflict resolution
      setPendingFiles(filesArray);
      
      // Start enhanced interview processing visualization
      const assumptionTexts = localBuyerMapData.map(a => a.v1Assumption || '');
      interviewProcessing.startInterviewProcessing(filesArray.length, assumptionTexts);
      
      try {
        console.log('🚀 [BLOB] Processing interview files without duplicate checking...');
        
        // Skip duplicate checking - process all files
        const filesToProcess = filesArray;
        
        // Step 1: Check for file conflicts BEFORE starting any uploads
        console.log('🔍 [BLOB] Checking for file conflicts...');
        const { conflictFiles, clearFiles } = await checkFilesForConflicts(filesToProcess);
      
        console.log(`📊 [BLOB] Conflict check results: ${conflictFiles.length} conflicts, ${clearFiles.length} clear files`);

      // Step 2: Check for duplicates BEFORE uploading to blob storage
      console.log('🔍 [FILE_TRACKING] Checking for duplicates before blob upload...');
      const filesToUpload: File[] = [];
      const duplicateFiles: { file: File; existingFile: any }[] = [];
      const blobUrls: string[] = []; // Move declaration here
      const existingAnalysisResults: any[] = []; // Store existing analysis results
      
      for (const file of clearFiles) {
        try {
          // Convert file to base64 for content hash generation
          const fileBuffer = await file.arrayBuffer();
          const fileContent = Buffer.from(fileBuffer).toString('base64');
          
          // Check for duplicates using the API
          const duplicateCheckResponse = await fetch('http://localhost:3000/api/save-interview-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileSize: file.size,
              blobUrl: '', // Will be set after upload
              fileContent: fileContent
            })
          });
          
          if (duplicateCheckResponse.ok) {
            const duplicateResult = await duplicateCheckResponse.json();
            
            if (duplicateResult.isDuplicate) {
              console.log('🔄 [FILE_TRACKING] Duplicate detected before upload:', file.name);
              duplicateFiles.push({ file, existingFile: duplicateResult.existingFile });
              
              // Check if the existing file has analysis results
              const hasAnalysisResults = duplicateResult.existingFile.analysis_results && 
                Object.keys(duplicateResult.existingFile.analysis_results).length > 0;
              
              let message = `📁 "${file.name}" has already been analyzed.\n\n`;
              
              if (hasAnalysisResults) {
                message += `✅ This file has existing analysis results.\n\n` +
                  `Would you like to:\n` +
                  `• Click "OK" to use existing results\n` +
                  `• Click "Cancel" to skip this file\n\n` +
                  `Existing file: ${duplicateResult.existingFile.filename}\n` +
                  `Uploaded: ${new Date(duplicateResult.existingFile.upload_date).toLocaleDateString()}`;
              } else {
                message += `⚠️ This file was uploaded before but doesn't have analysis results stored.\n\n` +
                  `Would you like to:\n` +
                  `• Click "OK" to re-analyze this file (recommended)\n` +
                  `• Click "Cancel" to skip this file\n\n` +
                  `Existing file: ${duplicateResult.existingFile.filename}\n` +
                  `Uploaded: ${new Date(duplicateResult.existingFile.upload_date).toLocaleDateString()}`;
              }
              
              const useExisting = confirm(message);
              
              if (useExisting) {
                console.log('✅ [FILE_TRACKING] User chose to use existing file:', file.name);
                // Add the existing file's blob URL to the processing list
                if (duplicateResult.existingFile.blob_url) {
                  blobUrls.push(duplicateResult.existingFile.blob_url);
                  // Store the existing analysis result if available
                  if (hasAnalysisResults) {
                    existingAnalysisResults.push(duplicateResult.existingFile.analysis_results);
                    console.log('💾 [DUPLICATE] Found existing analysis results for:', file.name);
                  } else {
                    console.log('⚠️ [DUPLICATE] No existing analysis results found for:', file.name);
                    // If no analysis results, we'll need to re-analyze
                    // Remove from blobUrls since we'll process it as a new file
                    blobUrls.pop();
                    filesToUpload.push(file);
                  }
                }
              } else {
                console.log('⏭️ [FILE_TRACKING] User chose to skip file:', file.name);
              }
            } else {
              // No duplicate, add to upload list
              filesToUpload.push(file);
            }
          } else {
            // Check if it's a conflict error
            if (duplicateCheckResponse.status === 409) {
              const conflictMessage = `⚠️ "${file.name}" conflicts with an existing file.\n\nPlease rename the file or choose a different one.`;
              alert(conflictMessage);
            } else {
              console.warn('⚠️ [FILE_TRACKING] Failed to check for duplicates:', await duplicateCheckResponse.text());
              // Continue with upload anyway
              filesToUpload.push(file);
            }
          }
        } catch (error) {
          console.error('❌ [FILE_TRACKING] Error checking for duplicates:', error);
          // Continue with upload anyway
          filesToUpload.push(file);
        }
      }

      console.log(`📊 [FILE_TRACKING] Duplicate check results: ${duplicateFiles.length} duplicates, ${filesToUpload.length} files to upload`);

      // Step 3: Upload only non-duplicate files to blob storage
      if (filesToUpload.length > 0) {
        console.log(`✅ [BLOB] Uploading ${filesToUpload.length} files without duplicates`);
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          console.log(`🎙️ [BLOB] Uploading file ${i + 1}/${filesToUpload.length}:`, file.name);
            
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
          
          // Save interview record to database with blob URL
          try {
            console.log('💾 [DATABASE] About to save interview record for:', file.name);
            
            // Convert file to base64 for content hash generation
            const fileBuffer = await file.arrayBuffer();
            const fileContent = Buffer.from(fileBuffer).toString('base64');
            
            console.log('💾 [DATABASE] Save request data:', {
              filename: file.name,
              fileSize: file.size,
              blobUrl: blob.url.substring(0, 50) + '...',
              hasFileContent: !!fileContent
            });
            
            console.log('💾 [DATABASE] Making fetch request to /api/save-interview-record...');
            const saveResponse = await fetch('http://localhost:3000/api/save-interview-record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: file.name,
                fileSize: file.size,
                blobUrl: blob.url,
                fileContent: fileContent
              })
            });
            
            console.log('💾 [DATABASE] Save response received:', {
              status: saveResponse.status,
              statusText: saveResponse.statusText,
              ok: saveResponse.ok
            });
            
            if (saveResponse.ok) {
              const saveResult = await saveResponse.json();
              console.log('💾 [DATABASE] Interview record saved successfully:', saveResult);
            } else {
              const errorText = await saveResponse.text();
              console.warn('⚠️ [DATABASE] Failed to save interview record:', errorText);
            }
          } catch (error) {
            console.error('❌ [DATABASE] Error saving interview record:', error);
          }
            
            blobUrls.push(blob.url);
          }
        }

      // Step 4: Process all files (new uploads + existing duplicates)
      if (blobUrls.length > 0) {
        console.log(`🚀 [BLOB] Processing ${blobUrls.length} interview files...`);
        
        // If we have existing analysis results, use them instead of re-analyzing
        if (existingAnalysisResults.length > 0 && existingAnalysisResults.length === blobUrls.length) {
          console.log('🔄 [DUPLICATE] Using existing analysis results for all files');
          
          // Get the most recent analysis result (they should all be the same for duplicates)
          const existingResult = existingAnalysisResults[0];
          
          if (existingResult && existingResult.assumptions) {
            console.log('🔍 [DUPLICATE] Found existing analysis with assumptions:', existingResult.assumptions.length);
          
            // Use the existing analysis results directly
            const processedAssumptions = existingResult.assumptions.map((assumption: any) => ({
              ...assumption,
              // Use the realityFromInterviews field from existing analysis
              reality: assumption.realityFromInterviews || assumption.reality || 'No interview data available for this assumption.',
              // Add quote count for debugging
              quotesCount: assumption.quotes?.length || 0,
              // Ensure we have interview data flag
              hasInterviewData: !!(assumption.quotes && assumption.quotes.length > 0)
            }));

            console.log('🔍 [DUPLICATE] Processed existing assumptions:', {
              count: processedAssumptions.length,
              withQuotes: processedAssumptions.filter((a: any) => a.quotes && a.quotes.length > 0).length,
              withReality: processedAssumptions.filter((a: any) => a.reality !== 'No interview data available for this assumption.').length
            });

            setLocalBuyerMapData(processedAssumptions);
            
            // Persist interview data to localStorage
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('interviewData', JSON.stringify(processedAssumptions));
                // Also persist to backend for dashboard reliability
                fetch('/api/user-results', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ results: processedAssumptions })
                }).then(r => r.json()).then(r => {
                  if (!r.success) console.warn('Failed to persist results to backend:', r.error);
                }).catch(e => console.warn('Failed to persist results to backend:', e));
              } catch (error) {
                console.error('❌ [PERSISTENCE] Failed to save interview data to localStorage:', error);
              }
        }

            // Update score if available
            if (existingResult.overallAlignmentScore) {
              setScore(existingResult.overallAlignmentScore);
            }
            
            // Update score breakdown data if available
            if (existingResult.scoreBreakdown) {
              setScoreBreakdown(existingResult.scoreBreakdown.breakdown);
              setOutcomeWeights(existingResult.scoreBreakdown.outcomeWeights);
              setSummary(existingResult.scoreBreakdown.summary);
            }
            
            setUploadingInterviews(false);
            interviewProcessing.resetProcessing();
            setCurrentStep(3);
            setUploaded(true);
            
            // Mark interview data as ready after a short delay to ensure UI updates
            setTimeout(() => {
              setInterviewDataReady(true);
            }, 500);
            
            console.log('✅ [DUPLICATE] Existing interview data integrated with buyer map');
            
            // Call the callback to notify parent component of updated data
            if (onInterviewDataUpdated && processedAssumptions) {
              const updatedData = processedAssumptions.map((assumption: any) => ({
                ...assumption,
                validationAttributes: [{
                  reality: assumption.realityFromInterviews || assumption.reality || "Pending validation...",
                  outcome: assumption.realityFromInterviews ? "Validated" : "Gap Identified",
                  confidence: assumption.confidenceScore || 85,
                  quotes: assumption.quotes || [],
                  confidence_explanation: assumption.confidenceExplanation || "Based on interview analysis"
                }]
              }));
              
              onInterviewDataUpdated(updatedData);
            }
            
            return; // Exit early since we used existing results
          } else {
            console.log('⚠️ [DUPLICATE] Existing analysis result is missing or invalid, proceeding with re-analysis');
          }
        }
          
          // Update progress indicator
          const resetProgress = interviewProcessing.startInterviewProcessing(blobUrls.length, localBuyerMapData.map(d => d.v1Assumption));
          // Note: The progress will be automatically managed by the processing hooks
          
          // Create a timeout for the analysis request (5 minutes)
          const timeoutMs = 5 * 60 * 1000; // 5 minutes
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Analysis request timed out after 5 minutes')), timeoutMs)
          );

          console.log(`⏰ [BLOB] Starting analysis with ${timeoutMs/1000}s timeout...`);
          
        const analysisPromise = fetch('http://localhost:3000/api/analyze-interviews', {
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
        
        // PHASE 1.2: Enhanced logging for contribution tracking
        console.log('📊 [CONTRIBUTION] Analysis results summary:', {
          totalFiles: filesArray.length,
          processedFiles: blobUrls.length,
          totalQuotes: Object.values(payload.assumptions || {}).reduce((sum: number, assumption: any) => sum + (assumption.quotes?.length || 0), 0),
          assumptionsWithQuotes: (payload.assumptions || []).filter((a: any) => a.quotes && a.quotes.length > 0).length,
          totalAssumptions: localBuyerMapData.length
        });
        
        // Update interview records in database with analysis results
        for (let i = 0; i < filesArray.length; i++) {
          const file = filesArray[i];
          const totalQuotes = Object.values(payload.assumptions || {}).reduce((sum: number, assumption: any) => {
            return sum + (assumption.quotes?.filter((q: any) => q.source === file.name)?.length || 0);
          }, 0);
          
          const uniqueSpeakers = new Set();
          Object.values(payload.assumptions || {}).forEach((assumption: any) => {
            assumption.quotes?.forEach((q: any) => {
              if (q.source === file.name && q.speaker) {
                uniqueSpeakers.add(q.speaker);
              }
            });
          });
          
          try {
            const updateResponse = await fetch('http://localhost:3000/api/update-interview-record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: file.name,
                quotesExtracted: totalQuotes,
                processingTime: Math.round((performance.now() - uploadStartTime) / 1000), // Approximate processing time
                uniqueSpeakers: Array.from(uniqueSpeakers),
                vectorsStored: 1, // Assuming 1 vector per interview for now
                status: 'completed',
                analysisResults: payload // Store the full analysis results
              })
            });
            
            if (updateResponse.ok) {
              const updateResult = await updateResponse.json();
              console.log('🔄 [DATABASE] Interview record updated:', updateResult.interviewId);
            } else {
              console.warn('⚠️ [DATABASE] Failed to update interview record:', await updateResponse.text());
            }
          } catch (error) {
            console.error('❌ [DATABASE] Error updating interview record:', error);
          }
        }
          
          // Process assumptions and add interview data 
          const processedAssumptions = payload.assumptions.map((assumption: any) => ({
            ...assumption,
            // Use the realityFromInterviews field from API response
            reality: assumption.realityFromInterviews || assumption.reality || 'No interview data available for this assumption.',
            // Add quote count for debugging
            quotesCount: assumption.quotes?.length || 0,
            // Ensure we have interview data flag
            hasInterviewData: !!(assumption.quotes && assumption.quotes.length > 0)
          }));

          console.log('🔍 [DEBUG] Processed assumptions with reality data:', {
            count: processedAssumptions.length,
            withReality: processedAssumptions.filter((a: any) => a.reality !== 'No interview data available for this assumption.').length,
            sampleRealityData: processedAssumptions[0]?.reality || 'No data',
            quoteCounts: processedAssumptions.map((a: any) => ({ 
              assumption: a.v1Assumption?.slice(0, 30), 
              quotes: a.quotesCount,
              hasData: a.hasInterviewData 
            }))
          });

          setLocalBuyerMapData(processedAssumptions);
        
        // Persist interview data to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('interviewData', JSON.stringify(processedAssumptions));
            // Also persist to backend for dashboard reliability
            fetch('/api/user-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ results: processedAssumptions })
            }).then(r => r.json()).then(r => {
              if (!r.success) console.warn('Failed to persist results to backend:', r.error);
            }).catch(e => console.warn('Failed to persist results to backend:', e));
          } catch (error) {
            console.error('❌ [PERSISTENCE] Failed to save interview data to localStorage:', error);
          }
        }
        
        // Debug logging for processed assumptions
        console.log('🔍 [DEBUG] Processed assumptions after analysis:', {
          count: processedAssumptions.length,
          withQuotes: processedAssumptions.filter((a: any) => a.quotes && a.quotes.length > 0).length,
          withReality: processedAssumptions.filter((a: any) => a.reality && a.reality !== 'No interview data available for this assumption.').length,
          sampleAssumption: processedAssumptions[0] ? {
            assumption: processedAssumptions[0].v1Assumption?.slice(0, 50),
            quotesCount: processedAssumptions[0].quotes?.length || 0,
            reality: processedAssumptions[0].reality?.slice(0, 100),
            hasInterviewData: processedAssumptions[0].hasInterviewData
          } : 'No assumptions'
        });
          
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
        
        // Mark interview data as ready after a short delay to ensure UI updates
        setTimeout(() => {
          setInterviewDataReady(true);
        }, 500);
        
          console.log('✅ Interview data integrated with buyer map');
          
          // Call the callback to notify parent component of updated data
          if (onInterviewDataUpdated && processedAssumptions) {
            // Create the correct data structure with validationAttributes properly mapped
            const updatedData = processedAssumptions.map((assumption: any) => ({
              ...assumption,
              validationAttributes: [{
                reality: assumption.realityFromInterviews || assumption.reality || "Pending validation...",
                outcome: assumption.realityFromInterviews ? "Validated" : "Gap Identified",
                confidence: assumption.confidenceScore || 85,
                quotes: assumption.quotes || [],
                confidence_explanation: assumption.confidenceExplanation || "Based on interview analysis"
              }]
            }));

            console.log('🚀 [DEBUG] Calling onInterviewDataUpdated with CORRECT data:', {
              assumptionsCount: updatedData.length,
              sampleReality: updatedData[0]?.validationAttributes?.[0]?.reality,
              hasInterviewData: updatedData[0]?.validationAttributes?.[0]?.reality !== "Pending validation..."
            });
            
            onInterviewDataUpdated(updatedData);
          }
        }

      } catch (error: any) {
        console.error('❌ Interview upload error:', error);
        setProcessError(`Interview upload failed: ${error.message}`);
      setIsProcessing(false);
      setUploadingInterviews(false);
      interviewProcessing.resetProcessing();
      // Optionally, set a UI error state here
      } finally {
        setUploadingInterviews(false);
        interviewProcessing.resetProcessing();
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
          console.log(`♻️ [BLOB] Using existing file: ${resolution.url}`);
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
        
        // Save interview record to database for conflict resolution
        try {
          // Convert file to base64 for content hash generation
          const fileBuffer = await originalFile.arrayBuffer();
          const fileContent = Buffer.from(fileBuffer).toString('base64');
          
          const saveResponse = await fetch('http://localhost:3000/api/save-interview-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: currentConflict.fileName,
              fileSize: originalFile.size,
              blobUrl: resultUrl,
              fileContent: fileContent // Pass file content for enhanced duplicate detection
            })
          });
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('💾 [DATABASE] Interview record saved (conflict resolution):', saveResult.interviewId);
            
            // Check if this was a duplicate
            if (saveResult.isDuplicate) {
              console.log('🔄 [FILE_TRACKING] Duplicate detected during conflict resolution:', saveResult.existingFile);
              
              // Show user-friendly duplicate message
              const duplicateMessage = `📁 "${currentConflict.fileName}" has already been analyzed.\n\nThis file was previously uploaded and processed. You can find the results in your Interview Library.`;
              alert(duplicateMessage);
              
              // Don't process this duplicate file
              return;
            }
          } else {
            console.warn('⚠️ [DATABASE] Failed to save interview record (conflict resolution):', await saveResponse.text());
          }
        } catch (error) {
          console.error('❌ [DATABASE] Error saving interview record (conflict resolution):', error);
        }
        
        // Process the resolved file with timeout protection
        const timeoutMs = 5 * 60 * 1000; // 5 minutes
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Single file analysis timed out after 5 minutes')), timeoutMs)
        );

        const analysisPromise = fetch('http://localhost:3000/api/analyze-interviews', {
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
          
          // Process assumptions and add interview data 
          const processedAssumptions = payload.assumptions.map((assumption: any) => ({
            ...assumption,
            // Use the realityFromInterviews field from API response
            reality: assumption.realityFromInterviews || assumption.reality || 'No interview data available for this assumption.',
            // Add quote count for debugging
            quotesCount: assumption.quotes?.length || 0,
            // Ensure we have interview data flag
            hasInterviewData: !!(assumption.quotes && assumption.quotes.length > 0)
          }));

          console.log('🔍 [DEBUG] Processed assumptions with reality data:', {
            count: processedAssumptions.length,
            withReality: processedAssumptions.filter((a: any) => a.reality !== 'No interview data available for this assumption.').length,
            sampleRealityData: processedAssumptions[0]?.reality || 'No data',
            quoteCounts: processedAssumptions.map((a: any) => ({ 
              assumption: a.v1Assumption?.slice(0, 30), 
              quotes: a.quotesCount,
              hasData: a.hasInterviewData 
            }))
          });

          setLocalBuyerMapData(processedAssumptions);
          setUploadingInterviews(false);
          setCurrentStep(3);
          setUploaded(true);
          console.log('✅ Interview data integrated with buyer map');
          
          // Persist interview data to localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('interviewData', JSON.stringify(processedAssumptions));
              console.log('💾 [PERSISTENCE] Saved interview data to localStorage (conflict resolution):', {
                count: processedAssumptions.length,
                withQuotes: processedAssumptions.filter((a: any) => a.quotes && a.quotes.length > 0).length
              });
            } catch (error) {
              console.error('❌ [PERSISTENCE] Failed to save interview data to localStorage:', error);
            }
          }
          
          // Call the callback to notify parent component of updated data
          if (onInterviewDataUpdated && processedAssumptions) {
            // Create the correct data structure with validationAttributes properly mapped
            const updatedData = processedAssumptions.map((assumption: any) => ({
              ...assumption,
              validationAttributes: [{
                reality: assumption.realityFromInterviews || assumption.reality || "Pending validation...",
                outcome: assumption.realityFromInterviews ? "Validated" : "Gap Identified",
                confidence: assumption.confidenceScore || 85,
                quotes: assumption.quotes || [],
                confidence_explanation: assumption.confidenceExplanation || "Based on interview analysis"
              }]
            }));

            console.log('🚀 [DEBUG] Calling onInterviewDataUpdated with CORRECT data:', {
              assumptionsCount: updatedData.length,
              sampleReality: updatedData[0]?.validationAttributes?.[0]?.reality,
              hasInterviewData: updatedData[0]?.validationAttributes?.[0]?.reality !== "Pending validation..."
            });
            
            onInterviewDataUpdated(updatedData);
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

  // Note: Removed auto-advance useEffect to prevent premature navigation to results
  // Step 3 advancement is now handled explicitly in deck/interview processing callbacks

  // Transform buyerMapData to validationInsights format for DetailedValidationCard
  const getValidationInsights = useMemo(() => {
    const data = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    
    // Type-safe outcome mapping for new validation statuses
    const mapOutcome = (outcome: string): 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' | 'Pending Validation' | 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' => {
      switch (outcome) {
        case 'Validated': return 'Validated';
        case 'Contradicted': return 'Contradicted';
        case 'Gap Identified': return 'Gap Identified';
        case 'Insufficient Data': return 'Insufficient Data';
        // Legacy fallback for old values
        case 'Aligned': return 'Aligned';
        case 'Misaligned': return 'Misaligned';
        case 'Challenged': return 'Challenged';
        case 'New Data Added': return 'New Data Added';
        case 'Refined': return 'Refined';
        default: return 'Pending Validation';
      }
    };
    
    const insights = data.map((item, index) => {
      // Check if we have interview validation data
      const hasInterviewValidation = item.validationAttributes && 
        item.validationAttributes.length > 0 && 
        item.validationAttributes[0]?.reality && 
        item.validationAttributes[0].reality !== 'Pending validation...' &&
        item.validationAttributes[0].reality.trim() !== '';

      // Check if we have deck data as fallback
      const hasDeckData = item.v1Assumption && item.v1Assumption.trim() !== '';

      // Determine what to show based on data availability
      if (hasInterviewValidation && item.validationAttributes) {
        // Show interview validation results with green styling
        const validation = item.validationAttributes[0];
        return {
          id: item.id,
          icpAttribute: item.icpAttribute || '',
          title: item.v1Assumption || item.whyAssumption || '', // Keep original assumption as title
          outcome: mapOutcome(item.displayOutcome || validation.outcome || ''),
          confidence: item.displayConfidence || validation.confidence || 0,
          confidenceExplanation: validation.confidence_explanation || '',
          reality: item.displayReality || validation.reality, // Use pre-processed display reality
          quotes: (validation.quotes || []).map((q, qIndex) => ({
            text: q.text || (q as any).quote || (q as any).quoteText || '',
            author: q.speaker || (q as any).author || (q as any).speakerName || 'Anonymous',
            role: q.role || (q as any).speakerRole || '',
            companySnapshot: q.companySnapshot || ''
          })),
          confidenceBreakdown: validation.confidenceBreakdown,
          isPending: false,
          icpValidation: item.icpValidation,
          dataSource: 'interview' // Mark as interview data for styling
        };
      } else if (hasDeckData) {
        // Show deck analysis data with blue styling as fallback
        return {
          id: item.id,
          icpAttribute: item.icpAttribute || '',
          title: item.v1Assumption || item.whyAssumption || '',
          outcome: mapOutcome(item.displayOutcome || 'New Data Added'), // Use pre-processed display outcome
          confidence: item.displayConfidence || item.confidenceScore || 0,
          confidenceExplanation: 'Analysis based on sales deck content',
          reality: item.displayReality || item.v1Assumption || item.evidenceFromDeck || '', // Use pre-processed display reality
          quotes: [],
          confidenceBreakdown: undefined,
          isPending: false,
          icpValidation: item.icpValidation,
          dataSource: 'deck' // Mark as deck data for styling
        };
      } else {
        // No data available
        return {
          id: item.id,
          icpAttribute: item.icpAttribute || '',
          title: item.v1Assumption || item.whyAssumption || '',
          outcome: mapOutcome(item.displayOutcome || 'Insufficient Data'), // Use pre-processed display outcome
          confidence: item.displayConfidence || 0,
          confidenceExplanation: 'No validation data available',
          reality: item.displayReality || 'No data available for validation', // Use pre-processed display reality
          quotes: [],
          confidenceBreakdown: undefined,
          isPending: true,
          icpValidation: item.icpValidation,
          dataSource: 'none'
        };
      }
    });
    
    return insights;
  }, [localBuyerMapData, buyerMapData, uploadedFiles.interviews.length]);

  // Debug log for transformation - moved before conditional return
  useEffect(() => {
    if (buyerMapData && buyerMapData.length > 0) {
      console.log('🔍 PARSING TEST:', {
        reality: buyerMapData[0]?.reality,
        originalOutcome: (buyerMapData[0] as any)?.outcome,
        parsedOutcome: transformAssumptionForCard(buyerMapData[0])?.displayOutcome
      });
    }
  }, [buyerMapData]);

  // Show overlay when uploadingInterviews is true, and keep it for at least 2 seconds
  useEffect(() => {
    if (uploadingInterviews) {
      setProcessingOverlayVisible(true);
      setInterviewDataReady(false); // Reset data ready state when starting new upload
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    } else if (processingOverlayVisible) {
      // Only hide the overlay if we have interview data to show AND it's ready
      const hasDataToShow = localBuyerMapData.some(assumption => 
        assumption.quotes && assumption.quotes.length > 0
      );
      
      if (hasDataToShow && interviewDataReady) {
        // Wait at least 2 seconds after data is available and ready before hiding
        overlayTimeoutRef.current = setTimeout(() => {
          setProcessingOverlayVisible(false);
        }, 2000);
      } else if (!hasDataToShow) {
        // If no data to show, keep overlay visible for longer
        overlayTimeoutRef.current = setTimeout(() => {
          setProcessingOverlayVisible(false);
        }, 5000);
      }
    }
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, [uploadingInterviews, processingOverlayVisible, localBuyerMapData, interviewDataReady]);

  // Bypass logic for mock mode or when no data is available to show
  if (!uploaded && localBuyerMapData.length === 0 && buyerMapData.length === 0) {
    return (
      <div>
        {/* Resume Last Session Button */}
        {hasPersistedSession && (
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={handleResumeSession}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold text-base shadow hover:from-green-700 hover:to-blue-700 transition-all duration-200 mb-2"
            >
              <span className="mr-2">🔄</span> Resume Last Session
            </button>
            <span className="text-xs text-green-200">Continue where you left off</span>
          </div>
        )}
        <UploadComponent onComplete={() => {
      // Load mock data directly
          setLocalBuyerMapData(sampleBuyerMapData as BuyerMapData[]);
      // Don't set score until interviews are processed (mock mode exception)
      if (isMock) {
            setScore(calculateOverallScore(sampleBuyerMapData as BuyerMapData[]));
      }
      setCurrentStep(3);
      setUploaded(true);
        }} />
      </div>
    );
  }

  // Add a test function for debugging
  const testInterviewAnalysis = async () => {
    console.log('🧪 Testing interview analysis with debugging...');
    try {
      const response = await fetch('http://localhost:3000/api/analyze-interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          blobUrls: [
            'https://xuutptd9ceo11fte.public.blob.vercel-storage.com/_Interview_with_Yusuf_Elmarakby__Paralegal_at_Bruce_Harvey_Law_Firm-OOYZPuWNT6nxyNa9fFCzT2FErMm9V3.docx'
          ],
          assumptions: JSON.stringify(localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData)
        })
      });
      
      const result = await response.json();
      console.log('🧪 Test result:', result);
    } catch (error) {
      console.error('🧪 Test error:', error);
    }
  };

  // Add the replay handler function
  const handleReplayLastUpload = async () => {
    if (!lastInterviewResult) return;
    setUploadingInterviews(true);
    try {
      // Re-run the analysis with the last upload's blobUrls and assumptions
      const analysisResponse = await fetch('http://localhost:3000/api/analyze-interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrls: lastInterviewResult.blobUrls,
          assumptions: JSON.stringify(lastInterviewResult.assumptions),
        }),
      });
      if (!analysisResponse.ok) {
        setProcessError('Replay failed.');
        return;
      }
      const payload = await analysisResponse.json();
      setLocalBuyerMapData(payload.assumptions);
      if (payload.overallAlignmentScore) setScore(payload.overallAlignmentScore);
      if (payload.scoreBreakdown) {
        setScoreBreakdown(payload.scoreBreakdown.breakdown);
        setOutcomeWeights(payload.scoreBreakdown.outcomeWeights);
        setSummary(payload.scoreBreakdown.summary);
      }
      setCurrentStep(3);
      setUploaded(true);
    } catch (err) {
      setProcessError('Replay failed.');
    } finally {
      setUploadingInterviews(false);
      interviewProcessing.resetProcessing();
    }
  };

  // Function to clear all localStorage data and reset state
  const clearSessionData = () => {
    console.log('🧹 Clearing all session data from localStorage');
    
    // Clear all localStorage items
    localStorage.removeItem('buyerMapData');
    localStorage.removeItem('buyerMapScore');
    localStorage.removeItem('buyerMapCurrentStep');
    localStorage.removeItem('buyerMapUploaded');
    localStorage.removeItem('buyerMapScoreBreakdown');
    localStorage.removeItem('buyerMapOutcomeWeights');
    localStorage.removeItem('buyerMapSummary');
    localStorage.removeItem('buyerMapExpandedId');
    localStorage.removeItem('buyerMapUploadedFiles');
    localStorage.removeItem('interviewData'); // Clear interview data too
    
    // Reset all local state
    setLocalBuyerMapData([]);
    setScore(null);
    setCurrentStep(1);
    setUploaded(false);
    setScoreBreakdown(undefined);
    setOutcomeWeights(undefined);
    setSummary(undefined);
    setExpandedId(null);
    setUploadedFiles({ deck: [], interviews: [] });
    setProcessError(null);
    setUploadingInterviews(false);
    interviewProcessing.resetProcessing();
    
    console.log('✅ Session data cleared, returning to initial state');
  };

  // Always render the main results UI, but conditionally show content based on state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-6">
          {/* Option 4: Hero Section (Bold, Centered) */}
          <div className="text-center py-8 mb-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Validate Your Buyer Assumptions
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Your sales deck analysis is complete! Now upload customer interviews to validate your assumptions and discover actionable insights.
              </p>
              {/* Primary CTA - Upload Interview Files */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 relative">
                <label
                  htmlFor="interview-upload"
                  onMouseEnter={() => setShowFileInfo(true)}
                  onMouseLeave={() => setShowFileInfo(false)}
                  onFocus={() => setShowFileInfo(true)}
                  onBlur={() => setShowFileInfo(false)}
                  tabIndex={0}
                  className={`cursor-pointer inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all duration-200 transform
                    hover:from-blue-700 hover:to-purple-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${showFileInfo ? 'ring-2 ring-blue-400 scale-105' : ''}
                  `}
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  <span className="mr-3 text-xl">📁</span>
                  Upload Interview Files
                  <span className="ml-2 text-base opacity-70">→</span>
                  {showFileInfo && (
                    <div
                      className="absolute z-50 left-full top-1/2 -translate-y-1/2 ml-4 w-80 bg-blue-900/95 text-blue-100 text-xs rounded-lg shadow-lg p-4 text-left animate-fade-in"
                      style={{ pointerEvents: 'none' }}
                    >
                      <div className="mb-1">📊 <b>Supported:</b> .docx, .doc, .pdf, .txt files</div>
                      <div className="mb-1">• <b>Limit:</b> 5 interviews per batch for optimal quality</div>
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  multiple
                  accept=".docx,.doc,.pdf,.txt"
                  onChange={(e) => { 
                    if (e.target.files) {
                      handleFileUpload('interviews', e.target.files);
                    }
                  }}
                  className="hidden"
                  id="interview-upload"
                />
                {/* Secondary CTA - New Session */}
                <button
                  onClick={clearSessionData}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold text-base shadow hover:bg-gray-700 transition-all duration-200"
                  title="Clear all data and start a new session"
                >
                  <span className="mr-2">🔄</span> Start New Session
                </button>
              </div>
              {/* Remove always-visible supporting text for upload info */}
              {/* Remove Authentication Status Indicator */}
              {/* Remove localStorage Status Indicator */}
            </div>
          </div>

          {/* Loading overlays for interview upload */}
          {processingOverlayVisible && (
            <InterviewProcessingOverlay
              isVisible={true}
              progress={interviewProcessing.progress}
              stats={interviewProcessing.stats}
              assumptions={localBuyerMapData.map(a => a.v1Assumption || '')}
              onComplete={() => {
                setUploadingInterviews(false);
                interviewProcessing.resetProcessing();
              }}
            />
          )}

          {/* Deck Only State - Show when no interviews uploaded yet */}
          {!hasInterviewData && (
            <div className="space-y-6 mt-2">
              {/* Removed Replay Last Upload Button for deck-only state */}
              {/* Sectioned Assumptions Display (WHO/WHAT/WHEN/WHY/OTHER) */}
              {/* WHO Section */}
              {whoAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHO</h2>
                      <p className="text-blue-200 text-xs">Buyer Personas & Company Profiles</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whoAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHAT Section */}
              {whatAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHAT</h2>
                      <p className="text-purple-200 text-xs">Pain Points & Desired Outcomes</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whatAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHEN Section */}
              {whenAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHEN</h2>
                      <p className="text-amber-200 text-xs">Triggers & Timing</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whenAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHY Section */}
              {whyAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHY</h2>
                      <p className="text-indigo-200 text-xs">Barriers & Messaging</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whyAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* OTHER Section */}
              {otherAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Info className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">OTHER</h2>
                      <p className="text-gray-200 text-xs">Additional Insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {otherAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results State - Show when interviews have been uploaded and validated */}
          {hasInterviewData && (
            <div className="space-y-8 mt-2" data-testid={isMock ? "mock-dashboard" : "validation-dashboard"}>
              {/* Removed Replay Last Upload Button */}
              {/* Removed BuyerMap Validation Summary grid here */}
              {/* WHO Section */}
              {whoAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHO</h2>
                      <p className="text-blue-200 text-xs">Buyer Personas & Company Profiles</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whoAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHAT Section */}
              {whatAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHAT</h2>
                      <p className="text-purple-200 text-xs">Pain Points & Desired Outcomes</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whatAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHEN Section */}
              {whenAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHEN</h2>
                      <p className="text-amber-200 text-xs">Triggers & Timing</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whenAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* WHY Section */}
              {whyAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">WHY</h2>
                      <p className="text-indigo-200 text-xs">Barriers & Messaging</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {whyAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* OTHER Section */}
              {otherAssumptions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Info className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">OTHER</h2>
                      <p className="text-gray-200 text-xs">Additional Insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {otherAssumptions.map((assumption) => (
                      <DetailedValidationCard
                        key={assumption.id}
                        id={assumption.id}
                        attributeTitle={assumption.icpAttribute || 'Unknown'}
                        subtitle={assumption.v1Assumption || assumption.title || assumption.assumption}
                        hasValidation={true}
                        validation={assumption}
                        isExpanded={expandedId === assumption.id}
                        onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                        hasInterviewData={hasInterviewData}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Conflict Dialog */}
          <FileConflictDialog
            isOpen={isDialogOpen}
            fileName={currentConflict?.fileName || ''}
            existingFileInfo={currentConflict?.existingFileInfo}
            onResolve={handleConflictResolve}
            onCancel={cancelConflict}
          />
        </div>
      </div>
    </div>
  );
};

export default ModernBuyerMapLanding;
