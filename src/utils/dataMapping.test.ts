import { AssumptionData, ValidationAttribute } from '../types/buyermap';
import {
  mapAssumptionToValidation,
  mapICPAttributeToKey,
  createValidationData,
  mapComparisonOutcome
} from './dataMapping';

// Sample test data
const sampleAssumption: AssumptionData = {
  icpAttribute: "Buyer Titles",
  icpTheme: "Criminal Defense Attorney",
  v1Assumption: "Attorneys are primary users",
  whyAssumption: "Based on sales deck",
  evidenceFromDeck: "Slide 5 mentions attorneys",
  realityFromInterviews: "Paralegals often manage transcription",
  comparisonOutcome: "misaligned",
  confidenceScore: 85,
  confidenceExplanation: "Clear from 3 interviews",
  quotes: [{
    id: "1",
    text: "I handle all transcription",
    speaker: "Betty",
    role: "Paralegal",
    source: "Interview 1"
  }],
  validationStatus: "validated"
};

// Test 1: mapAssumptionToValidation
console.log('Test 1: mapAssumptionToValidation');
const validationAttribute = mapAssumptionToValidation(sampleAssumption);
console.log('Result:', JSON.stringify(validationAttribute, null, 2));
console.log('Expected outcome:', 'Misaligned');
console.log('Actual outcome:', validationAttribute.outcome);
console.log('Expected confidence:', 85);
console.log('Actual confidence:', validationAttribute.confidence);
console.log('Expected quotes length:', 1);
console.log('Actual quotes length:', validationAttribute.quotes.length);
console.log('---');

// Test 2: mapICPAttributeToKey
console.log('Test 2: mapICPAttributeToKey');
const key = mapICPAttributeToKey("Buyer Titles");
console.log('Result:', key);
console.log('Expected:', 'buyer-titles');
console.log('Actual:', key);
console.log('---');

// Test 3: createValidationData
console.log('Test 3: createValidationData');
const validationData = createValidationData([sampleAssumption]);
console.log('Result:', JSON.stringify(validationData, null, 2));
console.log('Expected key:', 'buyer-titles');
console.log('Actual keys:', Object.keys(validationData));
console.log('Expected validation attribute:', validationAttribute);
console.log('Actual validation attribute:', validationData['buyer-titles']);
console.log('---');

// Additional test: mapComparisonOutcome with different statuses
console.log('Additional Test: mapComparisonOutcome');
const outcomes = [
  { outcome: 'aligned', status: 'validated' },
  { outcome: 'misaligned', status: 'validated' },
  { outcome: 'new_insight', status: 'partial' },
  { outcome: 'aligned', status: 'pending' }
];

outcomes.forEach(({ outcome, status }) => {
  const mapped = mapComparisonOutcome(outcome, status as 'pending' | 'partial' | 'validated');
  console.log(`Mapping ${outcome} with status ${status}:`, mapped);
}); 