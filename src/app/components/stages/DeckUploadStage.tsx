import { useState, useEffect } from 'react';
import { ProcessingProgress } from '../../../types/buyer-map';
import { ICPValidationResponse } from '../../../types/buyermap';
import FileDropzone from '../ui/FileDropzone';
import ProcessVisualization from '../loading/ProcessVisualization';
import { useProcessingProgress } from '../../hooks/useProcessingProgress';

interface DeckUploadStageProps {
  onDeckProcessed: (data: ICPValidationResponse) => void;
  onError: (error: string | null) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
}

export default function DeckUploadStage({ onDeckProcessed, onError, onProgressUpdate }: DeckUploadStageProps) {
  console.log('🔄 DeckUploadStage component rendered');
  const [uploadedDeck, setUploadedDeck] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingProgress = useProcessingProgress();
  
  console.log('🔄 State check:', {
    isProcessing,
    phase: processingProgress.phase,
    progress: processingProgress.progress,
    uploadedDeck: !!uploadedDeck
  });

  // Reset processing state when component mounts
  useEffect(() => {
    console.log('🔄 Component mounted, resetting processing state');
    processingProgress.resetProcessing();
  }, []);

  const handleFileUpload = (file: File | null) => {
    console.log('🔄 File uploaded:', file?.name);
    setUploadedDeck(file);
  };

  const handleProcessDeck = async () => {
    console.log('🔄 handleProcessDeck called, uploadedDeck:', !!uploadedDeck);
    if (!uploadedDeck) return;

    setIsProcessing(true);
    onError(null);

    // Start the enhanced processing visualization
    processingProgress.startDeckProcessing(12); // Assume 12 slides average

    try {
      const formData = new FormData();
      formData.append('deck', uploadedDeck);

      console.log('🔄 Starting API call');
      
      // Just make the API call - the visualization will run independently
      const apiResponse = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: formData
      });

      console.log('🔄 API call completed, status:', apiResponse.status);

      if (!apiResponse.ok) {
        throw new Error('Failed to process deck');
      }

      const data = await apiResponse.json();
      console.log('🔄 API data parsed:', data);

      console.log('🔄 About to call onDeckProcessed');
      onDeckProcessed(data);
      console.log('🔄 onDeckProcessed called successfully');
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-results',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 100,
        status: 'completed'
      });
    } catch (err) {
      processingProgress.setError(err instanceof Error ? err.message : 'Failed to process deck');
      onError(err instanceof Error ? err.message : 'Failed to process deck');
      onProgressUpdate({
        phase: 'deck',
        step: 'deck-upload',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to process deck'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show processing visualization when processing
  if (isProcessing && processingProgress.phase === 'deck') {
    console.log('🔄 Showing ProcessVisualization, progress:', processingProgress.progress);
    return (
      <ProcessVisualization
        phase="deck"
        progress={processingProgress.progress}
        stats={processingProgress.stats}
        onComplete={() => {
          console.log('🔄 ProcessVisualization onComplete called');
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Deck</h2>
          <h3 className="text-xl font-bold mb-4 text-gray-900">We'll validate your ICP assumptions against interview data</h3>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
            <h3 className="text-lg font-semibold mb-2">Sales Deck / Pitch Materials</h3>
            <p className="text-gray-500 mb-4">Upload your current sales presentation</p>
            
            {uploadedDeck ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{uploadedDeck.name}</span>
                  <button onClick={() => handleFileUpload(null)} className="text-red-500 hover:text-red-700 text-xl">×</button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload(e.target.files?.[0] || null)} />
                <div className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">Choose File</div>
              </label>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleProcessDeck}
            disabled={!uploadedDeck || isProcessing}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Process & Analyze'}
          </button>

          {processingProgress.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <span className="text-red-800">{processingProgress.error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 