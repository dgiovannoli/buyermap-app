import { mapBuyerMapToValidationData } from './mapToValidationData';
import sampleData from '../mocks/sampleBuyerMapData.json';

describe('mapBuyerMapToValidationData', () => {
  it('correctly maps BuyerMapData to ValidationDataObject', () => {
    const input = sampleData[0];
    const output = mapBuyerMapToValidationData(input);

    // Basic sanity checks
    expect(output.id).toBe(input.id);
    expect(output.icpAttribute).toBe(input.icpAttribute);
    expect(output.assumption).toContain(input.v1Assumption || input.whyAssumption);
    expect(output.reality).toBe(input.realityFromInterviews);
    expect(output.outcome).toBe(input.comparisonOutcome);
    expect(output.confidence).toBe(input.confidenceScore);
    expect(output.confidence_explanation).toBe(input.confidenceExplanation);
    expect(output.quotes.length).toBe(input.quotes.length);

    // Deep‐check one quote
    const qIn = input.quotes[0];
    const qOut = output.quotes[0];
    expect(qOut.text).toBe(qIn.text || qIn.quote);
    expect(qOut.author).toBe(qIn.speaker || 'Anonymous');
    expect(qOut.role).toBe(qIn.role);
  });
}); 