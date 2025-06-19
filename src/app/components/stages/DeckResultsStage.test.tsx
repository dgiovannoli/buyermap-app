import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeckResultsStage from './DeckResultsStage';
import { BuyerMapData } from '../../../types/buyermap';

describe('DeckResultsStage', () => {
  const mockBuyerMapData: BuyerMapData[] = [
    {
      id: 1,
      icpAttribute: 'Buyer Titles',
      icpTheme: 'Criminal Defense Attorney ICP',
      v1Assumption: 'Attorneys are the primary users and decision-makers',
      whyAssumption: 'Based on sales deck analysis',
      evidenceFromDeck: 'Rev deck, Slide: Who is Rev?',
      realityFromInterviews: 'Many attorneys delegate to paralegals',
      comparisonOutcome: 'Misaligned',
      confidenceScore: 85,
      confidenceExplanation: 'Clear trend across interviews',
      quotes: [
        {
          id: '1',
          text: 'I handle most of the transcription work',
          speaker: 'Betty Behrens',
          role: 'Paralegal',
          source: 'Interview 1'
        }
      ],
      validationStatus: 'validated'
    },
    {
      id: 2,
      icpAttribute: 'Company Size',
      icpTheme: 'Criminal Defense Attorney ICP',
      v1Assumption: 'Small to mid-sized firms with high evidence load',
      whyAssumption: 'Based on market research',
      evidenceFromDeck: 'Rev deck, Slide: Target Market',
      realityFromInterviews: 'Confirmed across firm sizes',
      comparisonOutcome: 'Aligned',
      confidenceScore: 90,
      confidenceExplanation: 'Strong validation from multiple sources',
      quotes: [
        {
          id: '2',
          text: 'We are a 15-person firm with high case load',
          speaker: 'John Smith',
          role: 'Attorney',
          source: 'Interview 2'
        }
      ],
      validationStatus: 'validated'
    }
  ];

  const mockBuyerMapDataWithValidation: BuyerMapData[] = [
    {
      ...mockBuyerMapData[0],
      icpValidation: {
        title: 'Buyer Titles',
        subtitle: 'Criminal Defense Attorney ICP',
        cardNumber: 1,
        series: 'ICP Collection 2025',
        totalInterviews: 1
      },
      validationAttributes: [
        {
          assumption: 'Attorneys are the primary users',
          reality: 'Many attorneys delegate to paralegals',
          outcome: 'Misaligned',
          confidence: 85,
          confidence_explanation: 'Clear trend across interviews',
          quotes: [
            {
              id: '1',
              text: 'I handle most of the transcription work',
              speaker: 'Betty Behrens',
              role: 'Paralegal',
              source: 'Interview 1'
            }
          ]
        }
      ]
    }
  ];

  const mockHandlers = {
    onError: jest.fn(),
    onProgressUpdate: jest.fn(),
    onValidationUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard when validation data is present', () => {
    render(
      <DeckResultsStage
        buyerMapData={{
          assumptions: mockBuyerMapData,
          overallAlignmentScore: 87,
          validatedCount: 2,
          partiallyValidatedCount: 0,
          pendingCount: 0,
          validationAttributes: {}
        }}
        {...mockHandlers}
      />
    );

    // Verify the dashboard was rendered by checking for validation dashboard
    expect(screen.getByTestId('validation-dashboard')).toBeInTheDocument();
    
    // Check for the overall score display
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('Overall Alignment Score')).toBeInTheDocument();
    
    // Check for buyer titles content
    expect(screen.getByText('Buyer Titles')).toBeInTheDocument();
  });

  it('displays correct score from provided data', () => {
    render(
      <DeckResultsStage
        buyerMapData={{
          assumptions: mockBuyerMapDataWithValidation,
          overallAlignmentScore: 85,
          validatedCount: 1,
          partiallyValidatedCount: 0,
          pendingCount: 0,
          validationAttributes: {}
        }}
        {...mockHandlers}
      />
    );

    // Verify the dashboard was rendered
    expect(screen.getByTestId('validation-dashboard')).toBeInTheDocument();
    
    // Check for the correct score in the header - more specific selector
    expect(screen.getByText('Overall Alignment Score')).toBeInTheDocument();
    const scoreElements = screen.getAllByText('85%');
    expect(scoreElements.length).toBeGreaterThan(0); // Should find at least one 85%
  });

  it('shows validation insights from provided data', () => {
    render(
      <DeckResultsStage
        buyerMapData={{
          assumptions: mockBuyerMapData,
          overallAlignmentScore: 87,
          validatedCount: 2,
          partiallyValidatedCount: 0,
          pendingCount: 0,
          validationAttributes: {}
        }}
        {...mockHandlers}
      />
    );

    // Verify insights are displayed
    expect(screen.getByText('Buyer Titles')).toBeInTheDocument();
    expect(screen.getByText('Company Size')).toBeInTheDocument();
    
    // Check for validation results text
    expect(screen.getByText(/Attorneys are the primary users/)).toBeInTheDocument();
    expect(screen.getByText(/Small to mid-sized firms/)).toBeInTheDocument();
  });
}); 