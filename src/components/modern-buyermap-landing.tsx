import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Building, Target, AlertCircle, Trophy, Zap, Shield, MessageSquare
} from 'lucide-react';
import { BuyerMapData } from '../types/buyermap';
import DetailedValidationCard from './DetailedValidationCard';
import { mapBuyerMapToValidationData } from '../utils/mapToValidationData';
import UploadComponent from './UploadComponent';
import { MOCK_BUYER_MAP_DATA } from './__mocks__/buyerMapData';

// Assume buyerMapData and overallScore are passed as props or from parent state
// interface BuyerMapData, Quote, etc. should be imported from types if needed

// Helper: Section and Icon Mapping
const getSectionInfo = (icpAttribute: string = '') => {
  const attribute = icpAttribute?.toLowerCase() || '';
  if (attribute.includes('buyer') || attribute.includes('title') || attribute.includes('decision maker')) {
    return {
      section: 'WHO',
      category: 'Buyer Titles',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      titleColor: 'text-blue-800'
    };
  }
  if (attribute.includes('company') || attribute.includes('size') || attribute.includes('firm')) {
    return {
      section: 'WHO',
      category: 'Company Size', 
      icon: Building,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      titleColor: 'text-purple-800'
    };
  }
  if (attribute.includes('pain') || attribute.includes('problem') || attribute.includes('challenge')) {
    return {
      section: 'WHAT',
      category: 'Pain Points',
      icon: AlertCircle,
      iconColor: 'text-red-600', 
      iconBg: 'bg-red-100',
      titleColor: 'text-red-800'
    };
  }
  if (attribute.includes('desired') || attribute.includes('outcome') || attribute.includes('goal')) {
    return {
      section: 'WHAT',
      category: 'Desired Outcomes',
      icon: Trophy,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100', 
      titleColor: 'text-green-800'
    };
  }
  if (attribute.includes('trigger') || attribute.includes('timing') || attribute.includes('when')) {
    return {
      section: 'WHEN',
      category: 'Triggers',
      icon: Zap,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      titleColor: 'text-orange-800'
    };
  }
  if (attribute.includes('barrier') || attribute.includes('objection') || attribute.includes('concern')) {
    return {
      section: 'WHY',
      category: 'Barriers',
      icon: Shield,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      titleColor: 'text-indigo-800'
    };
  }
  if (attribute.includes('messaging') || attribute.includes('communication') || attribute.includes('emphasis')) {
    return {
      section: 'WHY',
      category: 'Messaging Emphasis',
      icon: MessageSquare,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      titleColor: 'text-teal-800'
    };
  }
  // Default fallback
  return {
    section: 'OTHER',
    category: icpAttribute || 'Unknown',
    icon: Target,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
    titleColor: 'text-gray-800'
  };
};

const getOutcomeTextColor = (outcome: string): string => {
  switch (outcome) {
    case 'Aligned': return 'text-green-600';
    case 'New Data Added': return 'text-blue-600'; 
    case 'Misaligned': return 'text-red-600';
    case 'Refined': return 'text-orange-600';
    default: return 'text-gray-600';
  }
};

// Example getScoreMessage helper
const getScoreMessage = (score: number): string => {
  if (score >= 90) return 'Excellent alignment with ICP!';
  if (score >= 75) return 'Strong alignment, some areas to refine.';
  if (score >= 50) return 'Moderate alignment, review key assumptions.';
  return 'Significant misalignment, revisit ICP assumptions.';
};

interface ModernBuyerMapLandingProps {
  buyerMapData: BuyerMapData[];
  overallScore: number;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  initialInsights?: BuyerMapData[]; // Optional prop for testing/mock data
}

const ModernBuyerMapLanding: React.FC<ModernBuyerMapLandingProps> = ({ 
  buyerMapData, 
  overallScore, 
  currentStep, 
  setCurrentStep,
  initialInsights 
}) => {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  // Debug logging for environment variable
  useEffect(() => {
    console.log('🔥 NEXT_PUBLIC_USE_MOCK is:', process.env.NEXT_PUBLIC_USE_MOCK);
    console.log('🔥 isMock boolean flag:', isMock);
  }, [isMock]);
  
  // Pick from real data or mocks - prioritize mock mode
  const initialLocalData = isMock 
    ? MOCK_BUYER_MAP_DATA 
    : (initialInsights ?? buyerMapData ?? []);
  
  // If we have buyerMapData, it means deck was already processed, so set uploaded to true
  const [uploaded, setUploaded] = useState<boolean>(isMock || (buyerMapData?.length ?? 0) > 0);
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    deck: File[];
    interviews: File[];
  }>({
    deck: [],
    interviews: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingInterviews, setUploadingInterviews] = useState(false);
  const [localBuyerMapData, setLocalBuyerMapData] = useState<BuyerMapData[]>(initialLocalData);
  const [score, setScore] = useState<number | null>(isMock ? overallScore : null);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{id:string;score:number;text:string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-setup for mock mode
  useEffect(() => {
    if (!isMock) return;         // bail out immediately when mocks are OFF
    
    if (!uploaded) {
      // Simulate the upload completion and jump directly to results
      setUploaded(true);
      setCurrentStep(3);
      // Set mock score based on the mock data (mock mode exception)
      const mockScore = calculateOverallScore(MOCK_BUYER_MAP_DATA);
      setScore(mockScore);
    }
  }, [isMock, uploaded, setCurrentStep]);

  // Add effect to log state changes
  useEffect(() => {
    console.log('showUploadMore state changed:', showUploadMore);
  }, [showUploadMore]);

  // Add debug logging for currentStep changes
  useEffect(() => {
    console.log('currentStep changed:', currentStep);
  }, [currentStep]);

  // Add effect to log localBuyerMapData updates
  useEffect(() => {
    console.log('localBuyerMapData updated:', localBuyerMapData);
  }, [localBuyerMapData]);

  // Add debug logging for render
  console.log('Rendering component with:', {
    currentStep,
    showUploadMore,
    score,
    uploaded,
    isDemoMode,
    isMock,
    localBuyerMapDataLength: localBuyerMapData?.length ?? 0
  });

  // Helper to calculate overall score (simple average for demo)
  const calculateOverallScore = (data: BuyerMapData[]) => {
    if (!data.length) return 0;
    const total = data.reduce((sum, item) => sum + (item.confidenceScore || 0), 0);
    return Math.round(total / data.length);
  };

  // Process deck with real API endpoint
  const handleProcessDeck = async (files: File[]) => {
    if (!files.length) {
      console.log('No deck files to process');
      return;
    }

    try {
      const form = new FormData();
      form.append('deck', files[0]);
      console.log('🚀 Sending deck to real API…');
      setIsProcessing(true);
      setProcessError(null);

      const res = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: form,
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('✅ Real API responded:', data);
      
      // Update local state with deck analysis results
      if (data.assumptions) {
        setLocalBuyerMapData(data.assumptions);
        // Don't set score until interviews are processed
        // const calculatedScore = calculateOverallScore(data.assumptions);
        // setScore(calculatedScore);
      }
      
      setUploaded(true);
      setCurrentStep(3);
      
    } catch (err) {
      console.error('❌ Deck upload error', err);
      setProcessError(`Deck processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (type: 'deck' | 'interviews', files: FileList | null) => {
    console.log('handleFileUpload called with:', { type, files });
    if (!files) {
      console.log('No files selected');
      return;
    }
    
    const newFiles = Array.from(files);
    console.log('Processing new files:', newFiles.map(f => f.name));
    
    // Automatically process deck when uploaded
    if (type === 'deck') {
      setUploadedFiles(prev => {
        console.log('Previous files state:', prev);
        const updated = {
          ...prev,
          deck: [newFiles[0]]
        };
        console.log('Updated files state:', updated);
        return updated;
      });
      handleProcessDeck(newFiles);
    }
    
    // Automatically process interviews when uploaded
    if (type === 'interviews') {
      setUploadedFiles(prev => {
        console.log('Previous files state:', prev);
        const updated = {
          ...prev,
          interviews: [...prev.interviews, ...newFiles]
        };
        console.log('Updated files state:', updated);
        return updated;
      });

      // 🚀 Send to your backend with existing assumptions for context
      const form = new FormData();
      newFiles.forEach(file => form.append('transcripts', file));
      
      // Include existing assumptions for interview validation
      if (localBuyerMapData.length > 0) {
        form.append('assumptions', JSON.stringify(localBuyerMapData));
      }
      
      console.log('🚀 Sending transcripts to API…');
      console.log('📁 FormData contents:', newFiles.map(f => f.name));
      console.log('📋 Existing assumptions:', localBuyerMapData.length);
      setUploadingInterviews(true);
      setProcessError(null);
      
      try {
        const res = await fetch('/api/buyermap/interviews', {
          method: 'POST',
          body: form,
        });
        
        if (!res.ok) {
          throw new Error(`Upload failed: ${res.statusText}`);
        }
        
        // 🛠️ Grab the real response body here:
        const payload = await res.json();
        console.log('📦 interview payload', payload);
        
        // 🔍 INSPECT API RESPONSE STRUCTURE (as requested by user)
        console.log('=== API RESPONSE INSPECTION ===');
        console.log('payload.success:', payload.success);
        console.log('payload.assumptionsCount:', payload.assumptions?.length || 0);
        console.log('payload.filesProcessed:', payload.metadata?.totalInterviews || 'unknown');
        console.log('payload.totalQuotes:', payload.metadata?.totalQuotes || 'unknown');
        console.log('payload.processingTime:', payload.metadata?.processingTimeSeconds || 'unknown');
        console.log('payload.assumptions structure:', payload.assumptions?.[0] ? Object.keys(payload.assumptions[0]) : 'no assumptions');
        console.log('First assumption example:', payload.assumptions?.[0]);
        console.log('================================');
        
        if (!payload.success) {
          throw new Error(payload.error || 'Interview analysis failed');
        }

        // 1) Turn our existing buyerMapData array into a lookup map by id
        const byId = new Map<number, BuyerMapData>(
          localBuyerMapData.map((a) => [a.id, { ...a }])
        );

        // 2) For each returned assumption, merge in new fields:
        payload.assumptions.forEach((ia: {
          id: number;
          comparisonOutcome: string;
          confidenceScore: number;
          quotes: any[];
          validationStatus?: string;
          realityFromInterviews?: string;
        }) => {
          const card = byId.get(ia.id);
          if (!card) return;
          
          // Map API outcomes to expected types
          const mapOutcome = (outcome: string) => {
            switch (outcome) {
              case 'Aligned': return 'Aligned' as const;
              case 'Misaligned': return 'Misaligned' as const;
              case 'New Data Added': return 'New Data Added' as const;
              case 'Refined': return 'Refined' as const;
              case 'Challenged': return 'Challenged' as const;
              default: return 'New Data Added' as const;
            }
          };
          
          const mapValidationStatus = (status: string) => {
            switch (status.toLowerCase()) {
              case 'validated': return 'validated' as const;
              case 'partial': return 'partial' as const;
              case 'pending': return 'pending' as const;
              default: return 'pending' as const;
            }
          };
          
          // Update the card with interview validation results
          card.comparisonOutcome = mapOutcome(ia.comparisonOutcome);
          card.validationStatus = mapValidationStatus(ia.validationStatus || ia.comparisonOutcome);
          card.quotes = ia.quotes || [];
          
          // ✅ CRITICAL FIX: Map the realityFromInterviews field
          if (ia.realityFromInterviews) {
            card.realityFromInterviews = ia.realityFromInterviews;
            console.log(`📝 Mapped realityFromInterviews for assumption ${ia.id}:`, ia.realityFromInterviews.substring(0, 100) + '...');
          } else {
            console.log(`⚠️ No realityFromInterviews found for assumption ${ia.id}`);
          }
          
          // Add interview validation to validationAttributes if it exists
          if (card.validationAttributes) {
            card.validationAttributes = [
              ...(card.validationAttributes || []),
              {
                assumption: card.v1Assumption,
                reality: ia.realityFromInterviews || `Interview validation: ${ia.comparisonOutcome}`,
                outcome: mapOutcome(ia.comparisonOutcome),
                confidence: ia.confidenceScore,
                confidence_explanation: `From ${payload.metadata?.totalInterviews || 'multiple'} interviews – confidence ${ia.confidenceScore}%`,
                quotes: ia.quotes,
              }
            ];
          }
        });

        // 3) Write the merged array back into state:
        const mergedData = Array.from(byId.values());
        setLocalBuyerMapData(mergedData);
        
        // Update overall score from API response
        const calculatedScore = payload.overallAlignmentScore || calculateOverallScore(mergedData);
        setScore(calculatedScore);
        
        console.log('✅ Interview validation merged successfully:', {
          totalQuotes: payload.metadata?.totalQuotes || 0,
          processingTime: payload.metadata?.processingTimeSeconds || 'unknown',
          validatedCount: payload.validatedCount,
          partiallyValidatedCount: payload.partiallyValidatedCount,
          pendingCount: payload.pendingCount
        });
        
        // ▶️ Advance to results step:
        setCurrentStep(3);
        setUploaded(true);
        
      } catch (err) {
        console.error('❌ Transcript upload error', err);
        setProcessError(`Interview processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setUploadingInterviews(false);
      }
    }
  };
  const removeFile = (type: string, index: number | null = null) => {
    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: [] }));
    } else {
      setUploadedFiles(prev => ({
        ...prev,
        interviews: prev.interviews.filter((_, i) => i !== index)
      }));
    }
  };

  // Section filter
  const getFilteredDataBySection = (section: string): BuyerMapData[] => {
    const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    return allData.filter((item: BuyerMapData) => {
      const sectionInfo = getSectionInfo(item.icpAttribute);
      return sectionInfo.section === section;
    });
  };

  // Helper to check if interviews exist
  const hasInterviews = uploadedFiles.interviews.length > 0;

  // Trigger deck processing when deck files are uploaded
  useEffect(() => {
    if (uploadedFiles.deck.length > 0 && !uploaded) {
      // Deck processing happens in handleFileUpload for 'deck' type
      console.log('Deck files detected, processing handled in upload handler');
    }
  }, [uploadedFiles.deck, uploaded]);

  // Auto-advance to results when buyerMapData is provided
  useEffect(() => {
    const hasData = localBuyerMapData.length > 0 || buyerMapData.length > 0;
    if (hasData && currentStep < 3) {
      setCurrentStep(3);
      setUploaded(true);
      // Don't calculate score until interviews are processed
      // const dataToScore = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
      // const calculatedScore = calculateOverallScore(dataToScore);
      // setScore(calculatedScore);
    }
  }, [localBuyerMapData, buyerMapData, currentStep, setCurrentStep]);

  // Transform buyerMapData to validationInsights format for DetailedValidationCard
  const validationInsights = useMemo(() => {
    const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
    const hasInterviews = uploadedFiles.interviews.length > 0;
    
    const insights = allData.map(item => ({
      id: item.id,
      icpAttribute: item.icpAttribute || '',
      title: item.v1Assumption || item.whyAssumption || '',
      // Only show actual outcome and confidence if interviews have been uploaded
      outcome: hasInterviews ? item.comparisonOutcome : 'Pending Validation',
      confidence: hasInterviews ? (item.confidenceScore || 0) : 0,
      confidenceExplanation: item.confidenceExplanation || '',
      reality: item.realityFromInterviews || '',
      quotes: (item.quotes || []).map(q => ({
        text: q.text || q.quote || '',
        author: q.speaker || 'Anonymous',
        role: q.role || ''
      })),
      isPending: !hasInterviews
    }));
    
    // Debug log to verify reality field mapping
    console.log('🔍 ValidationInsights transformation:');
    insights.forEach(insight => {
      console.log(`  Assumption ${insight.id}: outcome="${insight.outcome}", isPending=${insight.isPending}, reality="${insight.reality ? insight.reality.substring(0, 50) + '...' : 'EMPTY'}"`);
    });
    
    return insights;
  }, [localBuyerMapData, buyerMapData, uploadedFiles.interviews.length]);

  // Search handler function
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/search-insights', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ query: searchTerm, k: 5 }),
      });
      
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }
      
      const data = await res.json();
      setSearchResults(data.hits || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Bypass logic for mock mode or when no data is available to show
  if (!uploaded && localBuyerMapData.length === 0 && buyerMapData.length === 0) {
    return <UploadComponent onComplete={() => {
      // Load mock data directly
      setLocalBuyerMapData(MOCK_BUYER_MAP_DATA);
      // Don't set score until interviews are processed (mock mode exception)
      if (isMock) {
        setScore(calculateOverallScore(MOCK_BUYER_MAP_DATA));
      }
      setCurrentStep(3);
      setUploaded(true);
    }} />;
  }

  // Main return with step indicator and step conditionals
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 2: Upload */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Materials</h2>
              <p className="text-gray-600">We'll validate your ICP assumptions against interview data</p>
            </div>
            {processError && (
              <div className="text-center text-red-600 font-semibold mb-4">{processError}</div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2">Sales Deck / Pitch Materials</h3>
                <p className="text-gray-500 mb-4">Upload your current sales presentation</p>
                {uploadedFiles.deck.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{uploadedFiles.deck[0].name}</span>
                      <button onClick={() => removeFile('deck')} className="text-red-500 hover:text-red-700 text-xl">×</button>
                    </div>
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload('deck', e.target.files)} />
                  <div className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">Choose File</div>
                </label>
              </div>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2">Customer Interview Transcripts</h3>
                <p className="text-gray-500 mb-4">Upload up to 10 interview transcripts</p>
                {uploadedFiles.interviews.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {uploadedFiles.interviews.map((file, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{file.name}</span>
                          <button onClick={() => removeFile('interviews', index)} className="text-red-500 hover:text-red-700 text-xl">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className={uploadingInterviews ? "cursor-not-allowed" : "cursor-pointer"}>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept=".txt,.doc,.docx,.pdf" 
                    disabled={uploadingInterviews}
                    onChange={(e) => {
                      if (!uploadingInterviews) {
                        handleFileUpload('interviews', e.target.files);
                      }
                    }}
                  />
                  <div className={`px-6 py-2 rounded-lg inline-block transition-colors ${
                    uploadingInterviews 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}>
                    {uploadingInterviews ? 'Uploading...' : 'Add Interview Files'}
                  </div>
                </label>
              </div>
            </div>
            <div className="text-center">
              {/* Show different button states based on progress */}
              {!uploaded && uploadedFiles.deck.length === 0 && (
                <p className="text-gray-500 mb-4">Please upload a sales deck to get started</p>
              )}
              {!uploaded && uploadedFiles.deck.length > 0 && (
                <p className="text-blue-600 mb-4">Processing deck...</p>
              )}
              {uploaded && (
                <div>
                  <p className="text-green-600 mb-4">
                    ✅ Deck processed! 
                    {uploadedFiles.interviews.length > 0 
                      ? ` ${uploadedFiles.interviews.length} interview(s) added for validation.`
                      : ' Add interviews to validate assumptions.'
                    }
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    View Results
                  </button>
                  {uploadingInterviews && (
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-blue-600">🚀 Uploading and processing interviews...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <div className="space-y-8" data-testid={isMock ? "mock-dashboard" : "validation-dashboard"}>
            {/* Show deck processed message when no interviews uploaded yet */}
            {uploadedFiles.interviews.length === 0 && !isMock && (
              <div className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-8 mb-8">
                <h2 className="text-xl font-medium mb-2">Deck Analysis Complete</h2>
                <p className="text-lg opacity-90 mb-4">Your assumptions have been extracted from the sales deck.</p>
                <p className="text-base opacity-80 mb-6">Upload interview transcripts to validate these assumptions and get your alignment score.</p>
                <button
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  disabled={uploadingInterviews}
                  className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                    uploadingInterviews 
                      ? 'bg-white/20 text-white/60 cursor-not-allowed' 
                      : 'bg-white text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  {uploadingInterviews ? 'Uploading...' : 'Upload Interview Transcripts'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={(e) => {
                    handleFileUpload('interviews', e.target.files);
                  }}
                />
              </div>
            )}
            
            {/* Enhanced Overall Score Header with integrated navigation */}
            {/* Only show score after interviews have been uploaded and processed */}
            {score !== null && uploadedFiles.interviews.length > 0 && (
              <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-8">
                {/* Page Title */}
                <h2 className="text-xl font-medium mb-2 opacity-90">BuyerMap Validation Results</h2>
                {/* Overall Score */}
                <div className="text-6xl font-bold mb-2">{score}%</div>
                <h3 className="text-lg font-medium mb-4">Overall Alignment Score</h3>
                {/* Score Message */}
                <p className="text-lg opacity-90 mb-4">{getScoreMessage(score)}</p>
                
                {/* Interview Validation Summary */}
                {uploadedFiles.interviews.length > 0 && (
                  <div className="bg-white/20 rounded-lg p-4 mb-4 backdrop-blur-sm">
                    <h4 className="text-sm font-medium mb-2 opacity-90">Interview Validation Status</h4>
                    <div className="flex justify-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold">{localBuyerMapData.filter(item => item.comparisonOutcome === 'Aligned').length}</div>
                        <div className="opacity-80">✅ Validated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{localBuyerMapData.filter(item => item.comparisonOutcome === 'New Data Added').length}</div>
                        <div className="opacity-80">🔄 Partially Validated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{localBuyerMapData.filter(item => !item.comparisonOutcome || item.validationStatus === 'pending').length}</div>
                        <div className="opacity-80">⚠️ Pending Review</div>
                      </div>
                    </div>
                    <p className="text-xs opacity-75 mt-2">
                      Based on {uploadedFiles.interviews.length} interview{uploadedFiles.interviews.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    disabled={uploadingInterviews}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors border border-white/30 ${
                      uploadingInterviews 
                        ? 'bg-white/10 text-white/60 cursor-not-allowed' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {uploadingInterviews 
                      ? 'Uploading...' 
                      : uploadedFiles.interviews.length === 0 
                        ? 'Add Interviews' 
                        : 'Upload More Interviews'
                    }
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      handleFileUpload('interviews', e.target.files);
                    }}
                  />
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-white text-indigo-600 px-8 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Generate Report
                  </button>
                </div>
              </div>
            )}

            {/* Main Container with Glassmorphism */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-8">
              
              {/* Search Insights Section */}
              <div className="mb-8 p-6 bg-white/40 rounded-xl border border-white/30">
                <h2 className="text-lg font-bold text-gray-800 mb-4">🔍 Search Assumptions</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search assumptions (e.g., 'Buyer Titles', 'pain points', 'attorneys')..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button 
                    onClick={handleSearch} 
                    disabled={isSearching || !searchTerm.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isSearching || !searchTerm.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">
                      Search Results ({searchResults.length} found)
                    </h3>
                    <div className="space-y-3">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-4 bg-white/60 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-blue-600">{result.id}</span>
                            <span className="text-sm font-bold text-gray-700">
                              {(result.score * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">{result.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchTerm && searchResults.length === 0 && !isSearching && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      No results found for "{searchTerm}". Try different keywords or broader terms.
                    </p>
                  </div>
                )}
              </div>

              {/* WHO Section */}
              {getFilteredDataBySection("WHO").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    WHO • Target Customer Profile
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHO";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHAT Section */}
              {getFilteredDataBySection("WHAT").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-red-600" />
                    WHAT • Problems & Solutions
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHAT";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHEN Section */}
              {getFilteredDataBySection("WHEN").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-orange-600" />
                    WHEN • Purchase Triggers
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHEN";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* WHY & HOW Section */}
              {getFilteredDataBySection("WHY").length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-indigo-600" />
                    WHY & HOW • Barriers & Messaging
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "WHY";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* Fallback for uncategorized items */}
              {getFilteredDataBySection("OTHER").length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-gray-600" />
                    Other Insights
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {validationInsights
                      .filter(insight => {
                        const allData = localBuyerMapData.length > 0 ? localBuyerMapData : buyerMapData;
                        const item = allData.find(item => item.id === insight.id);
                        return item && getSectionInfo(item.icpAttribute).section === "OTHER";
                      })
                      .map(insight => (
                        <DetailedValidationCard
                          key={insight.id}
                          id={insight.id}
                          attributeTitle={insight.icpAttribute}
                          subtitle={insight.title}
                          hasValidation={true}
                          validation={{
                            outcome: insight.outcome,
                            confidence: insight.confidence,
                            confidence_explanation: insight.confidenceExplanation,
                            reality: insight.reality,
                            quotes: insight.quotes
                          }}
                          isExpanded={expandedId === insight.id}
                          onToggleExpand={(id) =>
                            setExpandedId(prev => prev === id ? null : id)
                          }
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Export */}
        {currentStep === 4 && (
          <div className="text-center p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Your BuyerMap Report</h2>
            <p className="text-gray-600">Export functionality coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernBuyerMapLanding; 