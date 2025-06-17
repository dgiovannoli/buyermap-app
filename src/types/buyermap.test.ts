import { ValidationAttribute, ICPValidationData, Quote } from './buyermap';

// Test ValidationAttribute
const testValidation: ValidationAttribute = {
  assumption: "Test assumption",
  reality: "Test reality", 
  outcome: "Aligned",
  confidence: 85,
  confidence_explanation: "Test explanation",
  quotes: [{
    id: "1",
    text: "Test quote",
    speaker: "Test Speaker",
    role: "Test Role",
    source: "Test Source"
  }]
};

// Test ICPValidationData
const testICP: ICPValidationData = {
  title: "Test ICP",
  subtitle: "Test subtitle",
  cardNumber: 1, // Changed from string to number to match type
  series: "Test Series",
  totalInterviews: 5
};

// Test BuyerMapData with new properties
const testBuyerMap = {
  id: 1,
  icpAttribute: "Test Attribute",
  icpTheme: "Test Theme",
  v1Assumption: "Test Assumption",
  whyAssumption: "Test Why",
  evidenceFromDeck: "Test Evidence",
  comparisonOutcome: "Aligned" as const,
  confidenceScore: 85,
  confidenceExplanation: "Test Explanation",
  validationStatus: "validated" as const,
  icpValidation: testICP,
  validationAttributes: [testValidation]
};

// Type assertions to verify compilation
const _typeCheck1: ValidationAttribute = testValidation;
const _typeCheck2: ICPValidationData = testICP; 