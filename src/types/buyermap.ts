export interface BuyerMapData {
    id: number
    icpAttribute: string
    icpTheme: string
    v1Assumption: string
    whyAssumption: string
    evidenceFromDeck: string
    realityFromInterviews?: string
    comparisonOutcome: 'aligned' | 'misaligned' | 'new_insight'
    waysToAdjustMessaging?: string
    confidenceScore: number
    confidenceExplanation: string
    quotes?: Quote[]
    effectiveConfidence?: number
  }
  
  export interface Quote {
    id: string
    text: string
    speaker: string
    role: string
    source: string
    rejected?: boolean
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
  }