import React, { useEffect } from 'react';
import { BuyerMapData, ICPValidationResponse } from '../../../types/buyermap';
import ModernBuyerMapLanding from '../../../components/modern-buyermap-landing';

interface DeckResultsStageProps {
  buyerMapData: ICPValidationResponse;
  onError: (error: Error) => void;
  onProgressUpdate: (progress: number) => void;
  onValidationUpdate: (data: ICPValidationResponse) => void;
  onInterviewDataUpdated?: (data: BuyerMapData[]) => void; // Callback for interview data updates
  lastInterviewResult?: any; // Last successful interview result for replay
  onReplayLastInterview?: () => void; // Function to replay last interview
  lastDeckResult?: any; // Last successful deck result for replay
  onReplayLastUpload?: () => void; // Function to replay last deck upload
}

const DeckResultsStage: React.FC<DeckResultsStageProps> = ({
  buyerMapData,
  onError,
  onProgressUpdate,
  onValidationUpdate,
  onInterviewDataUpdated,
  lastInterviewResult,
  onReplayLastInterview,
  lastDeckResult,
  onReplayLastUpload
}) => {
  // Debug: log when buyerMapData prop changes
  useEffect(() => {
    console.log('DeckResultsStage: buyerMapData prop changed:', buyerMapData);
  }, [buyerMapData]);

  useEffect(() => {
    console.log('📊 DeckResultsStage props changed:', buyerMapData?.assumptions?.[0]?.validationAttributes?.[0]?.reality);
  }, [buyerMapData]);

  // Skip directly to results page - no intermediate upload step needed

  console.log('🔍 DeckResultsStage received buyerMapData:', buyerMapData);
  console.log('🔍 buyerMapData.assumptions length:', buyerMapData?.assumptions?.length);
  console.log('🔍 First assumption:', buyerMapData?.assumptions?.[0]);
  console.log('🔍 buyerMapData structure:', JSON.stringify(buyerMapData, null, 2));

  // Log the processed display values for debugging
  buyerMapData?.assumptions?.forEach((assumption, index) => {
    console.log(`🎯 [DeckResultsStage] Using processed assumption ${index}:`, {
      id: assumption.id,
      attribute: assumption.icpAttribute,
      outcome: assumption.displayOutcome,
      confidence: assumption.displayConfidence,
      originalOutcome: assumption._originalOutcome,
      validationOutcome: assumption._validationOutcome
    });
  });

  return (
    <div>
      {/* Always-visible replay buttons at the top of the results screen */}
      <div className="flex flex-row gap-4 mb-6">
        {lastDeckResult && onReplayLastUpload && (
          <button
            onClick={onReplayLastUpload}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            🔁 Replay Last Deck Upload
          </button>
        )}
        {lastInterviewResult && onReplayLastInterview && (
          <button
            onClick={onReplayLastInterview}
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            🔁 Replay Last Interview
          </button>
        )}
      </div>
      <ModernBuyerMapLanding
        buyerMapData={buyerMapData.assumptions}
        overallScore={buyerMapData.overallAlignmentScore}
        currentStep={3} // Skip directly to results + interview upload
        setCurrentStep={() => {}} // No step navigation needed - always show results
        onInterviewDataUpdated={onInterviewDataUpdated}
        lastInterviewResult={lastInterviewResult}
        onReplayLastInterview={onReplayLastInterview}
      />
    </div>
  );
};

export default DeckResultsStage; 