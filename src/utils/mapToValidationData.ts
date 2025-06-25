import { BuyerMapData, ValidationDataObject } from '../types/buyermap';
import { generateConfidenceBreakdown } from './confidenceHelpers';

export function mapBuyerMapToValidationData(
  item: BuyerMapData
): ValidationDataObject {
  // Generate enhanced confidence breakdown if we have interview data
  const hasInterviewData = (item.quotes?.length ?? 0) > 0 && item.realityFromInterviews;
  
  // Calculate unique speakers for interview-based confidence
  const uniqueSpeakers = hasInterviewData ? new Set(item.quotes?.map(q => q.speaker).filter(Boolean)).size || 0 : 0;
  
  const confidenceBreakdown = hasInterviewData ? generateConfidenceBreakdown(
    item.comparisonOutcome || 'Pending Validation',
    uniqueSpeakers,
    85 // Assume 85% deck extraction accuracy
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
      text: q.text || '',
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