'use client'
import { useState, useEffect, useCallback } from 'react';
import { BuyerMapData, UploadedFiles, ActiveTab, ComparisonOutcome } from '@/types/buyer-map';
import { User, Session } from '@supabase/supabase-js';
import { createClientComponent } from '@/lib/supabase-client';
import AuthModal from './AuthModal';

interface Tab {
  key: ActiveTab;
  label: string;
  count?: number;
}

const ModernBuyerMapLanding = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({ deck: null, interviews: [] });
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rejectedQuotes, setRejectedQuotes] = useState<Set<number>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const supabase = createClientComponent();
  const [windowWidth, setWindowWidth] = useState<number>(0);

  const getEffectiveConfidence = useCallback((item: BuyerMapData): number => {
    const activeQuotes = item.quotes.filter(quote => !rejectedQuotes.has(quote.id));
    const rejectionPenalty = (item.quotes.length - activeQuotes.length) * 10;
    return Math.max(item.confidenceScore - rejectionPenalty, 0);
  }, [rejectedQuotes]);

  const calculateOverallScore = useCallback((data: BuyerMapData[]): void => {
    const outcomeWeights: Record<ComparisonOutcome, number> = {
      'Aligned': 2,
      'New Data Added': 1,
      'Misaligned': 0
    };
    
    const filteredData = data.map((item: BuyerMapData) => ({
      ...item,
      effectiveConfidence: getEffectiveConfidence(item)
    }));
    
    const totalWeighted = filteredData.reduce((sum: number, item: BuyerMapData & { effectiveConfidence: number }) => {
      return sum + (outcomeWeights[item.comparisonOutcome] * (item.effectiveConfidence / 100));
    }, 0);

    const maxPossible = filteredData.length * 2;
    const score = Math.round((totalWeighted / maxPossible) * 100);
    setOverallScore(score);
  }, [getEffectiveConfidence]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (currentStep === 3) {
      const mockBuyerMapData: BuyerMapData[] = [
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
      ];

      setBuyerMapData(mockBuyerMapData);
      calculateOverallScore(mockBuyerMapData);
    }
  }, [currentStep, calculateOverallScore]);

  const handleQuoteRejection = (quoteId: number): void => {
    setRejectedQuotes((prev: Set<number>) => {
      const newRejected = new Set(prev);
      newRejected.add(quoteId);
      return newRejected;
    });
    calculateOverallScore(buyerMapData);
  };

  const handleFileUpload = (type: 'deck' | 'interviews', files: FileList | null): void => {
    if (!files) return;

    if (type === 'deck') {
      setUploadedFiles((prev: UploadedFiles) => ({ ...prev, deck: files[0] }));
    } else {
      setUploadedFiles((prev: UploadedFiles) => ({ 
        ...prev, 
        interviews: [...prev.interviews, ...Array.from(files)] 
      }));
    }
  };

  const removeFile = (type: 'deck' | 'interviews', index?: number): void => {
    if (type === 'deck') {
      setUploadedFiles((prev: UploadedFiles) => ({ ...prev, deck: null }));
    } else if (typeof index === 'number') {
      setUploadedFiles((prev: UploadedFiles) => ({
        ...prev,
        interviews: prev.interviews.filter((_: File, i: number) => i !== index)
      }));
    }
  };

  const toggleRowExpansion = (id: number): void => {
    setExpandedRows((prev: Set<number>) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const getOutcomeColor = (outcome: ComparisonOutcome): string => {
    switch (outcome) {
      case 'Aligned': return 'text-green-700 bg-green-100 border-green-300';
      case 'New Data Added': return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'Misaligned': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 90) return 'Your messaging is highly aligned with buyer reality';
    if (score >= 70) return 'Generally aligned, with room for refinement';
    return 'Major adjustments to core messaging likely needed';
  };

  const getFilteredData = (): BuyerMapData[] => {
    const sorted = [...buyerMapData].sort((a: BuyerMapData, b: BuyerMapData) => getEffectiveConfidence(a) - getEffectiveConfidence(b));
    
    switch (activeTab) {
      case 'aligned':
        return sorted.filter((item: BuyerMapData) => item.comparisonOutcome === 'Aligned');
      case 'insights':
        return sorted.filter((item: BuyerMapData) => item.comparisonOutcome === 'New Data Added');
      case 'misaligned':
        return sorted.filter((item: BuyerMapData) => item.comparisonOutcome === 'Misaligned');
      case 'all':
      default:
        return sorted;
    }
  };

  const getTabCounts = (): Record<Exclude<ActiveTab, 'all'>, number> => {
    return {
      aligned: buyerMapData.filter((item: BuyerMapData) => item.comparisonOutcome === 'Aligned').length,
      insights: buyerMapData.filter((item: BuyerMapData) => item.comparisonOutcome === 'New Data Added').length,
      misaligned: buyerMapData.filter((item: BuyerMapData) => item.comparisonOutcome === 'Misaligned').length
    };
  };

  const tabs: Tab[] = [
    { key: 'all', label: 'All Results' },
    { key: 'aligned', label: 'Aligned', count: getTabCounts().aligned },
    { key: 'insights', label: 'New Insights', count: getTabCounts().insights },
    { key: 'misaligned', label: 'Misaligned', count: getTabCounts().misaligned }
  ];

  const handleTabChange = (tab: ActiveTab): void => {
    setActiveTab(tab);
  };

  // Add/replace styles for main container and panels
  const mainContainerStyles = `main-container grid gap-8 md:gap-10 lg:gap-16 px-4 md:px-8 lg:px-16 py-8 md:py-16`;
  const leftPanelStyles = `left-panel flex flex-col justify-center space-y-4 md:space-y-6 lg:space-y-8 w-full md:w-auto`;
  const rightPanelStyles = `right-panel w-full md:w-auto`;

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
        </div>

        {/* Hero Section - Perfect 2 Column Split */}
        <div className={mainContainerStyles} style={{
          gridTemplateColumns: '1fr',
          ...(windowWidth >= 768 && windowWidth < 1024 ? { gridTemplateColumns: '1fr 1fr' } : {}),
          ...(windowWidth >= 1024 ? { gridTemplateColumns: '2fr 3fr' } : {})
        }}>
          {/* Left Panel */}
          <div className={leftPanelStyles} style={{
            maxWidth: '480px',
            margin: '0 auto',
            gap: '1rem',
            padding: '1.5rem 0',
          }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-2 md:mb-3 lg:mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Validate Your ICP Assumptions
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-400 mb-2 md:mb-3 lg:mb-4 leading-snug">
              Compare your sales messaging against real customer interviews
            </p>
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 md:px-10 md:py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-200 mb-2"
              style={{ minHeight: 48 }}
            >
              Create Your BuyerMap Report
            </button>
            <p className="text-xs text-gray-500 text-center mt-1">
              Free to try • Export or save with account
            </p>
          </div>

          {/* Right Panel (Demo Preview) */}
          <div className={rightPanelStyles} style={{
            minWidth: 0,
            padding: '2rem 1.5rem',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            {/* Demo Hero Score */}
            <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-8">
              <h3 className="text-sm font-medium mb-2 opacity-90">Overall Alignment Score</h3>
              <div className="text-5xl font-bold mb-3">92%</div>
              <p className="text-sm opacity-90">Highly aligned with buyer reality</p>
            </div>

            {/* Demo Tab Navigation */}
            <div className="border-b border-white/10 px-6 py-2">
              <nav className="-mb-px flex space-x-6">
                <div className="py-3 border-b-2 border-white/50 text-sm font-medium text-white">
                  All Results (8)
                </div>
                <div className="py-3 text-sm text-gray-400">
                  Misalignments (4)
                </div>
                <div className="py-3 text-sm text-gray-400">
                  New Insights (3)
                </div>
                <div className="py-3 text-sm text-gray-400">
                  Validated (1)
                </div>
              </nav>
            </div>

            {/* Demo Content */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-8 items-start">
                {/* Left Column - Theme Details */}
                <div className="space-y-3">
                  <div className="text-xs text-blue-300 font-medium">COMPETITIVE POSITIONING</div>
                  <h4 className="text-lg font-bold text-white">Speed vs Security Messaging</h4>
                  <p className="text-sm text-gray-300">
                    Customers choose us primarily for faster deployment (3x faster than competitors)
                  </p>
                  {/* Messaging Recommendation */}
                  <div className="bg-blue-500/20 border-l-4 border-blue-400 rounded-r-lg p-3 mt-4">
                    <h5 className="font-semibold text-blue-200 mb-1 text-xs flex items-center">
                      💡 Messaging Recommendation:
                    </h5>
                    <p className="text-xs text-blue-300">
                      Lead with enterprise security first, position speed as efficiency benefit for implementation
                    </p>
                  </div>
                </div>

                {/* Right Column - Reality & Metrics */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Security and compliance are the #1 decision factor, speed is nice-to-have
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/30 text-blue-200">
                      Misaligned
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-white/20 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-400" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-sm font-bold text-white">92%</span>
                    </div>
                  </div>
                  <button className="text-blue-300 text-sm font-medium hover:text-blue-200 transition-colors">
                    Show Details ▼
                  </button>
                </div>
              </div>

              {/* Supporting Evidence Section */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <h5 className="font-semibold text-white mb-3 text-sm">Supporting Evidence:</h5>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm text-gray-300 italic mb-2">
                    &quot;Speed doesn&apos;t matter if we can&apos;t pass SOC 2 audit&quot;
                  </p>
                  <p className="text-xs text-gray-400">
                    <strong>Sarah Chen</strong>, IT Director • Interview #4
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get actionable insights from your customer interviews in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                1
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Upload Your Materials</h3>
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
                  <span className="text-gray-400">+</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs">🎤</span>
                    </div>
                    <span className="text-sm text-gray-300">Interviews</span>
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
        </div>

        {/* Final CTA Section */}
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4">Ready to validate your assumptions?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join teams improving their messaging with data-driven insights
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
              >
                Create Your BuyerMap Report
              </button>
              {!user && (
                <div className="border-t border-white/20 pt-6">
                  <p className="text-sm opacity-75 mb-4">Want to save your reports?</p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
                  >
                    Create Free Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  // Other steps with original styling
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
              <p className="text-gray-400 mb-6 leading-relaxed">
                We&apos;ll validate your ICP assumptions against interview data
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2">Sales Deck / Pitch Materials</h3>
                <p className="text-gray-500 mb-4">Upload your current sales presentation</p>
                
                {uploadedFiles.deck ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{uploadedFiles.deck.name}</span>
                      <button onClick={() => removeFile('deck')} className="text-red-500 hover:text-red-700 text-xl">×</button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload('deck', e.target.files)} />
                    <div className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">Choose File</div>
                  </label>
                )}
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
                <h3 className="text-lg font-semibold mb-2">Customer Interview Transcripts</h3>
                <p className="text-gray-500 mb-4">Upload up to 10 interview transcripts</p>
                
                {uploadedFiles.interviews.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {uploadedFiles.interviews.map((file: File, index: number) => (
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
                  <input type="file" className="hidden" multiple accept=".txt,.doc,.docx,.pdf" onChange={(e) => handleFileUpload('interviews', e.target.files)} />
                  <div className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 inline-block">Add Interview Files</div>
                </label>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!uploadedFiles.deck || uploadedFiles.interviews.length === 0}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Process & Analyze
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <div className="space-y-8">
            {overallScore !== null && (
              <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-8">
                <h2 className="text-lg font-medium mb-2">Overall Alignment Score</h2>
                <div className="text-6xl font-bold mb-4">{overallScore}%</div>
                <p className="text-lg opacity-90">{getScoreMessage(overallScore)}</p>
              </div>
            )}

            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.key
                        ? `border-${tab.key === 'aligned' ? 'green' : tab.key === 'insights' ? 'blue' : 'red'}-500 text-${tab.key === 'aligned' ? 'green' : tab.key === 'insights' ? 'blue' : 'red'}-600`
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {getFilteredData().map((item) => (
                <div key={item.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="p-6 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-3">
                        <div className="text-xs text-gray-500 mb-1">{item.icpAttribute}</div>
                        <h3 className="font-semibold text-gray-900 mb-1">{item.icpTheme}</h3>
                        <p className="text-sm text-gray-600">{item.v1Assumption}</p>
                      </div>
                      
                      <div className="col-span-3">
                        <p className="text-sm text-gray-700">{item.realityFromInterviews}</p>
                      </div>
                      
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getOutcomeColor(item.comparisonOutcome)}`}>
                          {item.comparisonOutcome}
                        </span>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getConfidenceColor(getEffectiveConfidence(item))}`}
                              style={{ width: `${getEffectiveConfidence(item)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{getEffectiveConfidence(item)}%</span>
                          <span className="text-xs opacity-50">(&quot;{item.comparisonOutcome}&quot;)</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => toggleRowExpansion(item.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {expandedRows.has(item.id) ? 'Hide Details ▲' : 'Show Details ▼'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Messaging Recommendation:</h4>
                      <p className="text-sm text-blue-800">{item.waysToAdjustMessaging}</p>
                    </div>
                  </div>

                  {expandedRows.has(item.id) && (
                    <div className="bg-gray-50 border-t border-gray-200 p-6">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Supporting Evidence</h4>
                          <div className="space-y-3">
                            {item.quotes.map((quote) => (
                              <div key={quote.id} className={`border rounded-lg p-4 ${rejectedQuotes.has(quote.id) ? 'bg-red-50 border-red-200 opacity-50' : 'bg-white border-gray-200'}`}>
                                <p className="text-gray-700 mb-2 italic">&quot;{quote.text}&quot;</p>
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-gray-500">
                                    <strong>{quote.speaker}</strong>, {quote.role} • {quote.source}
                                  </div>
                                  {!rejectedQuotes.has(quote.id) && (
                                    <button
                                      onClick={() => handleQuoteRejection(quote.id)}
                                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-300 rounded"
                                    >
                                      Reject Quote
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Analysis Details</h4>
                          <div className="space-y-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h5 className="font-medium text-gray-900 mb-2">Original Assumption Source</h5>
                              <p className="text-sm text-gray-600 mb-2">{item.whyAssumption}</p>
                              <p className="text-xs text-blue-600">{item.evidenceFromDeck}</p>
                            </div>
                            
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h5 className="font-medium text-gray-900 mb-2">Confidence Explanation</h5>
                              <p className="text-sm text-gray-600">{item.confidenceExplanation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep(4)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Export */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Validation Complete</h2>
              <p className="text-gray-600">Your BuyerMap analysis is ready for export</p>
            </div>

            {overallScore !== null && (
              <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-6">
                <div className="text-4xl font-bold mb-2">{overallScore}%</div>
                <p className="text-lg">{getScoreMessage(overallScore)}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Your Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Free Export Options:</h4>
                  <div className="space-y-2">
                    <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                      📊 Download Excel Report
                    </button>
                    <button className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
                      📄 Download PDF Summary
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50">
                      📋 Copy to Clipboard
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Save & Collaborate:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">Create a free account to:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Save multiple BuyerMap reports</li>
                      <li>• Share with your team</li>
                      <li>• Track changes over time</li>
                      <li>• Access advanced export options</li>
                    </ul>
                    <button className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                      Create Free Account
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setUploadedFiles({ deck: null, interviews: [] });
                  setBuyerMapData([]);
                  setOverallScore(null);
                  setRejectedQuotes(new Set());
                }}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700"
              >
                Start New Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernBuyerMapLanding;