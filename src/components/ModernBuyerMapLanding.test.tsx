import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModernBuyerMapLanding from './modern-buyermap-landing';

// 1️⃣ Mock fetch to return a fake deck-analysis response
const fakeResponse = {
  success: true,
  assumptions: [
    {
      id: 1,
      icpAttribute: 'Buyer Titles',
      icpTheme: 'buyer-titles',
      v1Assumption: 'Our primary buyers are VP Engineering and CTOs',
      whyAssumption: 'Extracted from deck analysis',
      evidenceFromDeck: 'Slide 3 shows our target as executives with budget authority',
      realityFromInterviews: 'Most buyers are actually Engineering Directors and Senior Managers',
      comparisonOutcome: 'Misaligned',
      waysToAdjustMessaging: 'Focus on mid-level decision makers rather than executives',
      confidenceScore: 85,
      confidenceExplanation: 'Strong evidence from customer interviews',
      validationStatus: 'validated',
      quotes: [
        {
          id: "q1",
          text: "I'm an Engineering Director, not a VP. I make the final call on tools for my team.",
          speaker: "Sarah Chen",
          role: "Engineering Director",
          source: "Interview 3"
        }
      ],
      icpValidation: {
        title: 'Buyer Titles',
        subtitle: 'buyer-titles',
        cardNumber: 1,
        series: 'ICP Collection 2025',
        totalInterviews: 1
      },
      validationAttributes: []
    },
  ],
  overallAlignmentScore: 85,
  validatedCount: 1,
  partiallyValidatedCount: 0,
  pendingCount: 0,
};

// Mock the environment variable for consistent testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_USE_MOCK: 'FALSE', // Test real flow, not mock
  };
  
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => fakeResponse,
  } as any);
});

afterEach(() => {
  jest.resetAllMocks();
  process.env = originalEnv;
});

describe('ModernBuyerMapLanding', () => {
  const defaultProps = {
    buyerMapData: [],
    overallScore: 0,
    currentStep: 1,
    setCurrentStep: jest.fn(),
  };

  test('renders upload materials screen initially', () => {
    render(<ModernBuyerMapLanding {...defaultProps} />);
    
    expect(screen.getByText(/upload your materials/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip upload \(demo mode\)/i })).toBeInTheDocument();
  });

  test('shows demo mode when Skip Upload is clicked', () => {
    // Use real state for currentStep to allow auto-advance to work  
    const TestWrapper = () => {
      const [currentStep, setCurrentStep] = React.useState(1);
      
      return (
        <ModernBuyerMapLanding
          buyerMapData={[]}
          overallScore={0}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      );
    };

    render(<TestWrapper />);

    // Click "Skip Upload (Demo Mode)" 
    fireEvent.click(screen.getByRole('button', { name: /skip upload \(demo mode\)/i }));

    // Should now show results with mock data
    expect(screen.getByText(/buyer title/i)).toBeInTheDocument();
  });

  test('shows demo data when skip upload is clicked', async () => {
    // Use real state for currentStep to allow auto-advance to work  
    const TestWrapper = () => {
      const [currentStep, setCurrentStep] = React.useState(1);
      
      return (
        <ModernBuyerMapLanding
          buyerMapData={[]}
          overallScore={0}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      );
    };

    render(<TestWrapper />);

    // Click "Skip Upload (Demo Mode)" to trigger demo flow
    fireEvent.click(screen.getByRole('button', { name: /skip upload \(demo mode\)/i }));

    // Should show demo data immediately
    await waitFor(() => {
      expect(screen.getByText(/buyer title/i)).toBeInTheDocument();
    });
  });

  test('renders with buyer map data when provided', () => {
    // Use real state for currentStep to allow auto-advance to work
    const TestWrapper = () => {
      const [currentStep, setCurrentStep] = React.useState(1);
      
      return (
        <ModernBuyerMapLanding
          buyerMapData={[fakeResponse.assumptions[0] as any]}
          overallScore={85}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      );
    };

    render(<TestWrapper />);

    // Should show results immediately when data is provided
    expect(screen.getByText(/buyer title/i)).toBeInTheDocument();
  });

  test('uses mock data when NEXT_PUBLIC_USE_MOCK is true', () => {
    // Set mock environment
    process.env.NEXT_PUBLIC_USE_MOCK = 'true';
    
    // Use real state for currentStep to allow auto-advance to work  
    const TestWrapper = () => {
      const [currentStep, setCurrentStep] = React.useState(1);
      
      return (
        <ModernBuyerMapLanding
          buyerMapData={[fakeResponse.assumptions[0] as any]} // Use fake assumption data
          overallScore={85}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      );
    };
    
    render(<TestWrapper />);

    // With mock mode, should show results
    expect(screen.getByText(/buyer title/i)).toBeInTheDocument();
    
    // Should have the mock dashboard test ID
    expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument();
    
    // Should not have called fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('renders mock dashboard with correct test ID in mock mode', () => {
    // Set mock environment
    process.env.NEXT_PUBLIC_USE_MOCK = 'true';
    
    // Use real state for currentStep to allow auto-advance to work  
    const TestWrapper = () => {
      const [currentStep, setCurrentStep] = React.useState(1);
      
      return (
        <ModernBuyerMapLanding
          buyerMapData={[]}
          overallScore={0}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      );
    };
    
    render(<TestWrapper />);

    // Should have the mock dashboard test ID
    expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument();
    
    // Should show mock data 
    expect(screen.getByText(/buyer titles/i)).toBeInTheDocument();
    expect(screen.getByText(/company size/i)).toBeInTheDocument();
    expect(screen.getByText(/pain points/i)).toBeInTheDocument();
  });
}); 