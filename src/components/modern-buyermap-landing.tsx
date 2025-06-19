import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Building, Target, AlertCircle, Trophy, Zap, Shield, MessageSquare
} from 'lucide-react';
import { BuyerMapData } from '../types/buyermap';
import DetailedValidationCard from './DetailedValidationCard';
import { mapBuyerMapToValidationData } from '../utils/mapToValidationData';
import UploadComponent from './UploadComponent';

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
  // If we have buyerMapData, it means deck was already processed, so set uploaded to true
  const [uploaded, setUploaded] = useState<boolean>(isMock || buyerMapData.length > 0);
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    deck: File[];
    interviews: File[];
  }>({
    deck: [],
    interviews: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [localBuyerMapData, setLocalBuyerMapData] = useState<BuyerMapData[]>(
    initialInsights || buyerMapData
  );
  const [score, setScore] = useState<number>(overallScore);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Auto-load mock data when MSW is enabled
  useEffect(() => {
    if (isMock && !uploaded) {
      // Simulate the upload completion
      setUploaded(true);
      setCurrentStep(3); // Jump directly to results
      
      // Load mock data
      const mockData = [
        {
          id: 1,
          icpAttribute: "Buyer Title",
          icpTheme: "WHO",
          v1Assumption: "Our ideal customer is a VP of Engineering or CTO at a mid-size tech company",
          whyAssumption: "These decision makers have budget authority and technical understanding",
          evidenceFromDeck: "Slide 3 shows our target as 'VP Engineering/CTO at 100-500 person companies'",
          realityFromInterviews: "Most successful customers are actually Engineering Directors or Senior Engineering Managers, not VPs or CTOs",
          comparisonOutcome: "Misaligned" as const,
          waysToAdjustMessaging: "Focus messaging on Engineering Directors and Senior Managers, emphasize team-level decision making rather than executive-level",
          confidenceScore: 85,
          confidenceExplanation: "Strong evidence from 8 customer interviews showing consistent patterns in actual buyer titles",
          quotes: [
            {
              id: "q1",
              text: "I'm an Engineering Director, not a VP. I make the final call on tools for my team.",
              speaker: "Sarah Chen",
              role: "Engineering Director",
              source: "Interview 3"
            },
            {
              id: "q2",
              text: "The VP is involved in budget approval, but I'm the one who evaluates and recommends tools.",
              speaker: "Mike Rodriguez",
              role: "Senior Engineering Manager",
              source: "Interview 7"
            }
          ],
          validationStatus: "validated" as const
        },
        {
          id: 2,
          icpAttribute: "Company Size",
          icpTheme: "WHO",
          v1Assumption: "Target companies with 100-500 employees",
          whyAssumption: "Large enough to have budget but small enough to be agile",
          evidenceFromDeck: "Slide 4 mentions 'mid-market companies (100-500 employees)'",
          realityFromInterviews: "Our best customers are actually 50-200 employees, with some successful cases at 20-50 person startups",
          comparisonOutcome: "Refined" as const,
          waysToAdjustMessaging: "Adjust target to 50-200 employees, emphasize benefits for growing companies and early-stage startups",
          confidenceScore: 92,
          confidenceExplanation: "Clear pattern across 12 interviews showing optimal company size range",
          quotes: [
            {
              id: "q3",
              text: "We're 75 people and this is perfect for our scale. I don't think it would work as well at a 500-person company.",
              speaker: "Alex Thompson",
              role: "CTO",
              source: "Interview 1"
            }
          ],
          validationStatus: "validated" as const
        }
      ];
      
      setLocalBuyerMapData(mockData);
      setScore(88); // Mock overall score
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

  // Transform buyerMapData to validationInsights format for DetailedValidationCard
  const validationInsights = useMemo(() => {
    return localBuyerMapData.map(item => ({
      id: item.id,
      icpAttribute: item.icpAttribute || '',
      title: item.v1Assumption || item.whyAssumption || '',
      outcome: item.comparisonOutcome,
      confidence: item.confidenceScore || 0,
      confidenceExplanation: item.confidenceExplanation || '',
      reality: item.realityFromInterviews || '',
      quotes: (item.quotes || []).map(q => ({
        text: q.text || q.quote || '',
        author: q.speaker || 'Anonymous',
        role: q.role || ''
      }))
    }));
  }, [localBuyerMapData]);

  // Bypass logic for mock mode
  if (!uploaded) {
    return <UploadComponent onComplete={() => setUploaded(true)} />;
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
                    {validationInsights
                      .filter(insight => {
                        const item = localBuyerMapData.find(item => item.id === insight.id);
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
                        const item = localBuyerMapData.find(item => item.id === insight.id);
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
                        const item = localBuyerMapData.find(item => item.id === insight.id);
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
                        const item = localBuyerMapData.find(item => item.id === insight.id);
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
                        const item = localBuyerMapData.find(item => item.id === insight.id);
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