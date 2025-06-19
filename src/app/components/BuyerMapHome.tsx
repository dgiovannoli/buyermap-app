import { useState } from 'react';
import { MockTestButton } from '../../components/MockTestButton';

// Mock data
/* const mockBuyerMapData = [
  {
    id: 1,
    icpAttribute: "Pain Points",
    icpTheme: "Evidence Review Burden",
    v1Assumption: "Attorneys spend 87+ workdays/year on manual evidence review",
    whyAssumption: "Market research indicated high time investment in evidence processing",
    evidenceFromDeck: "Slide 4: '87 workdays wasted annually'",
    realityFromInterviews: "Attorneys actually spend 60-120 workdays depending on case complexity and firm size",
    comparisonOutcome: "New Data Added",
    waysToAdjustMessaging: "Segment messaging by firm size - small firms relate to 120+ days, large firms to 60 days",
    confidenceScore: 85,
    confidenceExplanation: "8 quotes from diverse attorney roles, consistent pattern across firm sizes",
    quotes: [
      { id: 1, text: "In complex cases, I easily spend 3-4 months just reviewing evidence", speaker: "Maria Santos", role: "Criminal Defense Attorney", source: "Interview #2", rejected: false },
      { id: 2, text: "For our firm size, 87 days sounds about right for major cases", speaker: "David Chen", role: "Managing Partner", source: "Interview #5", rejected: false }
    ]
  },
  {
    id: 2,
    icpAttribute: "Desired Outcomes",
    icpTheme: "Courtroom Advantage Priority",
    v1Assumption: "Primary goal is creating searchable, court-ready insights",
    whyAssumption: "Product positioning focused on trial preparation and courtroom success",
    evidenceFromDeck: "Slide 7: 'Transform evidence into courtroom advantage'",
    realityFromInterviews: "Defense attorneys prioritize avoiding malpractice over gaining advantages",
    comparisonOutcome: "Misaligned",
    waysToAdjustMessaging: "Lead with risk mitigation and malpractice prevention, position advantages as secondary benefit",
    confidenceScore: 92,
    confidenceExplanation: "12 quotes across all interview types, unanimous sentiment on risk vs advantage",
    quotes: [
      { id: 3, text: "I just need to make sure I don't miss anything that could hurt my client", speaker: "Jennifer Park", role: "Solo Practitioner", source: "Interview #1", rejected: false },
      { id: 4, text: "It's not about gaining an edge - it's about not getting blindsided", speaker: "Robert Kim", role: "Senior Associate", source: "Interview #7", rejected: false }
    ]
  },
  {
    id: 3,
    icpAttribute: "Buyer Titles",
    icpTheme: "Decision Maker Identification",
    v1Assumption: "Criminal defense attorneys are primary decision makers",
    whyAssumption: "Sales conversations typically started with attorneys",
    evidenceFromDeck: "Slide 2: 'Built for Criminal Defense Attorneys'",
    realityFromInterviews: "Partners and office managers heavily influence tech decisions, especially on budget",
    comparisonOutcome: "Misaligned",
    waysToAdjustMessaging: "Include office managers and partners in marketing materials, create ROI-focused content for decision influencers",
    confidenceScore: 78,
    confidenceExplanation: "6 quotes from decision makers, clear pattern of multi-stakeholder involvement",
    quotes: [
      { id: 5, text: "I have to run any tech purchase over $5K through our office manager first", speaker: "Lisa Wang", role: "Associate Attorney", source: "Interview #3", rejected: false },
      { id: 6, text: "Partners care more about billable efficiency than the attorneys do", speaker: "Tom Rodriguez", role: "Office Manager", source: "Interview #8", rejected: false }
    ]
  }
]; */

interface Quote {
  id: number;
  text: string;
  speaker: string;
  role: string;
  source: string;
  rejected: boolean;
}

interface BuyerMapItem {
  id: number;
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  whyAssumption: string;
  evidenceFromDeck: string;
  realityFromInterviews: string;
  comparisonOutcome: string;
  waysToAdjustMessaging: string;
  confidenceScore: number;
  confidenceExplanation: string;
  quotes: Quote[];
}

interface AssumptionData {
  icpAttribute?: string;
  icpTheme?: string;
  v1Assumption?: string;
  whyAssumption?: string;
  evidenceFromDeck?: string;
  confidenceScore?: number;
  confidenceExplanation?: string;
}

interface UploadedFiles {
  deck: File | null;
  interviews: File[];
}

interface BuyerMapHomeProps {
  onStart: () => void;
}

export default function BuyerMapHome({ onStart }: BuyerMapHomeProps) {
  console.log('BuyerMapHome props received:', { onStart });
  console.log('onStart type in component:', typeof onStart);
  // Defensive: warn if onStart is not a function
  if (typeof onStart !== 'function') {
    console.error('onStart prop is not a function! Value:', onStart);
  }
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({ deck: null, interviews: [] });
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set<number>());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Utility functions
  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Your messaging is highly aligned with buyer reality';
    if (score >= 70) return 'Generally aligned, with room for refinement';
    return 'Major adjustments to core messaging likely needed';
  };

  const calculateOverallScore = (data: BuyerMapItem[]) => {
    const outcomeWeights: Record<string, number> = { 'Aligned': 2, 'New Data Added': 1, 'Misaligned': 0 };
    const filteredData = data.map(item => ({
      ...item,
      effectiveConfidence: getEffectiveConfidence(item)
    }));
    
    const totalWeighted = filteredData.reduce((sum, item) => {
      return sum + (outcomeWeights[item.comparisonOutcome] * (item.effectiveConfidence / 100));
    }, 0);
    const maxPossible = filteredData.length * 2;
    return Math.round((totalWeighted / maxPossible) * 100);
  };

  const getEffectiveConfidence = (item: BuyerMapItem) => {
    // Handle both old mock data and new AI data structures
    if (!item.quotes || !Array.isArray(item.quotes)) {
      // If no quotes array, return the base confidence score or default to 85
      return item.confidenceScore || 85;
    }
    
    // Since we're not using quote rejection anymore, just return the base confidence
    return item.confidenceScore || 85;
  };

  const handleFileUpload = (type: string, files: FileList | null) => {
    if (!files) return;
    
    console.log(`Uploading ${type} files:`, files);
    
    if (type === 'deck') {
      const file = files[0];
      console.log('Sales deck uploaded:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      });
      setUploadedFiles(prev => ({ ...prev, deck: file }));
    } else {
      const newFiles = Array.from(files);
      console.log('Interview files uploaded:', newFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })));
      setUploadedFiles(prev => ({ 
        ...prev, 
        interviews: [...prev.interviews, ...newFiles] 
      }));
    }
  };

  const handleProcessAnalyze = async () => {
    if (!uploadedFiles.deck || isProcessing) return;

    setIsProcessing(true);
    setProcessingStep('Phase 1: Analyzing sales deck...');

    try {
      // Phase 1: Analyze deck only
      const deckFormData = new FormData();
      deckFormData.append('deck', uploadedFiles.deck);

      console.log('=== PHASE 1: DECK ANALYSIS ===');
      console.log('Sending deck file:', uploadedFiles.deck.name);

      const deckResponse = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: deckFormData
      });

      if (!deckResponse.ok) {
        const errorText = await deckResponse.text();
        throw new Error(`Deck analysis failed: ${errorText}`);
      }

      const deckResults = await deckResponse.json();
      if (!deckResults.success) {
        throw new Error(deckResults.error || 'Failed to analyze sales deck');
      }

      console.log('=== PHASE 1 RESULTS ===');
      console.log('Initial assumptions:', deckResults.assumptions);
      deckResults.assumptions.forEach((assumption: AssumptionData, index: number) => {
        console.log(`Assumption ${index + 1}:`);
        console.log('- Assumption:', assumption.v1Assumption);
        console.log('- Evidence:', assumption.evidenceFromDeck);
        console.log('- Initial confidence:', assumption.confidenceScore);
      });

      // Transform and show initial assumptions
      const transformedResults = deckResults.assumptions.map((assumption: AssumptionData, index: number) => ({
        id: index + 1,
        icpAttribute: assumption.icpAttribute || 'Unknown',
        icpTheme: assumption.icpTheme || 'AI Generated Theme',
        v1Assumption: assumption.v1Assumption || 'No assumption provided',
        whyAssumption: assumption.whyAssumption || 'AI analysis',
        evidenceFromDeck: assumption.evidenceFromDeck || 'From uploaded deck',
        realityFromInterviews: 'Interview analysis pending',
        comparisonOutcome: 'New Data Added',
        waysToAdjustMessaging: 'Review and validate with customer interviews',
        confidenceScore: 85,
        confidenceExplanation: 'Generated by AI analysis of sales deck',
        quotes: []
      }));

      setBuyerMapData(transformedResults);
      calculateOverallScore(transformedResults);
      setCurrentStep(3);

      // Phase 2: Process interviews if available
      if (uploadedFiles.interviews.length > 0) {
        setProcessingStep('Phase 2: Validating with interviews...');
        
        console.log('=== PHASE 2: INTERVIEW VALIDATION ===');
        console.log('Processing interviews:', uploadedFiles.interviews.map(f => f.name));
        
        const interviewFormData = new FormData();
        uploadedFiles.interviews.forEach(file => {
          interviewFormData.append('interviews', file);
        });
        interviewFormData.append('assumptions', JSON.stringify(transformedResults));

        const interviewResponse = await fetch('/api/analyze-interviews', {
          method: 'POST',
          body: interviewFormData
        });

        if (!interviewResponse.ok) {
          const errorText = await interviewResponse.text();
          throw new Error(`Interview validation failed: ${errorText}`);
        }

        const interviewResults = await interviewResponse.json();
        if (!interviewResults.success) {
          throw new Error(interviewResults.error || 'Failed to validate with interviews');
        }

        console.log('=== PHASE 2 RESULTS ===');
        console.log('Updated assumptions:', interviewResults.updatedAssumptions);
        interviewResults.updatedAssumptions.forEach((assumption: BuyerMapItem, index: number) => {
          console.log(`\nAssumption ${index + 1}:`);
          console.log('- Assumption:', assumption.v1Assumption);
          console.log('- Outcome:', assumption.comparisonOutcome);
          console.log('- Reality:', assumption.realityFromInterviews);
          console.log('- Confidence:', assumption.confidenceScore);
          console.log('- Confidence explanation:', assumption.confidenceExplanation);
          console.log('- Quotes:', assumption.quotes?.length || 0);
          if (assumption.quotes?.length) {
            console.log('Quote samples:');
            assumption.quotes.slice(0, 2).forEach((quote, qIndex) => {
              console.log(`  ${qIndex + 1}. "${quote.text.substring(0, 100)}..."`);
              console.log(`     Speaker: ${quote.speaker} (${quote.role})`);
            });
          }
        });

        // Update with validated results
        setBuyerMapData(interviewResults.updatedAssumptions);
        calculateOverallScore(interviewResults.updatedAssumptions);
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error processing files:', error.message);
        alert(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred:', error);
        alert('An unknown error occurred while processing the files');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const removeFile = (type: string, index: number | null = null) => {
    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: null }));
    } else {
      setUploadedFiles(prev => ({
        ...prev,
        interviews: prev.interviews.filter((_, i) => i !== index)
      }));
    }
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'Aligned': return 'text-green-600';
      case 'New Data Added': return 'text-blue-600';
      case 'Misaligned': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getFilteredData = () => {
    const sorted = [...buyerMapData].sort((a, b) => getEffectiveConfidence(a) - getEffectiveConfidence(b));
    
    switch (activeTab) {
      case 'aligned':
        return sorted.filter(item => item.comparisonOutcome === 'Aligned');
      case 'insights':
        return sorted.filter(item => item.comparisonOutcome === 'New Data Added');
      case 'misaligned':
        return sorted.filter(item => item.comparisonOutcome === 'Misaligned');
      case 'all':
      default:
        return sorted;
    }
  };

  const getTabCounts = () => {
    return {
      aligned: buyerMapData.filter(item => item.comparisonOutcome === 'Aligned').length,
      insights: buyerMapData.filter(item => item.comparisonOutcome === 'New Data Added').length,
      misaligned: buyerMapData.filter(item => item.comparisonOutcome === 'Misaligned').length
    };
  };

  const handleMainCTA = () => {
    console.log('Button clicked, onStart is:', onStart);
    if (typeof onStart === 'function') {
      onStart();
    } else {
      console.error('onStart is not a function, received:', onStart);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      <div className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 gap-16 items-center min-h-screen">
          {/* Left Column - Hero Copy & CTA */}
          <div className="space-y-8">
            {/* Badge/Tag */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-sm font-medium text-blue-300">✨ BuyerMap Analysis</span>
            </div>
            
            {/* Hero Headline */}
            <div>
              <h1 className="text-6xl font-bold mb-6 leading-tight bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Validate Your ICP Assumptions
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Compare your sales messaging against real customer interviews
              </p>
            </div>

            {/* Mock Test Section (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6">
                <MockTestButton />
              </div>
            )}

            {/* Main CTA */}
            <div className="space-y-4 relative z-10">
              <button
                onClick={handleMainCTA}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-200 relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                Create Your BuyerMap Report
              </button>
              
              <p className="text-sm text-gray-500 text-center">
                Free to try • Export or save with account
              </p>
            </div>
          </div>

          {/* Right Column - Demo Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl backdrop-blur-sm"></div>
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Alignment Score</h3>
                      <p className="text-sm text-gray-400">Based on 12 interviews</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-400">87%</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Validated Assumptions</span>
                    <span className="text-sm font-medium text-green-400">8/10</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">New Insights</span>
                    <span className="text-sm font-medium text-blue-400">3</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Messaging Adjustments</span>
                    <span className="text-sm font-medium text-purple-400">5</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              1
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Upload Your Deck</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Share your sales deck and customer interview transcripts. We support PDF, PowerPoint, and text files.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xs">📄</span>
                  </div>
                  <span className="text-sm text-gray-300">Sales Deck</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              2
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">AI Analysis</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Our AI extracts assumptions from your deck and validates them against customer quotes from interviews.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Extract assumptions</span>
                  </div>
                  <span className="text-xs text-green-400 font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Match customer quotes</span>
                  </div>
                  <span className="text-xs text-green-400 font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-300">Calculate confidence</span>
                  </div>
                  <span className="text-xs text-blue-400 font-medium">...</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              3
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Get Actionable Results</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Receive a detailed report with messaging recommendations, confidence scores, and supporting evidence.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Alignment Score</span>
                  <span className="text-lg font-bold text-blue-400">73%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Insights Found</span>
                  <span className="text-lg font-bold text-green-400">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Recommendations</span>
                  <span className="text-lg font-bold text-purple-400">5</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4">Ready to validate your assumptions?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join hundreds of teams improving their messaging with data-driven insights
            </p>
            <button
              onClick={handleMainCTA}
              className="bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              Create Your BuyerMap Report
            </button>
            <p className="text-sm mt-4 opacity-75">Free to try • Export or save with account</p>
          </div>
        </div>
      </div>
    </div>
  );
}