export interface ExampleQuote {
  quote: string;
  attribution: string;
  interviewSource: string;
}

export interface ValidationAttribute {
  assumption: string;
  reality: string;
  outcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined';
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
  comparisonOutcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined';
  waysToAdjustMessaging?: string;
  confidenceScore: number;
  confidenceExplanation: string;
  quotes?: Quote[];
  exampleQuotes?: ExampleQuote[];
  effectiveConfidence?: number;
  validationStatus: 'pending' | 'partial' | 'validated';
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