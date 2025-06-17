import { AssumptionData, ValidationAttribute, ICPValidationData, BuyerMapData, Quote } from '../types/buyermap';

/**
 * Standard BuyerMap framework attributes
 */
export const STANDARD_ICP_ATTRIBUTES = {
  WHO: ['buyer-titles', 'company-size'],
  WHAT: ['pain-points', 'desired-outcomes'],
  WHEN: ['triggers'],
  WHY_HOW: ['barriers', 'messaging-emphasis']
} as const;

/**
 * Maps deck analysis attributes to standard BuyerMap framework attributes
 */
export function mapDeckAttributeToStandard(deckAttribute: string): string {
  console.log('Mapping deck attribute to standard:', deckAttribute);
  
  const attributeMap: Record<string, string> = {
    // Industry-related assumptions map to Pain Points
    'industry': 'pain-points',
    'industry challenges': 'pain-points',
    'industry problems': 'pain-points',
    'industry issues': 'pain-points',
    
    // Need-related assumptions map to Desired Outcomes
    'need': 'desired-outcomes',
    'needs': 'desired-outcomes',
    'customer needs': 'desired-outcomes',
    'customer wants': 'desired-outcomes',
    
    // Size-related assumptions map to Company Size
    'size': 'company-size',
    'company size': 'company-size',
    'organization size': 'company-size',
    'employee count': 'company-size',
    
    // Technology-related assumptions map to Barriers
    'technology adoption': 'barriers',
    'tech adoption': 'barriers',
    'technical challenges': 'barriers',
    'technology barriers': 'barriers',
    
    // Direct mappings for standard attributes
    'buyer titles': 'buyer-titles',
    'pain points': 'pain-points',
    'desired outcomes': 'desired-outcomes',
    'triggers': 'triggers',
    'barriers': 'barriers',
    'messaging emphasis': 'messaging-emphasis'
  };

  const normalizedAttribute = deckAttribute.toLowerCase().trim();
  const standardAttribute = attributeMap[normalizedAttribute] || normalizedAttribute;
  console.log(`Mapped "${deckAttribute}" to "${standardAttribute}"`);
  return standardAttribute;
}

/**
 * Maps an AssumptionData object to a ValidationAttribute
 */
export function mapAssumptionToValidation(assumptionData: AssumptionData): ValidationAttribute {
  return {
    assumption: assumptionData.v1Assumption || '',
    reality: assumptionData.realityFromInterviews || 'Pending validation...',
    outcome: mapComparisonOutcome(assumptionData.comparisonOutcome || 'pending'),
    confidence: assumptionData.confidenceScore || 0,
    confidence_explanation: assumptionData.confidenceExplanation || '',
    quotes: assumptionData.quotes || []
  };
}

/**
 * Maps existing outcome types to new outcome types
 */
export function mapComparisonOutcome(outcome: string): 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' {
  const lowerOutcome = outcome.toLowerCase();
  switch (lowerOutcome) {
    case 'aligned':
      return 'Aligned';
    case 'misaligned':
      return 'Misaligned';
    case 'pending':
      return 'Challenged';
    case 'new_insight':
      return 'New Data Added';
    default:
      return 'Refined';
  }
}

/**
 * Maps ICP attribute names to kebab-case keys
 */
export function mapICPAttributeToKey(attribute: string): string {
  console.log('Mapping ICP attribute to key:', attribute);
  // Map the standard ICP attribute names to their kebab-case keys
  const attributeMap: Record<string, string> = {
    'Buyer Titles': 'buyer-titles',
    'Company Size': 'company-size',
    'Pain Points': 'pain-points',
    'Desired Outcomes': 'desired-outcomes',
    'Triggers': 'triggers',
    'Barriers': 'barriers',
    'Messaging Emphasis': 'messaging-emphasis'
  };
  
  const key = attributeMap[attribute] || attribute.toLowerCase().replace(/\s+/g, '-');
  console.log('Mapped to key:', key);
  return key;
}

/**
 * Converts array of assumptions to Record<string, ValidationAttribute>
 */
export function createValidationData(assumptions: BuyerMapData[]): Record<string, ValidationAttribute> {
  console.log('Creating validation data from assumptions:', assumptions);
  const validationData: Record<string, ValidationAttribute> = {};
  
  // Ensure we're working with an array of assumptions
  const assumptionsArray = Array.isArray(assumptions) ? assumptions : [];
  console.log('Processing assumptions array:', assumptionsArray);

  // First, map existing assumptions to standard attributes
  assumptionsArray.forEach(assumption => {
    console.log('Processing individual assumption:', {
      icpTheme: assumption.icpTheme,
      v1Assumption: assumption.v1Assumption,
      confidenceScore: assumption.confidenceScore
    });

    if (assumption.icpTheme) {
      const standardKey = assumption.icpTheme;
      console.log(`Mapping assumption to standard key ${standardKey}`);
      
      validationData[standardKey] = {
        assumption: assumption.v1Assumption || '',
        reality: assumption.realityFromInterviews || 'Pending validation...',
        outcome: mapComparisonOutcome(assumption.comparisonOutcome || 'pending'),
        confidence: assumption.confidenceScore || 0,
        confidence_explanation: assumption.confidenceExplanation || '',
        quotes: assumption.quotes || []
      };

      console.log(`Created validation data for ${standardKey}:`, validationData[standardKey]);
    }
  });

  // Then, ensure all standard attributes exist
  Object.values(STANDARD_ICP_ATTRIBUTES).flat().forEach(attribute => {
    if (!validationData[attribute]) {
      console.log(`Creating empty validation for standard attribute ${attribute}`);
      validationData[attribute] = {
        assumption: 'No assumption identified from deck',
        reality: 'Pending validation...',
        outcome: 'Challenged',
        confidence: 0,
        confidence_explanation: 'No data available',
        quotes: []
      };
    }
  });
  
  console.log('Final validation data:', validationData);
  return validationData;
}

/**
 * Creates ICPValidationData from existing BuyerMapData
 */
export function createICPValidationData(data: BuyerMapData): ICPValidationData {
  console.log('Creating ICP validation data from:', data);
  return {
    title: data.icpAttribute || 'ICP Validation',
    subtitle: data.icpTheme || 'Validate your ICP assumptions against real customer interviews',
    cardNumber: data.id || 1,
    series: 'ICP Collection 2025',
    totalInterviews: calculateTotalInterviews(data.quotes || [])
  };
}

/**
 * Counts unique interview sources from quotes
 */
export function calculateTotalInterviews(quotes: Quote[]): number {
  const uniqueSources = new Set(quotes.map(quote => quote.source));
  return uniqueSources.size;
}

/**
 * Helper function to transform BuyerMapData to include new validation properties
 */
export function transformBuyerMapData(data: BuyerMapData): BuyerMapData {
  const assumptionData: AssumptionData = {
    icpAttribute: data.icpAttribute,
    icpTheme: data.icpTheme,
    v1Assumption: data.v1Assumption,
    whyAssumption: data.whyAssumption,
    evidenceFromDeck: data.evidenceFromDeck,
    realityFromInterviews: data.realityFromInterviews,
    comparisonOutcome: data.comparisonOutcome.toLowerCase() as 'aligned' | 'misaligned' | 'new_insight',
    waysToAdjustMessaging: data.waysToAdjustMessaging,
    confidenceScore: data.confidenceScore,
    confidenceExplanation: data.confidenceExplanation,
    quotes: data.quotes,
    validationStatus: data.validationStatus
  };

  return {
    ...data,
    icpValidation: createICPValidationData(data),
    validationAttributes: [mapAssumptionToValidation(assumptionData)]
  };
}

/**
 * Helper function to transform array of BuyerMapData
 */
export function transformBuyerMapDataArray(data: BuyerMapData[]): BuyerMapData[] {
  return data.map(transformBuyerMapData);
} 