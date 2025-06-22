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
  totalFiles?: number;
  processingFiles?: number;
  queuedFiles?: number;
  estimatedTimeRemaining?: number;
  actualTimeElapsed?: number;
}

interface ProcessingState {
  phase: 'idle' | 'deck' | 'interview';
  progress: number;
  currentStep: string;
  stats: ProcessingStats;
  isComplete: boolean;
  error?: string;
  startTime?: number;
  estimatedDuration?: number;
}

export function useProcessingProgress() {
  const [state, setState] = useState<ProcessingState>({
    phase: 'idle',
    progress: 0,
    currentStep: '',
    stats: {},
    isComplete: false
  });

  // Calculate time estimates based on real data
  const getEstimatedDuration = (phase: 'deck' | 'interview', fileCount: number = 1): number => {
    if (phase === 'deck') {
      return 10000; // 10 seconds in milliseconds
    } else {
      // Interview processing: ~78 seconds for 3 interviews, scales with batching
      const baseTimePerBatch = 78000; // 78 seconds in milliseconds
      const maxConcurrent = 5;
      const batches = Math.ceil(fileCount / maxConcurrent);
      return batches * baseTimePerBatch;
    }
  };

  // Simulate deck processing progress with more realistic timing
  const startDeckProcessing = useCallback((totalSlides: number = 12) => {
    const startTime = Date.now();
    const estimatedDuration = getEstimatedDuration('deck', 1);
    
    setState({
      phase: 'deck',
      progress: 0,
      currentStep: 'extracting',
      stats: { 
        totalSlides, 
        slidesProcessed: 0, 
        assumptionsFound: 0,
        totalFiles: 1,
        processingFiles: 1,
        queuedFiles: 0
      },
      isComplete: false,
      startTime,
      estimatedDuration
    });

    let progress = 0;
    let slidesProcessed = 0;
    let assumptionsFound = 0;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressFromTime = (elapsed / estimatedDuration) * 100;
      
      // Use time-based progress but add some randomness for realism
      progress = Math.min(progressFromTime + (Math.random() * 5 - 2.5), 100);
      
      // Update stats based on progress with more realistic phases
      if (progress < 25) {
        // Initial extraction phase - slower slide processing
        slidesProcessed = Math.min(Math.floor((progress / 25) * (totalSlides * 0.3)), Math.floor(totalSlides * 0.3));
      } else if (progress < 50) {
        // Content analysis phase
        slidesProcessed = Math.min(Math.floor(totalSlides * 0.3) + Math.floor(((progress - 25) / 25) * (totalSlides * 0.4)), Math.floor(totalSlides * 0.7));
      } else if (progress < 75) {
        // Deep analysis and assumption identification
        slidesProcessed = Math.min(Math.floor(totalSlides * 0.7) + Math.floor(((progress - 50) / 25) * (totalSlides * 0.3)), totalSlides);
        assumptionsFound = Math.min(Math.floor(((progress - 50) / 25) * 5), 5);
      } else if (progress < 90) {
        // Categorizing and structuring phase
        slidesProcessed = totalSlides;
        assumptionsFound = Math.min(5 + Math.floor(((progress - 75) / 15) * 3), 7);
      } else {
        // Final validation and structuring
        assumptionsFound = Math.min(assumptionsFound + Math.floor(Math.random() * 2), 8);
      }

      const timeRemaining = Math.max(0, estimatedDuration - elapsed);

      setState(prev => ({
        ...prev,
        progress: Math.min(progress, 100),
        stats: {
          ...prev.stats,
          slidesProcessed,
          assumptionsFound,
          actualTimeElapsed: elapsed,
          estimatedTimeRemaining: timeRemaining
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
    }, 500); // Update every 0.5 seconds for smoother progress

    return () => clearInterval(interval);
  }, []);

  // Enhanced interview processing with better timing alignment and queue visualization
  const startInterviewProcessing = useCallback((
    totalConversations: number = 6,
    assumptions: string[] = []
  ) => {
    const startTime = Date.now();
    const estimatedDuration = getEstimatedDuration('interview', totalConversations);
    const maxConcurrent = 5;
    const processingFiles = Math.min(totalConversations, maxConcurrent);
    const queuedFiles = Math.max(0, totalConversations - maxConcurrent);
    
    setState({
      phase: 'interview',
      progress: 0,
      currentStep: 'connecting',
      stats: { 
        totalConversations, 
        conversationsProcessed: 0, 
        quotesFound: 0, 
        uniqueSpeakers: 0,
        statisticalValidity: 'limited',
        totalFiles: totalConversations,
        processingFiles,
        queuedFiles
      },
      isComplete: false,
      startTime,
      estimatedDuration
    });

    let progress = 0;
    let conversationsProcessed = 0;
    let quotesFound = 0;
    let uniqueSpeakers = 0;
    let currentAssumptionIndex = 0;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressFromTime = (elapsed / estimatedDuration) * 100;
      
      // Use time-based progress for more accurate estimates
      progress = Math.min(progressFromTime + (Math.random() * 3 - 1.5), 100);
      
      // Update queue status based on progress
      const currentProcessingFiles = Math.min(
        Math.ceil((progress / 100) * totalConversations),
        maxConcurrent
      );
      const currentQueuedFiles = Math.max(
        0, 
        totalConversations - Math.ceil((progress / 100) * totalConversations)
      );
      
      // Update stats based on progress
      if (progress < 15) {
        // Connecting phase - slower start
        // No stats updates yet
      } else if (progress < 70) {
        // Processing conversations phase - longer duration
        conversationsProcessed = Math.min(
          Math.floor(((progress - 15) / 55) * totalConversations), 
          totalConversations
        );
        
        // Update current assumption being processed
        if (assumptions.length > 0) {
          currentAssumptionIndex = Math.floor(((progress - 15) / 55) * assumptions.length);
        }
      } else if (progress < 85) {
        // Extracting quotes phase
        quotesFound = Math.min(quotesFound + Math.floor(Math.random() * 4 + 1), 50);
        uniqueSpeakers = Math.min(conversationsProcessed, totalConversations);
        conversationsProcessed = totalConversations;
      } else if (progress < 95) {
        // Validation phase
        quotesFound = Math.min(quotesFound + Math.floor(Math.random() * 3), 55);
        
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
      const timeRemaining = Math.max(0, estimatedDuration - elapsed);

      setState(prev => ({
        ...prev,
        progress: Math.min(progress, 100),
        stats: {
          ...prev.stats,
          conversationsProcessed,
          quotesFound,
          uniqueSpeakers,
          processingFiles: currentProcessingFiles,
          queuedFiles: currentQueuedFiles,
          currentAssumption: currentAssumption.length > 50 
            ? currentAssumption.substring(0, 47) + '...' 
            : currentAssumption,
          actualTimeElapsed: elapsed,
          estimatedTimeRemaining: timeRemaining
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
    }, 1000); // Update every 1 second for better time tracking

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