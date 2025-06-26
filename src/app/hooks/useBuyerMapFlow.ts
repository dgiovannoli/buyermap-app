"use client";

import { useState, useEffect } from 'react';
import { BuyerMapData } from '../../types/buyermap';
import { buyerMapApi } from '../services/buyerMapApi';

export type Phase = 'home' | 'deck-upload' | 'results' | 'interview-processing' | 'complete';

export function useBuyerMapFlow() {
  // Mock mode control
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  const [phase, setPhase] = useState<Phase>('home');
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[]>([]);

  // Debug phase changes and mock mode
  useEffect(() => {
    console.log('🔄 Phase changed to:', phase);
    
    if (useMock) {
      console.log("⚠️ Running in mock mode. Switch to live data by setting NEXT_PUBLIC_USE_MOCK=false");
    } else {
      console.log("✅ Running with live API + DB + vector storage");
    }
  }, [phase, useMock]);

  const handleStart = () => setPhase('deck-upload');

  const onError = (err: Error | string | null) => {
    if (err === null) {
      // Clear any previous errors
      return;
    }
    
    // Handle different error types
    const message = err instanceof Error ? err.message : err || 'Unknown error';
    console.error('❌ Error in buyer map flow:', err);
    console.error('Error message:', message);
  };

  const onProgressUpdate = (progress: any) => {
    console.log('Progress update:', progress);
  };

  const onValidationUpdate = (data: any) => {
    console.log('Validation update:', data);
    if (data.assumptions) {
      setBuyerMapData(data.assumptions);
      console.log('✅ Updated buyerMapData state with interview validation results');
    } else if (Array.isArray(data)) {
      setBuyerMapData(data);
      console.log('✅ Updated buyerMapData state with interview validation results (array)');
    }
  };

  const handleInterviewUpload = async (
    files: File[],
    assumptions: BuyerMapData[],
    onSuccess: (data: any) => void
  ) => {
    try {
      if (useMock) {
        console.log("⚠️ Interview upload using mock mode (NEXT_PUBLIC_USE_MOCK=true)");
        console.log("📁 Files to upload:", files.map(f => f.name));
      } else {
        console.log("✅ Interview upload using live API integration");
      }
      
      const data = await buyerMapApi.validateInterviews(files, assumptions);
      
      // Update the state with the processed interview data
      if (data.assumptions) {
        setBuyerMapData(data.assumptions);
        console.log('✅ Updated buyerMapData state with processed interview data');
      }
      
      setPhase('interview-processing');
      onSuccess(data);
    } catch (err) {
      console.error('⚠️ [handleInterviewUpload] caught error:', err);
      // Optionally surface error to UI
    }
  };

  const onDeckProcessed = (data: any) => {
    console.log('✅ Deck processed successfully:', data);
    if (data.assumptions) {
      setBuyerMapData(data.assumptions);
      // Go directly to the buyer map results page
      setPhase('results');
    } else {
      console.error('❌ No assumptions found in deck data:', data);
      onError('Invalid response: no assumptions found in deck data');
    }
  };

  const onInterviewUploaded = () => setPhase('interview-processing');

  const onInterviewValidated = (finalData: BuyerMapData[]) => {
    setBuyerMapData(finalData);
    // Stay on the same page but with updated data
  };

  return {
    phase,
    buyerMapData,
    useMock,
    handlers: {
      handleStart,
      handleInterviewUpload,
      onDeckProcessed,
      onInterviewUploaded,
      onInterviewValidated,
      onError,
      onProgressUpdate,
      onValidationUpdate,
    }
  };
} 