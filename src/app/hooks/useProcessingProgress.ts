import { useState, useEffect, useCallback } from 'react';

interface ProcessingStats {
  slidesProcessed?: number;
  totalSlides?: number;
  assumptionsFound?: number;
  quotesFound?: number;
  conversationsProcessed?: number;
  totalConversations?: number;
  currentAssumption?: string;
  uniqueSpeakers?: number;
  statisticalValidity?: 'strong' | 'moderate' | 'limited';
}

interface ProcessingState {
  phase: 'idle' | 'deck' | 'interview';
  progress: number;
  currentStep: string;
  stats: ProcessingStats;
  isComplete: boolean;
  error?: string;
}

export function useProcessingProgress() {
  const [state, setState] = useState<ProcessingState>({
    phase: 'idle',
    progress: 0,
    currentStep: '',
    stats: {},
    isComplete: false
  });

  // Simulate deck processing progress
  const startDeckProcessing = useCallback((totalSlides: number = 12) => {
    setState({
      phase: 'deck',
      progress: 0,
      currentStep: 'extracting',
      stats: { totalSlides, slidesProcessed: 0, assumptionsFound: 0 },
      isComplete: false
    });

    let progress = 0;
    let slidesProcessed = 0;
    let assumptionsFound = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2; // 2-10% increments
      
      // Update stats based on progress
      if (progress < 40) {
        // Extracting phase
        slidesProcessed = Math.min(Math.floor((progress / 40) * totalSlides), totalSlides);
      } else if (progress < 80) {
        // Categorizing phase
        assumptionsFound = Math.min(Math.floor(((progress - 40) / 40) * 7), 7);
        slidesProcessed = totalSlides;
      } else {
        // Structuring phase
        assumptionsFound = Math.min(assumptionsFound + Math.floor(Math.random() * 2), 7);
      }

      setState(prev => ({
        ...prev,
        progress: Math.min(progress, 100),
        stats: {
          ...prev.stats,
          slidesProcessed,
          assumptionsFound
        }
      }));

      if (progress >= 100) {
        clearInterval(interval);
        setState(prev => ({
          ...prev,
          isComplete: true,
          progress: 100
        }));
      }
    }, 800); // Update every 800ms

    return () => clearInterval(interval);
  }, []);

  // Simulate interview processing progress
  const startInterviewProcessing = useCallback((
    totalConversations: number = 6,
    assumptions: string[] = []
  ) => {
    setState({
      phase: 'interview',
      progress: 0,
      currentStep: 'connecting',
      stats: { 
        totalConversations, 
        conversationsProcessed: 0, 
        quotesFound: 0, 
        uniqueSpeakers: 0,
        statisticalValidity: 'limited'
      },
      isComplete: false
    });

    let progress = 0;
    let conversationsProcessed = 0;
    let quotesFound = 0;
    let uniqueSpeakers = 0;
    let currentAssumptionIndex = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 6 + 1; // 1-7% increments (slower than deck)
      
      // Update stats based on progress
      if (progress < 20) {
        // Connecting phase
        // No stats updates yet
      } else if (progress < 60) {
        // Processing conversations phase
        conversationsProcessed = Math.min(
          Math.floor(((progress - 20) / 40) * totalConversations), 
          totalConversations
        );
        
        // Update current assumption being processed
        if (assumptions.length > 0) {
          currentAssumptionIndex = Math.floor(((progress - 20) / 40) * assumptions.length);
        }
      } else if (progress < 80) {
        // Extracting quotes phase
        quotesFound = Math.min(quotesFound + Math.floor(Math.random() * 3 + 1), 45);
        uniqueSpeakers = Math.min(conversationsProcessed, totalConversations);
        conversationsProcessed = totalConversations;
      } else if (progress < 95) {
        // Validation phase
        quotesFound = Math.min(quotesFound + Math.floor(Math.random() * 2), 50);
        
        // Determine statistical validity
        const validity = uniqueSpeakers >= 4 ? 'strong' : 
                        uniqueSpeakers >= 2 ? 'moderate' : 'limited';
        
        setState(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            statisticalValidity: validity
          }
        }));
      }

      const currentAssumption = assumptions[currentAssumptionIndex] || '';

      setState(prev => ({
        ...prev,
        progress: Math.min(progress, 100),
        stats: {
          ...prev.stats,
          conversationsProcessed,
          quotesFound,
          uniqueSpeakers,
          currentAssumption: currentAssumption.length > 50 
            ? currentAssumption.substring(0, 47) + '...' 
            : currentAssumption
        }
      }));

      if (progress >= 100) {
        clearInterval(interval);
        setState(prev => ({
          ...prev,
          isComplete: true,
          progress: 100
        }));
      }
    }, 1200); // Update every 1.2s (slower for interviews)

    return () => clearInterval(interval);
  }, []);

  // Reset processing state
  const resetProcessing = useCallback(() => {
    setState({
      phase: 'idle',
      progress: 0,
      currentStep: '',
      stats: {},
      isComplete: false
    });
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error
    }));
  }, []);

  return {
    ...state,
    startDeckProcessing,
    startInterviewProcessing,
    resetProcessing,
    setError
  };
} 