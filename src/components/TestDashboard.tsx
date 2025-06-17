import React from 'react';
import ICPValidationDashboard from './ICPValidationDashboard';
import { BuyerMapData, Quote, ICPValidationResponse } from '../types/buyermap';

const mockQuotes: Quote[] = [
  {
    id: '1',
    text: 'Test quote from paralegal',
    speaker: 'Betty Behrens',
    role: 'Paralegal',
    source: 'Interview 1'
  },
  {
    id: '2',
    text: 'Test quote from attorney',
    speaker: 'Marcus Rivera',
    role: 'Attorney',
    source: 'Interview 2'
  },
  {
    id: '3',
    text: 'Test quote from ops',
    speaker: 'Christina Fouche',
    role: 'Operations',
    source: 'Interview 3'
  }
];

const mockData: BuyerMapData[] = [
  {
    id: 1,
    icpAttribute: 'Buyer Titles',
    icpTheme: 'Criminal Defense Attorney',
    v1Assumption: 'Attorneys are primary users',
    whyAssumption: 'Based on sales deck analysis',
    evidenceFromDeck: 'Slide 5 mentions attorneys as key users',
    realityFromInterviews: 'Paralegals often manage transcription',
    comparisonOutcome: 'Misaligned',
    waysToAdjustMessaging: 'Update messaging to include paralegals as key users',
    confidenceScore: 85,
    confidenceExplanation: 'Clear evidence from 3 interviews',
    quotes: mockQuotes,
    exampleQuotes: [],
    effectiveConfidence: 85,
    validationStatus: 'validated',
    icpValidation: {
      title: 'Test ICP',
      subtitle: 'Criminal Defense Attorney Practice',
      cardNumber: 1,
      series: 'Test Series',
      totalInterviews: 3
    },
    validationAttributes: [
      {
        assumption: 'Attorneys are primary users',
        reality: 'Paralegals often manage transcription',
        outcome: 'Misaligned',
        confidence: 85,
        confidence_explanation: 'Clear evidence from 3 interviews',
        quotes: mockQuotes
      }
    ]
  },
  {
    id: 2,
    icpAttribute: 'Company Size',
    icpTheme: 'Criminal Defense Attorney',
    v1Assumption: 'Small to medium sized firms (2-10 attorneys)',
    whyAssumption: 'Based on market research',
    evidenceFromDeck: 'Slide 7 shows target market',
    realityFromInterviews: 'Most users are from firms with 5-15 attorneys',
    comparisonOutcome: 'Aligned',
    waysToAdjustMessaging: 'Keep current messaging',
    confidenceScore: 90,
    confidenceExplanation: 'Strong validation from interviews',
    quotes: [
      {
        id: '4',
        text: 'We have 12 attorneys in our practice',
        speaker: 'Sarah Chen',
        role: 'Attorney',
        source: 'Interview 4'
      }
    ],
    exampleQuotes: [],
    effectiveConfidence: 90,
    validationStatus: 'validated',
    icpValidation: {
      title: 'Test ICP',
      subtitle: 'Criminal Defense Attorney Practice',
      cardNumber: 2,
      series: 'Test Series',
      totalInterviews: 3
    },
    validationAttributes: [
      {
        assumption: 'Small to medium sized firms (2-10 attorneys)',
        reality: 'Most users are from firms with 5-15 attorneys',
        outcome: 'Aligned',
        confidence: 90,
        confidence_explanation: 'Strong validation from interviews',
        quotes: [
          {
            id: '4',
            text: 'We have 12 attorneys in our practice',
            speaker: 'Sarah Chen',
            role: 'Attorney',
            source: 'Interview 4'
          }
        ]
      }
    ]
  }
];

const mockICPValidationResponse: ICPValidationResponse = {
  assumptions: mockData,
  overallAlignmentScore: 0,
  validatedCount: 0,
  partiallyValidatedCount: 0,
  pendingCount: 0
};

interface TestDashboardProps {}

const TestDashboard: React.FC<TestDashboardProps> = () => {
  const handleValidationUpdate = (data: ICPValidationResponse) => {
    console.log('Validation updated:', data);
  };

  const handleError = (error: Error) => {
    console.error('Error:', error.message);
  };

  const handleProgressUpdate = (progress: number) => {
    console.log('Progress:', progress);
  };

  const handleInterviewAnalysis = async (files: FileList, buyerMapData: ICPValidationResponse) => {
    return Promise.resolve(mockICPValidationResponse);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ICPValidationDashboard
        buyerMapData={mockICPValidationResponse}
        onValidationUpdate={handleValidationUpdate}
        onError={handleError}
        onProgressUpdate={handleProgressUpdate}
        handleInterviewAnalysis={handleInterviewAnalysis}
      />
    </div>
  );
};

export default TestDashboard; 