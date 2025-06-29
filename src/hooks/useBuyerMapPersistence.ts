import { useState, useEffect, useCallback } from 'react';
import { BuyerMapData } from '../types/buyermap';
import { buyerMapService, BuyerMapSession } from '../lib/buyer-map-service';

interface PersistenceState {
  buyerMapData: BuyerMapData[];
  score: number | null;
  scoreBreakdown?: any;
  outcomeWeights?: any;
  summary?: any;
  currentStep: number;
  uploaded: boolean;
  expandedId: number | null;
}

interface UseBuyerMapPersistenceReturn {
  // State
  state: PersistenceState;
  
  // Actions
  saveData: (data: Partial<PersistenceState>) => Promise<void>;
  loadData: (sessionId?: string) => Promise<void>;
  clearData: () => void;
  createSession: (name: string, description?: string) => Promise<string>;
  getSessions: () => Promise<BuyerMapSession[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  
  // Status
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentSessionId: string | null;
}

export function useBuyerMapPersistence(): UseBuyerMapPersistenceReturn {
  const [state, setState] = useState<PersistenceState>({
    buyerMapData: [],
    score: null,
    scoreBreakdown: undefined,
    outcomeWeights: undefined,
    summary: undefined,
    currentStep: 1,
    uploaded: false,
    expandedId: null
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await buyerMapService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      if (typeof window === 'undefined') return;

      const storedData = localStorage.getItem('buyerMapData');
      const storedScore = localStorage.getItem('buyerMapScore');
      const storedCurrentStep = localStorage.getItem('buyerMapCurrentStep');
      const storedUploaded = localStorage.getItem('buyerMapUploaded');
      const storedScoreBreakdown = localStorage.getItem('buyerMapScoreBreakdown');
      const storedOutcomeWeights = localStorage.getItem('buyerMapOutcomeWeights');
      const storedSummary = localStorage.getItem('buyerMapSummary');
      const storedExpandedId = localStorage.getItem('buyerMapExpandedId');

      if (storedData) {
        const buyerMapData = JSON.parse(storedData);
        setState(prev => ({
          ...prev,
          buyerMapData,
          score: storedScore ? JSON.parse(storedScore) : null,
          currentStep: storedCurrentStep ? JSON.parse(storedCurrentStep) : 1,
          uploaded: storedUploaded ? JSON.parse(storedUploaded) : false,
          scoreBreakdown: storedScoreBreakdown ? JSON.parse(storedScoreBreakdown) : undefined,
          outcomeWeights: storedOutcomeWeights ? JSON.parse(storedOutcomeWeights) : undefined,
          summary: storedSummary ? JSON.parse(storedSummary) : undefined,
          expandedId: storedExpandedId ? JSON.parse(storedExpandedId) : null
        }));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const saveToLocalStorage = useCallback((data: Partial<PersistenceState>) => {
    try {
      if (typeof window === 'undefined') return;

      if (data.buyerMapData) {
        localStorage.setItem('buyerMapData', JSON.stringify(data.buyerMapData));
      }
      if (data.score !== undefined) {
        localStorage.setItem('buyerMapScore', JSON.stringify(data.score));
      }
      if (data.currentStep !== undefined) {
        localStorage.setItem('buyerMapCurrentStep', JSON.stringify(data.currentStep));
      }
      if (data.uploaded !== undefined) {
        localStorage.setItem('buyerMapUploaded', JSON.stringify(data.uploaded));
      }
      if (data.scoreBreakdown !== undefined) {
        localStorage.setItem('buyerMapScoreBreakdown', JSON.stringify(data.scoreBreakdown));
      }
      if (data.outcomeWeights !== undefined) {
        localStorage.setItem('buyerMapOutcomeWeights', JSON.stringify(data.outcomeWeights));
      }
      if (data.summary !== undefined) {
        localStorage.setItem('buyerMapSummary', JSON.stringify(data.summary));
      }
      if (data.expandedId !== undefined) {
        localStorage.setItem('buyerMapExpandedId', JSON.stringify(data.expandedId));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  const saveData = useCallback(async (data: Partial<PersistenceState>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Update local state
      setState(prev => ({ ...prev, ...data }));

      // Save to localStorage immediately
      saveToLocalStorage(data);

      // If authenticated and we have a session, save to Supabase
      if (isAuthenticated && currentSessionId && data.buyerMapData) {
        await buyerMapService.saveToSupabase(currentSessionId, {
          buyerMapData: data.buyerMapData,
          score: data.score || 0,
          scoreBreakdown: data.scoreBreakdown,
          outcomeWeights: data.outcomeWeights,
          summary: data.summary,
          currentStep: data.currentStep || 1
        });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentSessionId, saveToLocalStorage]);

  const loadData = useCallback(async (sessionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (sessionId && isAuthenticated) {
        // Load from Supabase
        const supabaseData = await buyerMapService.loadFromSupabase(sessionId);
        if (supabaseData) {
          setState({
            buyerMapData: supabaseData.buyerMapData,
            score: supabaseData.score,
            scoreBreakdown: supabaseData.scoreBreakdown,
            outcomeWeights: supabaseData.outcomeWeights,
            summary: supabaseData.summary,
            currentStep: supabaseData.currentStep,
            uploaded: supabaseData.buyerMapData.length > 0,
            expandedId: null
          });

          // Also save to localStorage for offline access
          saveToLocalStorage({
            buyerMapData: supabaseData.buyerMapData,
            score: supabaseData.score,
            scoreBreakdown: supabaseData.scoreBreakdown,
            outcomeWeights: supabaseData.outcomeWeights,
            summary: supabaseData.summary,
            currentStep: supabaseData.currentStep,
            uploaded: supabaseData.buyerMapData.length > 0
          });

          setCurrentSessionId(sessionId);
          buyerMapService.setCurrentSessionId(sessionId);
        }
      } else {
        // Load from localStorage
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, saveToLocalStorage]);

  const clearData = useCallback(() => {
    try {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('buyerMapData');
        localStorage.removeItem('buyerMapScore');
        localStorage.removeItem('buyerMapCurrentStep');
        localStorage.removeItem('buyerMapUploaded');
        localStorage.removeItem('buyerMapScoreBreakdown');
        localStorage.removeItem('buyerMapOutcomeWeights');
        localStorage.removeItem('buyerMapSummary');
        localStorage.removeItem('buyerMapExpandedId');
      }

      // Reset state
      setState({
        buyerMapData: [],
        score: null,
        scoreBreakdown: undefined,
        outcomeWeights: undefined,
        summary: undefined,
        currentStep: 1,
        uploaded: false,
        expandedId: null
      });

      setCurrentSessionId(null);
      buyerMapService.setCurrentSessionId(null);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }, []);

  const createSession = useCallback(async (name: string, description?: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await buyerMapService.createSession(name, description);
      setCurrentSessionId(session.id);
      buyerMapService.setCurrentSessionId(session.id);
      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSessions = useCallback(async (): Promise<BuyerMapSession[]> => {
    try {
      return await buyerMapService.getSessions();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sessions');
      return [];
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await buyerMapService.deleteSession(sessionId);
      
      // If this was the current session, clear it
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        buyerMapService.setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  return {
    state,
    saveData,
    loadData,
    clearData,
    createSession,
    getSessions,
    deleteSession,
    isAuthenticated,
    isLoading,
    error,
    currentSessionId
  };
} 