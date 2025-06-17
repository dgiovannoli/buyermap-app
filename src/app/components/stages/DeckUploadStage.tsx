import { useState } from 'react';
import { BuyerMapData, DeckUploadStageProps, ProcessingProgress } from '../../../types/buyer-map';
import FileDropzone from '../ui/FileDropzone';

export default function DeckUploadStage({ onDeckProcessed, onError, onProgressUpdate }: DeckUploadStageProps) {
  const [uploadedDeck, setUploadedDeck] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (file: File | null) => {
    setUploadedDeck(file);
  };

  const handleProcessDeck = async () => {
    if (!uploadedDeck) return;

    setIsProcessing(true);
    onProgressUpdate({
      phase: 'deck',
      step: 'deck-processing',
      currentBatch: 0,
      totalBatches: 0,
      percentage: 0,
      status: 'processing'
    });
    onError(null);

    try {
      const formData = new FormData();
      formData.append('deck', uploadedDeck);

      const response = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process deck');
      }

      const data = await response.json();
      onDeckProcessed(data);

      onProgressUpdate({
        phase: 'deck',
        step: 'deck-results',
        currentBatch: 0,
        totalBatches: 0,
        percentage: 100,
        status: 'completed'
      });
    } catch (err) {
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

          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Processing your deck...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 