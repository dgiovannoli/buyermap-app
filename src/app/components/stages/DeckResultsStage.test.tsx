import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeckResultsStage from './DeckResultsStage';
import { BuyerMapData } from '../../../types/buyermap';

// Mock the ICPValidationDashboard component
jest.mock('../../../components/ICPValidationDashboard', () => {
  return function MockICPValidationDashboard(props: any) {
    console.log('ICPValidationDashboard props:', props);
    return <div data-testid="mock-dashboard">Mock Dashboard</div>;
  };
});

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

  it('transforms data correctly when validation data is missing', () => {
    render(
      <DeckResultsStage
        buyerMapData={mockBuyerMapData}
        {...mockHandlers}
      />
    );

    // Verify the dashboard was rendered
    expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument();

    // Check console logs for transformed data
    const consoleLogs = (console.log as jest.Mock).mock.calls;
    const dashboardProps = consoleLogs.find(log => log[0].includes('ICPValidationDashboard props'))?.[1];

    expect(dashboardProps).toBeDefined();
    expect(dashboardProps.buyerMapData).toHaveLength(2);
    
    // Verify icpValidation was created
    expect(dashboardProps.buyerMapData[0].icpValidation).toBeDefined();
    expect(dashboardProps.buyerMapData[0].icpValidation).toMatchObject({
      title: 'Buyer Titles',
      subtitle: 'Criminal Defense Attorney ICP',
      cardNumber: 1,
      series: 'ICP Collection 2025',
      totalInterviews: 1
    });

    // Verify validationAttributes were created
    expect(dashboardProps.buyerMapData[0].validationAttributes).toBeDefined();
    expect(dashboardProps.buyerMapData[0].validationAttributes[0]).toMatchObject({
      assumption: 'Attorneys are the primary users and decision-makers',
      reality: 'Many attorneys delegate to paralegals',
      outcome: 'Misaligned',
      confidence: 85
    });
  });

  it('preserves existing validation data when present', () => {
    render(
      <DeckResultsStage
        buyerMapData={mockBuyerMapDataWithValidation}
        {...mockHandlers}
      />
    );

    // Verify the dashboard was rendered
    expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument();

    // Check console logs for transformed data
    const consoleLogs = (console.log as jest.Mock).mock.calls;
    const dashboardProps = consoleLogs.find(log => log[0].includes('ICPValidationDashboard props'))?.[1];

    expect(dashboardProps).toBeDefined();
    expect(dashboardProps.buyerMapData).toHaveLength(1);
    
    // Verify existing icpValidation was preserved
    expect(dashboardProps.buyerMapData[0].icpValidation).toEqual(mockBuyerMapDataWithValidation[0].icpValidation);

    // Verify existing validationAttributes were preserved
    expect(dashboardProps.buyerMapData[0].validationAttributes).toEqual(mockBuyerMapDataWithValidation[0].validationAttributes);
  });

  it('passes all required props to ICPValidationDashboard', () => {
    render(
      <DeckResultsStage
        buyerMapData={mockBuyerMapData}
        {...mockHandlers}
      />
    );

    const consoleLogs = (console.log as jest.Mock).mock.calls;
    const dashboardProps = consoleLogs.find(log => log[0].includes('ICPValidationDashboard props'))?.[1];

    expect(dashboardProps).toBeDefined();
    expect(dashboardProps).toHaveProperty('buyerMapData');
    expect(dashboardProps).toHaveProperty('onError', mockHandlers.onError);
    expect(dashboardProps).toHaveProperty('onProgressUpdate', mockHandlers.onProgressUpdate);
    expect(dashboardProps).toHaveProperty('onValidationUpdate', mockHandlers.onValidationUpdate);
  });
}); 