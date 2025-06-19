import { BuyerMapData, ValidationDataObject } from '../types/buyermap';

export function mapBuyerMapToValidationData(
  item: BuyerMapData
): ValidationDataObject {
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
  };
} 