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
export function createICPValidationData(data: BuyerMapData, totalInterviewCount?: number): ICPValidationData {
  console.log('Creating ICP validation data from:', data);
  return {
    title: data.icpAttribute || 'ICP Validation',
    subtitle: data.icpTheme || 'Validate your ICP assumptions against real customer interviews',
    cardNumber: data.id || 1,
    series: 'ICP Collection 2025',
    totalInterviews: totalInterviewCount || calculateTotalInterviews(data.quotes || [])
  };
}

/**
 * Counts unique interview sources from quotes
 */
export function calculateTotalInterviews(quotes: Quote[]): number {
  const uniqueSources = new Set(quotes.map(quote => quote.speaker || quote.role || 'Unknown'));
  return uniqueSources.size;
}

/**
 * Helper function to transform BuyerMapData to include new validation properties
 */
export function transformBuyerMapData(data: BuyerMapData): BuyerMapData {
  // Map validation status to the expected type for AssumptionData
  const mapValidationStatus = (status: typeof data.validationStatus): 'pending' | 'partial' | 'validated' | undefined => {
    if (!status) return undefined;
    
    switch (status) {
      case 'validated':
      case 'VALIDATED':
        return 'validated';
      case 'partial':
        return 'partial';
      case 'contradicted':
      case 'CONTRADICTED':
      case 'GAP_IDENTIFIED':
      case 'INSUFFICIENT_DATA':
        return 'partial'; // Map these to partial since they're not fully validated
      case 'pending':
      default:
        return 'pending';
    }
  };

  const assumptionData: AssumptionData = {
    icpAttribute: data.icpAttribute,
    icpTheme: data.icpTheme,
    v1Assumption: data.v1Assumption,
    whyAssumption: data.whyAssumption,
    evidenceFromDeck: data.evidenceFromDeck,
    realityFromInterviews: data.realityFromInterviews,
    comparisonOutcome: (data.comparisonOutcome || 'pending').toLowerCase() as 'aligned' | 'misaligned' | 'new_insight',
    confidenceScore: data.confidenceScore,
    confidenceExplanation: data.confidenceExplanation,
    quotes: data.quotes,
    validationStatus: mapValidationStatus(data.validationStatus)
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

/**
 * Returns assumption-specific extraction instructions for targeted quote extraction
 */
export function getAssumptionSpecificInstructions(assumption: string): string {
  const instructions = {
    'company-size': `
    Extract quotes that provide CONCRETE EVIDENCE about company/firm size:
    - Specific employee counts ("we have 12 people", "200+ attorney firm")
    - Size descriptors with context ("small firm", "large corporation", "mid-sized practice")
    - Comparative statements ("bigger than us", "smaller operations")
    - Resource/scale indicators ("limited staff", "enterprise-level", "solo practice")
    
    EVIDENCE REQUIREMENT: Quote must contain measurable or comparative size information.
    REJECT: General business talk without size specifics.`,
    
    'buyer-titles': `
    Extract quotes that provide CONCRETE EVIDENCE about who buys/uses the service:
    - Exact job titles ("criminal defense attorney", "legal assistant", "paralegal")
    - Role descriptions ("the person who decides", "whoever handles technology")
    - Decision-maker identification ("I'm the one who...", "our IT director...")
    - User personas ("attorneys like me", "paralegals in our office")
    
    EVIDENCE REQUIREMENT: Quote must identify specific roles or decision-makers.
    REJECT: General service descriptions without role clarity.`,
    
    'pain-points': `
    Extract quotes that provide CONCRETE EVIDENCE of specific problems:
    - Explicit problem statements ("the issue is...", "we struggle with...")
    - Quantified pain ("takes 40 hours", "costs us $X", "wastes 3 days")
    - Frustration expressions ("it's frustrating that...", "the problem with...")
    - Process breakdowns ("when this happens...", "we can't...")
    
    EVIDENCE REQUIREMENT: Quote must describe actual problems with specifics.
    REJECT: General process descriptions or solutions.`,
    
    'desired-outcomes': `
    Extract quotes that provide CONCRETE EVIDENCE of what they want to achieve:
    - Specific goals ("we want to reduce...", "the goal is to...")
    - Measurable outcomes ("save 10 hours", "increase accuracy by...")
    - Success definitions ("success would be...", "ideally we'd...")
    - Value statements ("what matters most is...", "we need...")
    
    EVIDENCE REQUIREMENT: Quote must state desired end-states or goals.
    REJECT: Current problem descriptions.`,
    
    'triggers': `
    Extract quotes that provide CONCRETE EVIDENCE about when/why they need the service:
    - Specific situations ("when we get a big case...", "during trial prep...")
    - Event triggers ("once discovery arrives...", "if there's a deadline...")
    - Volume thresholds ("when we have more than X...", "cases with lots of...")
    - Timeline pressures ("right before trial...", "when time is short...")
    
    EVIDENCE REQUIREMENT: Quote must describe specific triggering situations.
    REJECT: General service usage descriptions.`,
    
    'barriers': `
    Extract quotes that provide CONCRETE EVIDENCE of adoption obstacles:
    - Specific concerns ("worried about security", "cost is an issue")
    - Risk factors ("concerned about accuracy", "compliance requirements")
    - Resource constraints ("don't have budget", "lack training time")
    - Resistance reasons ("hesitant because...", "the problem is...")
    
    EVIDENCE REQUIREMENT: Quote must express actual concerns or obstacles.
    REJECT: General positive feedback.`,
    
    'messaging-emphasis': `
    Extract quotes that provide CONCRETE EVIDENCE of what resonates:
    - Value priorities ("most important feature is...", "what matters is...")
    - Persuasion factors ("what convinced me was...", "the key benefit...")
    - Peer recommendations ("I'd tell others...", "lawyers should know...")
    - Feature preferences ("love the...", "really useful is...")
    
    EVIDENCE REQUIREMENT: Quote must show what influences or persuades.
    REJECT: Generic feature descriptions.`
  };
  
  // Extract the key from the assumption text
  for (const [key, instruction] of Object.entries(instructions)) {
    if (assumption.toLowerCase().includes(key.replace('-', ' ')) || 
        assumption.toLowerCase().includes(key.replace('-', ''))) {
      return instruction;
    }
  }
  
  return `Extract quotes that provide CONCRETE EVIDENCE about this assumption. Look for specific examples, measurements, or explicit statements that validate or challenge the assumption.`;
} 