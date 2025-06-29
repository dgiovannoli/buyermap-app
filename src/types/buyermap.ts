export interface ExampleQuote {
  quote: string;
  attribution: string;
  interviewSource: string;
}

export interface ValidationAttribute {
  assumption: string;
  reality: string;
  outcome: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  confidence_explanation: string;
  confidenceBreakdown?: ConfidenceBreakdown;
  quotes: Quote[];
  evidenceFromDeck?: string;
  relevanceScore?: number;
}

export interface ICPValidationData {
  title: string;
  subtitle: string;
  cardNumber: number;
  series: string;
  totalInterviews: number;
}

export interface BuyerMapData {
  id: number;
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  whyAssumption: string;
  evidenceFromDeck: string;
  realityFromInterviews?: string;
  reality?: string;
  comparisonOutcome: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  waysToAdjustMessaging?: string;
  confidenceScore: number;
  confidenceExplanation: string;
  confidenceBreakdown?: ConfidenceBreakdown; // New field for detailed confidence
  quotes?: Quote[];
  exampleQuotes?: ExampleQuote[];
  effectiveConfidence?: number;
  validationStatus?: 'pending' | 'partial' | 'validated' | 'contradicted' | 'VALIDATED' | 'GAP_IDENTIFIED' | 'CONTRADICTED' | 'INSUFFICIENT_DATA';
  icpValidation?: ICPValidationData;
  validationAttributes?: ValidationAttribute[];
  
  // Display fields for pre-processed data from BuyerMapApp
  displayOutcome?: string;
  displayReality?: string;
  displayConfidence?: number;
  _originalOutcome?: string;
  _validationOutcome?: string;
}

export interface ICPValidationResponse {
  assumptions: BuyerMapData[];
  overallAlignmentScore: number;
  validatedCount: number;
  partiallyValidatedCount: number;
  pendingCount: number;
  validationAttributes?: { [key: string]: ValidationAttribute };
  icpValidation?: ICPValidationData;
  companyId?: string;
}

export interface Quote {
  id: string;
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  classification: 'RELEVANT' | 'IRRELEVANT' | 'ALIGNED' | 'MISALIGNED' | 'NEW_INSIGHT' | 'NEUTRAL';
  companySnapshot?: string;
  rejected: boolean;
  relevanceScore?: number;
}

export interface AssumptionData {
  icpAttribute?: string
  icpTheme?: string
  v1Assumption?: string
  whyAssumption?: string
  evidenceFromDeck?: string
  realityFromInterviews?: string
  comparisonOutcome?: 'aligned' | 'misaligned' | 'new_insight'
  waysToAdjustMessaging?: string
  confidenceScore?: number
  confidenceExplanation?: string
  quotes?: Quote[]
  effectiveConfidence?: number
  validationStatus?: 'pending' | 'partial' | 'validated'
}

export type ProcessingStep = 
  | 'deck-upload'
  | 'deck-processing'
  | 'deck-analysis'
  | 'deck-results'
  | 'interview-upload'
  | 'interview-processing'
  | 'results-complete';

export interface InterviewBatch {
  files: File[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processedAt?: Date
  error?: string
}

// New enhanced interview storage for accumulative analysis
export interface StoredInterview {
  id: string;
  filename: string;
  uploadDate: Date;
  status: 'processing' | 'completed' | 'failed';
  
  // Auto-extracted metadata
  companySize?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
  role?: string;
  industry?: string;
  region?: string;
  
  // User-added metadata (future enhancement)
  tags?: string[];
  notes?: string;
  customFields?: Record<string, any>;
  
  // Processing results
  quotesExtracted: number;
  processingTime: number;
  uniqueSpeakers: string[];
  
  // RAG storage reference
  pineconeNamespace?: string;
  vectorsStored: number;
  
  // Content tracking for duplicate detection
  contentHash?: string;
  fileSize?: number;
  blobUrl?: string;
}

export interface InterviewFilterCriteria {
  companySize?: string[];
  roles?: string[];
  industries?: string[];
  regions?: string[];
  tags?: string[];
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  speakerNames?: string[];
}

export interface AccumulativeAnalysisState {
  totalInterviews: number;
  selectedInterviews: StoredInterview[];
  filterCriteria: InterviewFilterCriteria;
  lastAnalysisDate: Date;
  analysisHistory: AnalysisSnapshot[];
}

export interface AnalysisSnapshot {
  id: string;
  timestamp: Date;
  interviewIds: string[];
  filterCriteria: InterviewFilterCriteria;
  results: {
    overallAlignmentScore: number;
    assumptions: BuyerMapData[];
    scoreBreakdown: any;
  };
  metadata: {
    totalQuotes: number;
    processingTime: number;
  };
}

export interface AssumptionState {
  id: string;
  assumption: string;
  category: string;
  status: 'PENDING_VALIDATION' | 'PROCESSING' | 'ALIGNED' | 'MISALIGNED' | 'NEW_DATA_ADDED' | 'NEUTRAL';
  source: 'DECK_ONLY' | 'INTERVIEWS_PROCESSED';
  deckEvidence?: string;
  slideNumber?: number;
  quotes: any[];
  confidence: number;
  explanation: string;
  createdAt: string;
  lastUpdated: string;
}

export interface ValidationDataObject {
  id: number;
  icpAttribute: string;
  icpTheme: string;
  assumption: string;
  reality: string;
  outcome: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  confidence_explanation: string;
  confidenceBreakdown?: ConfidenceBreakdown;
  quotes: Array<{
    text: string;
    author: string;
    speaker?: string;
    role?: string;
    companySnapshot?: string;
    relevanceScore?: number;
  }>;
  comparisonOutcome: string;
  confidenceScore: number;
  confidenceExplanation: string;
  waysToAdjustMessaging: string;
  evidenceFromDeck?: string;
}

export interface ConfidenceBreakdown {
  overall: number;
  dataQuality: number;
  sampleSize: number;
  alignment: number;
  explanation: string;
}