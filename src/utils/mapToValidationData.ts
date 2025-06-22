import { BuyerMapData, ValidationDataObject } from '../types/buyermap';
import { generateConfidenceBreakdown } from './confidenceHelpers';

export function mapBuyerMapToValidationData(
  item: BuyerMapData
): ValidationDataObject {
  // Generate enhanced confidence breakdown if we have interview data
  const hasInterviewData = (item.quotes?.length ?? 0) > 0 && item.realityFromInterviews;
  const confidenceBreakdown = hasInterviewData ? generateConfidenceBreakdown(
    item.comparisonOutcome || 'Pending Validation',
    item.quotes?.length ?? 0,
    // Estimate interviews from unique speakers (rough approximation)
    new Set(item.quotes?.map(q => q.speaker).filter(Boolean)).size || 0,
    85, // Assume 85% deck extraction accuracy
    true // Has interview data
  ) : undefined;

  return {
    // core validation fields
    id: item.id,
    icpAttribute: item.icpAttribute,
    icpTheme: item.icpTheme,
    assumption: item.v1Assumption || item.whyAssumption || '',
    reality: item.realityFromInterviews || '',
    outcome: item.comparisonOutcome as ValidationDataObject['outcome'],
    confidence: item.confidenceScore ?? 0,
    confidence_explanation: item.confidenceExplanation || '',
    quotes: (item.quotes || []).map(q => ({
      text: q.text || q.quote || '',
      author: q.speaker || 'Anonymous',
      role: q.role,
    })),
    // additional fields for the card
    comparisonOutcome: item.comparisonOutcome,
    confidenceScore: item.confidenceScore,
    confidenceExplanation: item.confidenceExplanation || '',
    waysToAdjustMessaging: item.waysToAdjustMessaging || '',
    // Enhanced confidence breakdown
    confidenceBreakdown: confidenceBreakdown,
  };
} 