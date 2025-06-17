export type ProcessingPhase = 'idle' | 'deck' | 'interviews';

export type ProcessingStep = 
  | 'home'
  | 'deck-upload'
  | 'deck-processing'
  | 'deck-results'
  | 'interview-upload'
  | 'interview-processing'
  | 'results-complete';

export interface ProcessingProgress {
  phase: ProcessingPhase;
  step: ProcessingStep;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ValidationProgress {
  validatedCount: number;
  partiallyValidatedCount: number;
  pendingCount: number;
  totalQuotes: number;
  overallProgress: number;
  totalAssumptions: number;
  partialCount: number;
  totalInterviews: number;
  processedBatches: number;
}

export interface Quote {
  id: string;
  text: string;
  speaker: string;
  role: string;
  source: string;
  rejected?: boolean;
}

export interface AssumptionData {
  id: string;
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  realityFromInterviews?: string;
  comparisonOutcome?: string;
  waysToAdjustMessaging?: string;
  validationStatus: 'pending' | 'partial' | 'validated';
  confidenceScore: number;
  quotes?: Quote[];
}

export interface BuyerMapData {
  assumptions: AssumptionData[];
  totalAssumptions: number;
  validatedCount: number;
  partiallyValidatedCount: number;
  pendingCount: number;
  overallConfidence: number;
}

export interface DeckUploadStageProps {
  onDeckProcessed: (data: BuyerMapData) => void;
  onError: (error: string | null) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
}

export interface DeckResultsStageProps {
  buyerMapData: BuyerMapData;
  onError: (error: string | null) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
  onValidationUpdate: (data: BuyerMapData) => void;
}

export type ComparisonOutcome = 'aligned' | 'misaligned' | 'new_insight';
export type ActiveTab = 'all' | 'aligned' | 'insights' | 'misaligned';

export interface UploadedFiles {
  deck: File | null;
  interviews: File[];
}

export interface InterviewBatch {
  files: File[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;
} 