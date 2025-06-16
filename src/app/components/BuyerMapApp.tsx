'use client';

import React, { useState } from 'react';
import BuyerMapInterface from './BuyerMapInterface';
import ResultsStep from './steps/ResultsStep';
import ExportStep from './steps/ExportStep';
import { BuyerMapData, Quote, AssumptionData } from '../types/buyermap';
import FileUploadStep from './steps/FileUploadStep';
import BuyerMapHome from './BuyerMapHome';

interface UploadedFiles {
  deck: File | null;
  interviews: File[];
}

export default function BuyerMapApp() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'results'>('upload');
  const [results, setResults] = useState<BuyerMapData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'deck' | 'interviews' | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    deck: File | null;
    interviews: File[];
  }>({
    deck: null,
    interviews: []
  });

  const handleFileUpload = (type: string, files: FileList | null) => {
    if (!files) return;

    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: files[0] }));
    } else if (type === 'interviews') {
      const newInterviews = Array.from(files);
      setUploadedFiles(prev => ({ ...prev, interviews: newInterviews }));
    }
  };

  const handleRemoveFile = (type: string, index?: number) => {
    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: null }));
    } else if (type === 'interviews' && index !== undefined) {
      setUploadedFiles(prev => ({
        ...prev,
        interviews: prev.interviews.filter((_, i) => i !== index)
      }));
    }
  };

  const handleProcessAnalyze = async () => {
    if (!uploadedFiles.deck) return;

    setIsProcessing(true);
    setProcessingStep('deck');

    try {
      // Phase 1: Analyze Sales Deck
      const deckFormData = new FormData();
      deckFormData.append('deck', uploadedFiles.deck);

      const deckResponse = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: deckFormData
      });

      if (!deckResponse.ok) {
        throw new Error('Failed to analyze sales deck');
      }

      const deckData = await deckResponse.json();
      if (!deckData.success) {
        throw new Error(deckData.error || 'Failed to analyze sales deck');
      }

      // Show initial assumptions immediately
      setResults(deckData.assumptions);
      setCurrentStep('results');

      // Phase 2: Process Interviews if available
      if (uploadedFiles.interviews.length > 0) {
        setProcessingStep('interviews');
        const interviewFormData = new FormData();
        uploadedFiles.interviews.forEach(file => {
          interviewFormData.append('interviews', file);
        });
        interviewFormData.append('assumptions', JSON.stringify(deckData.assumptions));

        const interviewResponse = await fetch('/api/analyze-interviews', {
          method: 'POST',
          body: interviewFormData
        });

        if (!interviewResponse.ok) {
          throw new Error('Failed to process interviews');
        }

        const interviewData = await interviewResponse.json();
        if (!interviewData.success) {
          throw new Error(interviewData.error || 'Failed to process interviews');
        }

        // Update results with interview analysis
        setResults(interviewData.updatedAssumptions);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      // TODO: Show error message to user
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleBackToHome = () => {
    setCurrentStep('upload');
    setResults([]);
    setUploadedFiles({ deck: null, interviews: [] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentStep === 'upload' ? (
        <FileUploadStep
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onNext={handleProcessAnalyze}
          onBackToHome={handleBackToHome}
          isProcessing={isProcessing}
          processingStep={processingStep}
        />
      ) : (
        <ResultsStep
          results={results}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
}