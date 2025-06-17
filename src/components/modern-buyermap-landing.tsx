import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building, Target, AlertCircle, Trophy, Zap, Shield, MessageSquare,
  ChevronRight, ChevronDown 
} from 'lucide-react';
import { BuyerMapData } from '../types/buyermap';

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
}

const ModernBuyerMapLanding: React.FC<ModernBuyerMapLandingProps> = ({ buyerMapData, overallScore, currentStep, setCurrentStep }) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    deck: File[];
    interviews: File[];
  }>({
    deck: [],
    interviews: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [localBuyerMapData, setLocalBuyerMapData] = useState<BuyerMapData[]>(buyerMapData);
  const [score, setScore] = useState<number>(overallScore);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add effect to log state changes
  useEffect(() => {
    console.log('showUploadMore state changed:', showUploadMore);
  }, [showUploadMore]);

  // Add debug logging for currentStep changes
  useEffect(() => {
    console.log('currentStep changed:', currentStep);
  }, [currentStep]);

  // Add debug logging for render
  console.log('Rendering component with:', {
    currentStep,
    showUploadMore,
    score
  });

  // Helper to calculate overall score (simple average for demo)
  const calculateOverallScore = (data: BuyerMapData[]) => {
    if (!data.length) return 0;
    const total = data.reduce((sum, item) => sum + (item.confidenceScore || 0), 0);
    return Math.round(total / data.length);
  };

  // Process & Analyze handler
  const handleProcessAnalyze = async () => {
    console.log('handleProcessAnalyze called');
    console.log('Current uploaded files:', uploadedFiles);
    console.log('About to check interviews length:', uploadedFiles.interviews.length);

    if (uploadedFiles.interviews.length === 0) {
      console.log('No interviews to process, exiting handleProcessAnalyze');
      return;
    }

    try {
      console.log('Preparing FormData for interview upload...');
      const interviewFormData = new FormData();
      uploadedFiles.interviews.forEach((file: File) => {
        console.log('Appending interview file to FormData:', file.name);
        interviewFormData.append('files', file);
      });
      // Add assumptions from buyerMapData
      interviewFormData.append('assumptions', JSON.stringify(buyerMapData));
      console.log('FormData prepared, about to call /api/analyze-interviews');

      const interviewResponse = await fetch('/api/analyze-interviews', {
        method: 'POST',
        body: interviewFormData,
      });
      console.log('API call made, awaiting response...');

      if (!interviewResponse.ok) {
        const errorText = await interviewResponse.text();
        console.error('Interview analysis failed:', errorText);
        throw new Error('Failed to analyze interviews');
      }

      const interviewData = await interviewResponse.json();
      console.log('Interview analysis response:', interviewData);
      // Inspect quote structure
      if (interviewData.assumptions && interviewData.assumptions.length > 0) {
        console.log('First assumption with quotes:', interviewData.assumptions[0]);
        console.log('Quotes structure:', interviewData.assumptions[0]?.quotes);
      }

      // Update state and move to results
      setLocalBuyerMapData(interviewData.assumptions || interviewData.data || interviewData);
      console.log('localBuyerMapData updated:', interviewData.assumptions || interviewData.data || interviewData);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error in handleProcessAnalyze:', error);
    }
  };

  // File upload handlers
  const handleFileUpload = (type: 'deck' | 'interviews', files: FileList | null) => {
    console.log('handleFileUpload called with:', { type, files });
    if (!files) {
      console.log('No files selected');
      return;
    }
    
    const newFiles = Array.from(files);
    console.log('Processing new files:', newFiles.map(f => f.name));
    
    setUploadedFiles(prev => {
      console.log('Previous files state:', prev);
      const updated = {
        ...prev,
        [type]: type === 'deck' ? [newFiles[0]] : [...prev[type], ...newFiles]
      };
      console.log('Updated files state:', updated);
      return updated;
    });
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
    return localBuyerMapData.filter((item: BuyerMapData) => {
      const sectionInfo = getSectionInfo(item.icpAttribute);
      return sectionInfo.section === section;
    });
  };

  // CollapsibleCard
  const CollapsibleCard: React.FC<{ item: BuyerMapData }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sectionInfo = getSectionInfo(item.icpAttribute);
    const IconComponent = sectionInfo.icon;
    return (
      <div className="bg-white/80 rounded-xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className={`${sectionInfo.iconBg} p-2 rounded-lg mr-3`}>
                <IconComponent className={`w-5 h-5 ${sectionInfo.iconColor}`} />
              </div>
              <h3 className={`${sectionInfo.titleColor} text-sm font-bold uppercase tracking-wide`}>
                {sectionInfo.category}
              </h3>
            </div>
            {/* Validation Indicators */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium">{item.confidenceScore}%</span>
              <span className="text-xs text-gray-500">•</span>
              <span className={`text-xs font-medium ${getOutcomeTextColor(item.comparisonOutcome)}`}>{item.comparisonOutcome}</span>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          {/* Card Content */}
          <div className="text-sm text-gray-800 leading-relaxed">
            {item.v1Assumption || item.whyAssumption || item.icpAttribute || ''}
          </div>
          {/* Expandable Content */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <div className="space-y-4">
                {/* Reality from Interviews */}
                {item.realityFromInterviews && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Reality from Interviews</h4>
                    <p className="text-sm text-gray-700">{item.realityFromInterviews}</p>
                  </div>
                )}
                {/* Messaging Recommendation */}
                {item.waysToAdjustMessaging && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">💡 Messaging Recommendation</h4>
                    <p className="text-sm text-blue-800">{item.waysToAdjustMessaging}</p>
                  </div>
                )}
                {/* Key Finding (fallback to realityFromInterviews) */}
                {item.realityFromInterviews && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">✓ Key Finding</h4>
                    <p className="text-sm text-green-800">{item.realityFromInterviews}</p>
                  </div>
                )}
                {/* Supporting Evidence */}
                {item.quotes && item.quotes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Supporting Evidence</h4>
                    <div className="space-y-2">
                      {item.quotes.map((quote, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 italic mb-1">"{quote.quote || quote.text}"</p>
                          <p className="text-xs text-gray-500">
                            — {quote.speaker || 'Anonymous'}
                            {quote.role && `, ${quote.role}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Confidence Analysis */}
                {item.confidenceExplanation && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Confidence Analysis</h4>
                    <p className="text-sm text-gray-700">{item.confidenceExplanation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to check if interviews exist
  const hasInterviews = uploadedFiles.interviews.length > 0;

  // Trigger analysis when interviews are updated
  useEffect(() => {
    if (uploadedFiles.interviews.length > 0) {
      handleProcessAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles.interviews]);

  // Add effect to log localBuyerMapData updates
  useEffect(() => {
    console.log('localBuyerMapData updated:', localBuyerMapData);
  }, [localBuyerMapData]);

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
                <label className="cursor-pointer">
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
                  <div className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 inline-block">Add Interview Files</div>
                </label>
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={handleProcessAnalyze}
                disabled={!uploadedFiles.deck.length || uploadedFiles.interviews.length === 0 || isProcessing}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Process & Analyze'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <div className="space-y-8">
            {/* Enhanced Overall Score Header with integrated navigation */}
            {score !== null && (
              <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-8">
                {/* Page Title */}
                <h2 className="text-xl font-medium mb-2 opacity-90">BuyerMap Validation Results</h2>
                {/* Overall Score */}
                <div className="text-6xl font-bold mb-2">{score}%</div>
                <h3 className="text-lg font-medium mb-4">Overall Alignment Score</h3>
                {/* Score Message */}
                <p className="text-lg opacity-90 mb-6">{getScoreMessage(score)}</p>
                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-white/30"
                  >
                    {uploadedFiles.interviews.length === 0 ? 'Add Interviews' : 'Upload More Interviews'}
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
              {/* WHO Section */}
              {getFilteredDataBySection("WHO").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    WHO • Target Customer Profile
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {getFilteredDataBySection("WHO").map((item) => (
                      <CollapsibleCard key={item.id} item={item} />
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
                    {getFilteredDataBySection("WHAT").map((item) => (
                      <CollapsibleCard key={item.id} item={item} />
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
                    {getFilteredDataBySection("WHEN").map((item) => (
                      <CollapsibleCard key={item.id} item={item} />
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
                    {getFilteredDataBySection("WHY").map((item) => (
                      <CollapsibleCard key={item.id} item={item} />
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
                    {getFilteredDataBySection("OTHER").map((item) => (
                      <CollapsibleCard key={item.id} item={item} />
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