import React, { useState } from 'react';
import { BuyerMapData, ICPValidationResponse, ValidationAttribute } from '../../../types/buyermap';
import ModernBuyerMapLanding from '../../../components/modern-buyermap-landing';
import { 
  createValidationData, 
  createICPValidationData 
} from '../../../utils/dataMapping';

interface DeckResultsStageProps {
  buyerMapData: ICPValidationResponse;
  onError: (error: Error) => void;
  onProgressUpdate: (progress: number) => void;
  onValidationUpdate: (data: ICPValidationResponse) => void;
}

const mapOutcome = (apiOutcome: string): string => {
  const outcomeMap: { [key: string]: string } = {
    'Aligned': 'Aligned',
    'Misaligned': 'Misaligned', 
    'New Data Added': 'New Data Added',
    'Refined': 'Refined',
    'Challenged': 'Challenged'
  };
  
  return outcomeMap[apiOutcome] || 'Refined';
};

const extractRealityText = (processedAssumption: any): string => {
  console.log('[Extract] Processing assumption for reality text:', {
    icpTheme: processedAssumption.icpTheme,
    availableFields: Object.keys(processedAssumption)
  });
  
  // Try different possible field names that might contain the reality text
  const possibleRealityFields = [
    processedAssumption.realityFromInterviews,
    processedAssumption.keyFinding,
    processedAssumption.insights,
    processedAssumption.summary,
    processedAssumption.finding,
    processedAssumption.interviewInsights,
    processedAssumption.realityText,
  ];
  
  // Find the first non-empty reality field
  for (const field of possibleRealityFields) {
    if (field && 
        typeof field === 'string' && 
        field.trim() !== '' && 
        field !== 'Pending validation...' &&
        field.length > 10) {
      console.log('[Extract] Found reality text in field:', field);
      return field.trim();
    }
  }
  
  // If no direct reality field, try to construct from other data
  if (processedAssumption.confidenceExplanation && 
      processedAssumption.confidenceExplanation !== 'No data available') {
    
    // Create reality text from confidence explanation + outcome
    const outcome = processedAssumption.comparisonOutcome || 'Unknown';
    const explanation = processedAssumption.confidenceExplanation;
    
    if (outcome === 'Aligned') {
      return `Interviews confirm the assumption. ${explanation}`;
    } else if (outcome === 'Misaligned') {
      return `Interviews challenge the assumption. ${explanation}`;
    } else if (outcome === 'Refined' || outcome === 'New Data Added') {
      return `Interviews provide additional insights. ${explanation}`;
    }
    
    return `Analysis reveals: ${explanation}`;
  }
  
  // Final fallback
  console.warn('[Extract] No reality text found, using fallback');
  return "Interview analysis completed - see supporting quotes for detailed insights.";
};

const transformApiResponseToBuyerMapData = (apiResponse: any, originalData: ICPValidationResponse): ICPValidationResponse => {
  console.log('[Transform] Starting data transformation...');
  console.log('[Transform] Original data structure:', {
    assumptions: originalData.assumptions?.length,
    validationAttributes: Object.keys(originalData.validationAttributes || {})
  });
  
  // Create updated assumptions array
  const updatedAssumptions = apiResponse.assumptions.map((processedAssumption: any) => {
    console.log(`[Transform] Processing assumption:`, {
      icpTheme: processedAssumption.icpTheme,
      v1Assumption: processedAssumption.v1Assumption
    });
    
    // Extract reality text from the processed assumption
    const realityText = extractRealityText(processedAssumption);
    console.log(`[Transform] Extracted reality:`, realityText);
    
    return {
      ...processedAssumption,
      realityFromInterviews: realityText,
      comparisonOutcome: mapOutcome(processedAssumption.comparisonOutcome),
      quotes: (processedAssumption.quotes || []).slice(0, 3) // Limit quotes for display
    };
  });
  
  // Create updated validation attributes
  const updatedValidationAttributes = { ...originalData.validationAttributes };
  
  // Update validation attributes with new data
  updatedAssumptions.forEach((assumption: any) => {
    const attributeKey = assumption.icpTheme?.toLowerCase().replace(/\s+/g, '-');
    if (attributeKey && updatedValidationAttributes[attributeKey]) {
      updatedValidationAttributes[attributeKey] = {
        ...updatedValidationAttributes[attributeKey],
        reality: assumption.realityFromInterviews,
        outcome: assumption.comparisonOutcome,
        confidence: assumption.confidenceScore || assumption.confidence || updatedValidationAttributes[attributeKey].confidence,
        confidence_explanation: assumption.confidenceExplanation || updatedValidationAttributes[attributeKey].confidence_explanation,
        quotes: assumption.quotes || []
      };
    }
  });
  
  // Return transformed data
  return {
    ...apiResponse,
    assumptions: updatedAssumptions,
    validationAttributes: updatedValidationAttributes
  };
};

const DeckResultsStage: React.FC<DeckResultsStageProps> = ({
  buyerMapData,
  onError,
  onProgressUpdate,
  onValidationUpdate
}) => {
  // Add local step state for navigation if needed
  const [currentStep, setCurrentStep] = useState<number>(3);

  console.log('buyerMapData received:', buyerMapData, typeof buyerMapData);
  console.log('buyerMapData structure:', JSON.stringify(buyerMapData, null, 2));

  const handleInterviewAnalysis = async (files: FileList, currentData: ICPValidationResponse) => {
    try {
      console.log('[Parent] Starting REAL interview analysis API call...');
      onProgressUpdate?.(10);

      // Create FormData for file upload
      const formData = new FormData();
      // Add files with correct field name
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      // Always use currentData.assumptions directly
      formData.append('assumptions', JSON.stringify(currentData.assumptions));
      // Add debugging
      console.log('[Parent] FormData being sent:');
      console.log('- Files count:', files.length);
      console.log('- File names:', Array.from(files).map(f => f.name));
      console.log('- Assumptions count:', currentData.assumptions.length);

      onProgressUpdate?.(30);
      console.log('[Parent] Making API call to /api/analyze-interviews...');

      // Make the actual API call
      const response = await fetch('/api/analyze-interviews', {
        method: 'POST',
        body: formData,
      });

      onProgressUpdate?.(70);

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const apiResult = await response.json();
      console.log('[Parent] Full API response:', JSON.stringify(apiResult, null, 2));
      console.log('[Parent] First assumption structure:', apiResult.assumptions?.[0]);
      console.log('[Parent] Available fields in assumption:', Object.keys(apiResult.assumptions?.[0] || {}));

      // Transform API response to proper format
      const updatedData = transformApiResponseToBuyerMapData(apiResult, currentData);
      console.log('[Parent] Transformed data:', updatedData);

      onProgressUpdate?.(100);
      console.log('[Parent] Returning updated data:', updatedData);
      return updatedData;
    } catch (error) {
      console.error('[Parent] API call failed:', error);
      onProgressUpdate?.(0);
      throw error;
    }
  };

  const handleUploadError = (error: Error) => {
    console.error('[Parent] Interview upload error:', error);
    onError(error);
  };

  const handleProgressUpdate = (progress: number) => {
    console.log('[Parent] Upload progress:', progress + '%');
    onProgressUpdate(progress);
  };

  const handleValidationUpdate = (updatedData: ICPValidationResponse) => {
    console.log('[Parent] handleValidationUpdate called with:', updatedData);
    // Ensure we're working with the correct data structure
    if (!updatedData || !Array.isArray(updatedData.assumptions)) {
      console.error('[Parent] ERROR: updatedData is not a valid ICPValidationResponse');
      return;
    }
    // Call the parent's validation update with proper structure
    onValidationUpdate?.(updatedData);
  };

  return (
    <ModernBuyerMapLanding
      buyerMapData={buyerMapData.assumptions}
      overallScore={buyerMapData.overallAlignmentScore}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
    />
  );
};

export default DeckResultsStage; 