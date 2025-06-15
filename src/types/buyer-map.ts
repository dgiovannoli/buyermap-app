export interface Quote {
  id: number;
  text: string;
  speaker: string;
  role: string;
  source: string;
  rejected: boolean;
}

export interface BuyerMapData {
  id: number;
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  whyAssumption: string;
  evidenceFromDeck: string;
  realityFromInterviews: string;
  comparisonOutcome: 'Aligned' | 'New Data Added' | 'Misaligned';
  waysToAdjustMessaging: string;
  confidenceScore: number;
  confidenceExplanation: string;
  quotes: Quote[];
  effectiveConfidence?: number;
}

export interface UploadedFiles {
  deck: File | null;
  interviews: File[];
}

export type ComparisonOutcome = 'Aligned' | 'New Data Added' | 'Misaligned';
export type ActiveTab = 'all' | 'aligned' | 'insights' | 'misaligned'; 