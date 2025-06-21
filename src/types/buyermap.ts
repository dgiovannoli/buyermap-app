export interface ExampleQuote {
  quote: string;
  attribution: string;
  interviewSource: string;
}

export interface ValidationAttribute {
  assumption: string;
  reality: string;
  outcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' | 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  confidence_explanation: string;
  quotes: Quote[];
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
  comparisonOutcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' | 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  waysToAdjustMessaging?: string;
  confidenceScore: number;
  confidenceExplanation: string;
  quotes?: Quote[];
  exampleQuotes?: ExampleQuote[];
  effectiveConfidence?: number;
  validationStatus?: 'pending' | 'partial' | 'validated' | 'contradicted' | 'VALIDATED' | 'GAP_IDENTIFIED' | 'CONTRADICTED' | 'INSUFFICIENT_DATA';
  icpValidation?: ICPValidationData;
  validationAttributes?: ValidationAttribute[];
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
  speaker: string;
  role: string;
  source: string;
  rejected?: boolean;
  quote?: string;
  companySnapshot?: string;
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
  outcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' | 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  confidence_explanation: string;
  quotes: Array<{
    text: string;
    author: string;
    role?: string;
  }>;
  comparisonOutcome: string;
  confidenceScore: number;
  confidenceExplanation: string;
  waysToAdjustMessaging: string;
}