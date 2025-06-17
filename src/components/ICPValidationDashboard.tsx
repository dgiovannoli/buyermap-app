import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Target, Calendar, Shield, Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { BuyerMapData, ValidationAttribute, ICPValidationData, Quote, ICPValidationResponse, AssumptionState } from '../types/buyermap';
import { createValidationData, createICPValidationData } from '../utils/dataMapping';
import { 
  Building, Trophy, Zap, XCircle, Eye, Download, MessageSquare,
  TrendingUp, TrendingDown, Quote as QuoteIcon, ArrowRight, Plus, Star, Award, Activity, Info, Search,
  MapPin, Briefcase, ExternalLink, UserPlus, Linkedin, FileText,
  ChevronDown, ChevronRight,
  LucideIcon
} from 'lucide-react';
import { 
  mapAssumptionToValidation, 
  mapComparisonOutcome, 
  mapICPAttributeToKey, 
  calculateTotalInterviews,
  STANDARD_ICP_ATTRIBUTES
} from '../utils/dataMapping';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface ICPValidationDashboardProps {
  buyerMapData: ICPValidationResponse;
  onValidationUpdate: (data: ICPValidationResponse) => void;
  onError: (error: Error) => void;
  onProgressUpdate: (progress: number) => void;
  handleInterviewAnalysis: (files: FileList, buyerMapData: ICPValidationResponse) => Promise<ICPValidationResponse>;
}

type OutcomeType = 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined';

interface OutcomeColors {
  primary: string;
  bg: string;
  border: string;
}

interface AttributeCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  content: string;
  colorClass: string;
  hasValidation?: boolean;
  validation?: {
    assumption: string;
    reality: string;
    outcome: OutcomeType;
    confidence: number;
    confidence_explanation: string;
    quotes: Quote[];
  };
}

const mapIcpThemeToCategory = (icpTheme: string): string => {
  const themeMap: Record<string, string> = {
    'buyer-titles': 'BUYER_TITLES',
    'company-size': 'COMPANY_SIZE',
    'pain-points': 'PAIN_POINTS',
    'desired-outcomes': 'DESIRED_OUTCOMES',
    'triggers': 'TRIGGERS',
    'barriers': 'BARRIERS',
    'messaging-emphasis': 'MESSAGING_EMPHASIS'
  };
  return themeMap[icpTheme] || 'BUYER_TITLES';
};

const fixAssumptionCategories = (assumptions: any[]): AssumptionState[] => {
  const assignCategory = (assumptionText: string): string => {
    const text = assumptionText.toLowerCase();
    if (text.includes('buyer') || text.includes('target') || text.includes('attorney') || 
        text.includes('lawyer') || text.includes('customer') || text.includes('user') ||
        text.includes('defense') || text.includes('criminal') || text.includes('legal professional')) {
      return 'BUYER_TITLES';
    }
    if (text.includes('company') || text.includes('firm') || text.includes('size') || 
        text.includes('small') || text.includes('large') || text.includes('enterprise') ||
        text.includes('organization') || text.includes('practice')) {
      return 'COMPANY_SIZE';
    }
    if (text.includes('pain') || text.includes('problem') || text.includes('challenge') || 
        text.includes('struggle') || text.includes('difficult') || text.includes('frustration') ||
        text.includes('waste') || text.includes('manual') || text.includes('time-consuming') ||
        text.includes('overwhelming') || text.includes('deficit')) {
      return 'PAIN_POINTS';
    }
    if (text.includes('desire') || text.includes('want') || text.includes('goal') || 
        text.includes('outcome') || text.includes('achieve') || text.includes('improve') ||
        text.includes('transform') || text.includes('efficiency') || text.includes('accuracy') ||
        text.includes('strategic') || text.includes('advantage')) {
      return 'DESIRED_OUTCOMES';
    }
    if (text.includes('trigger') || text.includes('when') || text.includes('deadline') || 
        text.includes('trial') || text.includes('case') || text.includes('volume') ||
        text.includes('urgent') || text.includes('timeline') || text.includes('preparation')) {
      return 'TRIGGERS';
    }
    if (text.includes('barrier') || text.includes('concern') || text.includes('hesitant') || 
        text.includes('worry') || text.includes('security') || text.includes('compliance') ||
        text.includes('cost') || text.includes('budget') || text.includes('resistance') ||
        text.includes('hinder') || text.includes('adoption')) {
      return 'BARRIERS';
    }
    if (text.includes('messaging') || text.includes('focus') || text.includes('emphasis') ||
        text.includes('should focus') || text.includes('highlight') || text.includes('emphasize')) {
      return 'MESSAGING_EMPHASIS';
    }
    return 'BUYER_TITLES';
  };

  const mapOutcomeToStatus = (outcome: string): AssumptionState['status'] => {
    switch ((outcome || '').toUpperCase()) {
      case 'ALIGNED': return 'ALIGNED';
      case 'MISALIGNED': return 'MISALIGNED';
      case 'NEW_DATA_ADDED': return 'NEW_DATA_ADDED';
      case 'NEUTRAL': return 'NEUTRAL';
      default: return 'PENDING_VALIDATION';
    }
  };

  return assumptions.map((apiAssumption, index) => {
    // Extract the assumption text from the correct field
    const assumptionText = apiAssumption.v1Assumption || 
                          apiAssumption.assumption || 
                          apiAssumption.text || 
                          apiAssumption.icpAttribute || '';
    const category = apiAssumption.icpTheme ? 
      mapIcpThemeToCategory(apiAssumption.icpTheme) : 
      assignCategory(assumptionText);
    const categoryDescription = apiAssumption.icpAttribute || apiAssumption.categoryDescription || '';
    const outcome = (apiAssumption.comparisonOutcome || '').toUpperCase();
    console.log('fixAssumptionCategories - incoming API assumption:', apiAssumption);
    let mappedQuotes = [];
    if (Array.isArray(apiAssumption.quotes) && apiAssumption.quotes.length > 0) {
      mappedQuotes = apiAssumption.quotes;
      console.log('Mapping quotes from .quotes:', mappedQuotes);
    } else if (Array.isArray(apiAssumption.interviewQuotes) && apiAssumption.interviewQuotes.length > 0) {
      mappedQuotes = apiAssumption.interviewQuotes;
      console.log('Mapping quotes from .interviewQuotes:', mappedQuotes);
    } else if (Array.isArray(apiAssumption.rawQuotes) && apiAssumption.rawQuotes.length > 0) {
      mappedQuotes = apiAssumption.rawQuotes;
      console.log('Mapping quotes from .rawQuotes:', mappedQuotes);
    } else if (apiAssumption.validationAttributes && Array.isArray(apiAssumption.validationAttributes.quotes) && apiAssumption.validationAttributes.quotes.length > 0) {
      mappedQuotes = apiAssumption.validationAttributes.quotes;
      console.log('Mapping quotes from .validationAttributes.quotes:', mappedQuotes);
    } else {
      console.log('No quotes found for assumption:', apiAssumption.id);
    }
    const hasInterviewQuotes = mappedQuotes.length > 0;
    const status = mapOutcomeToStatus(outcome);
    const source: 'INTERVIEWS_PROCESSED' | 'DECK_ONLY' = hasInterviewQuotes && status !== 'PENDING_VALIDATION'
      ? 'INTERVIEWS_PROCESSED'
      : 'DECK_ONLY';
    // Map all relevant fields for UI
    const mapped = {
      id: apiAssumption.id || `assumption-${index}`,
      assumption: assumptionText,
      category: category,
      categoryDescription: categoryDescription,
      status,
      source,
      deckEvidence: apiAssumption.evidenceFromDeck || apiAssumption.deckEvidence || '',
      slideNumber: apiAssumption.slideNumber || null,
      quotes: mappedQuotes,
      confidence: apiAssumption.confidenceScore || apiAssumption.confidence || 0,
      confidenceScore: apiAssumption.confidenceScore || apiAssumption.confidence || 0,
      explanation: apiAssumption.confidenceExplanation || apiAssumption.explanation || '',
      confidenceExplanation: apiAssumption.confidenceExplanation || apiAssumption.explanation || '',
      realityFromInterviews: apiAssumption.realityFromInterviews || '',
      keyFinding: apiAssumption.realityFromInterviews || '',
      createdAt: apiAssumption.createdAt || new Date().toISOString(),
      lastUpdated: apiAssumption.lastUpdated || new Date().toISOString(),
      icpTheme: apiAssumption.icpTheme || '',
      icpAttribute: apiAssumption.icpAttribute || '',
      comparisonOutcome: apiAssumption.comparisonOutcome || '',
    };
    console.log('fixAssumptionCategories - mapped assumption:', mapped);
    return mapped;
  });
};

// Extend AssumptionState to include optional API fields for UI compatibility
interface AssumptionStateWithAPI extends AssumptionState {
  realityFromInterviews?: string;
  confidenceExplanation?: string;
  confidenceScore?: number;
  comparisonOutcome?: string;
  categoryDescription?: string;
  keyFinding?: string;
  confidenceAnalysis?: string;
  refinedStatement?: string;
  evidenceStrength?: 'LOW' | 'MEDIUM' | 'HIGH';
  interviewCount?: number;
}

export function ICPValidationDashboard({ buyerMapData, onValidationUpdate, onError, onProgressUpdate, handleInterviewAnalysis }: ICPValidationDashboardProps) {
  console.log('ICPValidationDashboard - Raw buyerMapData:', buyerMapData);

  // Handle different data formats
  let responseData;
  if (Array.isArray(buyerMapData)) {
    // Check if it's a single-element array containing the response object
    if (buyerMapData.length === 1 && buyerMapData[0].success && buyerMapData[0].assumptions) {
      responseData = buyerMapData[0];
    } else {
      // It's an array of assumptions
      responseData = { assumptions: buyerMapData };
    }
  } else {
    // It's already the response object
    responseData = buyerMapData;
  }

  console.log('Processed response data:', responseData);

  // Create ICP validation data
  const icpValidation = responseData.assumptions?.length > 0 
    ? createICPValidationData(responseData.assumptions[0])
    : null;

  // Group attributes by section
  const sectionAttributes = {
    who: ['buyer-titles', 'company-size'],
    what: ['pain-points', 'desired-outcomes'],
    when: ['triggers'],
    whyHow: ['barriers', 'messaging-emphasis']
  };

  // Debug logging for each section
  Object.entries(sectionAttributes).forEach(([section, attributes]) => {
    console.log(`Section ${section} attributes:`, attributes);
    // attributes.forEach(attr => {
    //   console.log(`Attribute ${attr} data:`, validationData[attr]);
    // });
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (attributeId: string) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attributeId)) {
      newExpanded.delete(attributeId);
    } else {
      newExpanded.add(attributeId);
    }
    setExpandedAttributes(newExpanded);
  };

  // Update allowed types and extensions
  const allowedTypes = [
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a',
    'text/plain', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/octet-stream' // Sometimes .docx files show as this
  ];
  const allowedExtensions = ['.mp3', '.mp4', '.wav', '.m4a', '.txt', '.pdf', '.docx', '.doc'];

  const isValidFile = (file: File) => {
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    return hasValidType || hasValidExtension;
  };

  const handleUploadClick = () => {
    console.log('[Upload] Upload Interviews button clicked');
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('[Upload] File input changed');
    if (!files || files.length === 0) {
      console.log('[Upload] No files selected');
      return;
    }
    console.log('[Upload] Files selected:', Array.from(files).map(f => f.name));
    console.log('[Upload] File types:', Array.from(files).map(f => f.type));
    console.log('[Upload] Total files:', files.length);

    // Validate file types/extensions
    const invalidFiles = Array.from(files).filter(f => !isValidFile(f));
    if (invalidFiles.length > 0) {
      console.error('[Upload] Invalid file types:', invalidFiles.map(f => f.name));
      onError?.(new Error('One or more files have an unsupported file type.'));
      return;
    }

    // Process the files
    processInterviewFiles(files);
  };

  const processInterviewFiles = async (files: FileList) => {
    try {
      console.log('[Upload] Starting interview processing...');
      onProgressUpdate?.(10);
      if (typeof handleInterviewAnalysis !== 'function') {
        throw new Error('Interview analysis handler is not available.');
      }
      const updatedData = await handleInterviewAnalysis(files, buyerMapData);
      onProgressUpdate?.(100);
      onValidationUpdate?.(updatedData);
      console.log('[Upload] Interview processing completed successfully');
    } catch (error) {
      console.error('[Upload] Error processing interviews:', error);
      onError?.(error as Error);
    }
  };

  const handleExportAnalysis = () => {
    // Implement export logic here
    // You can use the buyerMapData to generate a report
  };

  const handleViewCollection = () => {
    // Implement view collection logic here
  };

  const getOutcomeColors = (outcome: OutcomeType): OutcomeColors => {
    switch (outcome) {
      case 'Aligned': 
        return {
          primary: '#059669',
          bg: 'rgba(5, 150, 105, 0.1)',
          border: 'rgba(5, 150, 105, 0.3)'
        };
      case 'Misaligned': 
        return {
          primary: '#dc2626',
          bg: 'rgba(220, 38, 38, 0.1)',
          border: 'rgba(220, 38, 38, 0.3)'
        };
      case 'Challenged': 
        return {
          primary: '#dc2626',
          bg: 'rgba(220, 38, 38, 0.1)',
          border: 'rgba(220, 38, 38, 0.3)'
        };
      case 'New Data Added': 
        return {
          primary: '#d97706',
          bg: 'rgba(217, 119, 6, 0.1)',
          border: 'rgba(217, 119, 6, 0.3)'
        };
      case 'Refined': 
        return {
          primary: '#d97706',
          bg: 'rgba(217, 119, 6, 0.1)',
          border: 'rgba(217, 119, 6, 0.3)'
        };
      default: 
        return {
          primary: '#6b7280',
          bg: 'rgba(107, 114, 128, 0.1)',
          border: 'rgba(107, 114, 128, 0.3)'
        };
    }
  };

  const getOutcomeIcon = (outcome: OutcomeType) => {
    switch (outcome) {
      case 'Aligned': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Misaligned': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Challenged': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'New Data Added': return <Plus className="w-4 h-4 text-amber-600" />;
      case 'Refined': return <Info className="w-4 h-4 text-amber-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getQuoteText = (quote: any) => quote?.quote || quote?.text || 'No quote text provided';
  const getSpeaker = (quote: any) => quote?.speaker || 'No speaker information available';
  const getRole = (quote: any) => quote?.role || 'No role information available';
  const getClassification = (quote: any) => quote?.classification || '';

  const AttributeCard: React.FC<AttributeCardProps> = ({ 
    id, 
    icon: IconComponent, 
    title, 
    content, 
    colorClass, 
    hasValidation = false,
    validation
  }) => {
    const isExpanded = expandedAttributes.has(id);
    const colors = validation ? getOutcomeColors(validation.outcome) : {
      primary: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.1)',
      border: 'rgba(107, 114, 128, 0.3)'
    };

    console.log('🔧 Dashboard received quotes:', validation?.quotes);
    console.log('🔧 First quote structure:', validation?.quotes?.[0]);
    console.log('🔧 Quote properties:', Object.keys(validation?.quotes?.[0] || {}));

    return (
      <div className="bg-white/80 rounded-xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className={`p-2 ${colorClass} rounded-lg mr-3`}>
                <IconComponent className={`w-5 h-5 ${colorClass?.includes?.('blue') ? 'text-blue-600' : 
                  colorClass?.includes?.('purple') ? 'text-purple-600' :
                  colorClass?.includes?.('red') ? 'text-red-600' :
                  colorClass?.includes?.('green') ? 'text-green-600' :
                  colorClass?.includes?.('orange') ? 'text-orange-600' :
                  colorClass?.includes?.('indigo') ? 'text-indigo-600' :
                  'text-teal-600'}`} />
              </div>
              <h4 className={`text-sm font-bold uppercase tracking-wide ${
                colorClass?.includes?.('blue') ? 'text-blue-800' : 
                colorClass?.includes?.('purple') ? 'text-purple-800' :
                colorClass?.includes?.('red') ? 'text-red-800' :
                colorClass?.includes?.('green') ? 'text-green-800' :
                colorClass?.includes?.('orange') ? 'text-orange-800' :
                colorClass?.includes?.('indigo') ? 'text-indigo-800' :
                'text-teal-800'
              }`}>{title}</h4>
            </div>
            {hasValidation && validation && (
              <div className="flex items-center space-x-2">
                {getOutcomeIcon(validation.outcome)}
                <span className="font-bold text-lg" style={{ color: colors?.primary }}>
                  {validation.outcome}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mb-4">{content}</p>
          {hasValidation && validation && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: colors?.bg, border: `1px solid ${colors?.border}` }}>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getOutcomeIcon(validation.outcome)}
                  <span className="font-bold text-lg" style={{ color: colors?.primary }}>
                    {validation.outcome}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Assumption</h5>
                    <p className="text-gray-600">{validation?.assumption || 'No assumption identified from deck'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Reality</h5>
                    <p className="text-gray-600">{validation?.reality || 'No reality identified from deck'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Confidence</h5>
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${validation?.confidence ?? 0}%`,
                            backgroundColor: colors?.primary 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium" style={{ color: colors?.primary }}>
                        {validation?.confidence ?? 0}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{validation?.confidence_explanation || 'No confidence explanation provided'}</p>
                  </div>
                  {Array.isArray(validation?.quotes) && validation.quotes.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Supporting Quotes</h5>
                      <div className="space-y-2">
                        {(validation?.quotes || []).map((quote, index) => (
                          <div key={index} className="bg-white/50 rounded-lg p-3 border border-gray-200">
                            <p className="text-gray-600 italic">"{getQuoteText(quote)}"</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm text-gray-500">- {getSpeaker(quote)}</p>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                getRole(quote).includes('Paralegal') ? 'bg-purple-100 text-purple-700' :
                                getRole(quote).includes('Attorney') ? 'bg-blue-100 text-blue-700' :
                                getRole(quote).includes('Ops') ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {getRole(quote)}
                              </span>
                              {getClassification(quote) && (
                                <span className="ml-2 text-xs font-semibold text-gray-500">{getClassification(quote)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // === PHASE 2 STATE MANAGEMENT ===
  const [assumptions, setAssumptions] = useState<AssumptionState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper: Process deck assumptions into initial state
  const processDeckAssumptions = (deckAssumptions: any[]): AssumptionState[] => {
    const initialAssumptions: AssumptionState[] = deckAssumptions.map((assumption, index) => ({
      id: `deck-assumption-${index}`,
      assumption: assumption.text || assumption.assumption,
      category: assumption.category || 'GENERAL',
      status: 'PENDING_VALIDATION',
      source: 'DECK_ONLY',
      deckEvidence: assumption.evidence || assumption.supportingText,
      slideNumber: assumption.slideNumber,
      quotes: [],
      confidence: 0,
      explanation: 'Extracted from sales deck, awaiting interview validation',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }));
    console.log('=== PHASE 2: DECK ASSUMPTIONS PROCESSED ===');
    console.log('Created assumptions with PENDING_VALIDATION status:', initialAssumptions);
    return initialAssumptions;
  };

  // Helper: Start interview processing (set status)
  const startInterviewProcessing = (assumptions: AssumptionState[]) => {
    console.log('=== PHASE 2: STARTING INTERVIEW PROCESSING ===');
    const processingAssumptions = assumptions.map(assumption => ({
      ...assumption,
      status: 'PROCESSING' as const,
      explanation: 'Analyzing interview data...',
      lastUpdated: new Date().toISOString()
    }));
    setAssumptions(processingAssumptions);
    return processingAssumptions;
  };

  // Helper: Complete interview processing (update state)
  const completeInterviewProcessing = (assumptions: AssumptionState[], processedData: any[]) => {
    console.log('=== PHASE 2: COMPLETING INTERVIEW PROCESSING ===');
    const completedAssumptions = assumptions.map(assumption => {
      const processed = processedData.find((p: any) => p.assumption === assumption.assumption);
      if (processed && processed.quotes && processed.quotes.length > 0) {
        const result = calculateBuyerMapOutcome(processed.quotes);
        return {
          ...assumption,
          status: result.outcome as AssumptionState['status'],
          source: 'INTERVIEWS_PROCESSED' as const,
          quotes: processed.quotes,
          confidence: result.confidence,
          explanation: result.explanation,
          lastUpdated: new Date().toISOString()
        };
      } else {
        return {
          ...assumption,
          status: 'PENDING_VALIDATION' as const,
          explanation: 'No relevant interview data found for this assumption',
          lastUpdated: new Date().toISOString()
        };
      }
    });
    console.log('Completed assumptions:', completedAssumptions);
    setAssumptions(completedAssumptions);
    return completedAssumptions;
  };

  // Deck upload handler (simulate deck upload for demo)
  const handleDeckUpload = async (deckAssumptions: any[]) => {
    const initialAssumptions = processDeckAssumptions(deckAssumptions);
    setAssumptions(initialAssumptions);
  };

  // Interview upload handler
  const handleInterviewUpload = async (files: FileList) => {
    if (assumptions.length === 0) {
      console.error('No assumptions found. Upload deck first.');
      return;
    }
    setIsProcessing(true);
    const processingAssumptions = startInterviewProcessing(assumptions);
    try {
      // Use your existing API call logic here
      const updatedData = await handleInterviewAnalysis(files, buyerMapData);
      // updatedData.assumptions should match the processedData structure
      completeInterviewProcessing(processingAssumptions, updatedData.assumptions || []);
      setIsProcessing(false);
    } catch (error) {
      console.error('Interview processing failed:', error);
      setAssumptions(prev => prev.map(a => ({
        ...a,
        status: a.source === 'DECK_ONLY' ? 'PENDING_VALIDATION' : a.status,
        explanation: a.source === 'DECK_ONLY' ? 'Ready for interview validation' : a.explanation
      })));
      setIsProcessing(false);
    }
  };

  // Display status helper
  const getDisplayStatus = (assumption: AssumptionState) => {
    if (assumption.source === 'DECK_ONLY') {
      return { label: 'Pending Validation', color: 'gray', description: 'Upload interviews to validate this assumption' };
    }
    if (assumption.status === 'PROCESSING') {
      return { label: 'Processing', color: 'blue', description: 'Analyzing interview data...' };
    }
    switch (assumption.status) {
      case 'ALIGNED': return { label: 'Aligned', color: 'green', description: 'Interview data supports this assumption' };
      case 'MISALIGNED': return { label: 'Misaligned', color: 'red', description: 'Interview data contradicts this assumption' };
      case 'NEW_DATA_ADDED': return { label: 'Refined', color: 'orange', description: 'Interview data adds new insights' };
      case 'NEUTRAL': return { label: 'Neutral', color: 'blue', description: 'Interview data neither supports nor contradicts' };
      default: return { label: 'Pending Validation', color: 'gray', description: 'Ready for interview validation' };
    }
  };

  // === PHASE 3: BuyerMap Grouping and Collapsed/Expanded Cards ===
  const groupAssumptionsByCategory = (assumptions: AssumptionState[]) => {
    console.log('=== GROUPING DEBUG ===');
    console.log('Input assumptions for grouping:', assumptions);
    
    const categoryGroups = [
      {
        id: 'who',
        title: 'WHO • Target Customer Profile',
        icon: '👥',
        categories: ['BUYER_TITLES', 'COMPANY_SIZE'],
        assumptions: [] as AssumptionState[]
      },
      {
        id: 'what',
        title: 'WHAT • Problems & Solutions', 
        icon: '⚠️',
        categories: ['PAIN_POINTS', 'DESIRED_OUTCOMES'],
        assumptions: [] as AssumptionState[]
      },
      {
        id: 'when',
        title: 'WHEN • Purchase Triggers',
        icon: '⚡',
        categories: ['TRIGGERS'],
        assumptions: [] as AssumptionState[]
      },
      {
        id: 'why',
        title: 'WHY • Barriers & Objections',
        icon: '🚧', 
        categories: ['BARRIERS', 'MESSAGING_EMPHASIS'],
        assumptions: [] as AssumptionState[]
      }
    ];

    // Group assumptions into categories
    assumptions.forEach((assumption, idx) => {
      console.log(`Grouping assumption ${idx + 1}:`, {
        category: assumption.category,
        assumption: assumption.assumption
      });
      
      const categoryGroup = categoryGroups.find(group => 
        group.categories.includes(assumption.category?.toUpperCase())
      );
      
      if (categoryGroup) {
        categoryGroup.assumptions.push(assumption);
        console.log(`  ✅ Added to ${categoryGroup.title} group`);
      } else {
        console.log(`  ❌ No group found for category: ${assumption.category}`);
        // Default to WHO group for unmatched
        categoryGroups[0].assumptions.push(assumption);
        console.log(`  ➡️ Added to default WHO group`);
      }
    });

    // Log final groups
    categoryGroups.forEach(group => {
      console.log(`${group.title}: ${group.assumptions.length} assumptions`);
    });

    // Return all groups that have assumptions
    const nonEmptyGroups = categoryGroups.filter(group => group.assumptions.length > 0);
    console.log(`Returning ${nonEmptyGroups.length} non-empty groups`);
    
    return nonEmptyGroups;
  };

  // Add expanded state management
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpand = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const PendingAssumptionCard = ({ assumption }: { assumption: AssumptionState }) => {
    const getCategoryIcon = (category: string) => {
      const iconMap = {
        'BUYER_TITLES': '👥',
        'COMPANY_SIZE': '🏢',
        'PAIN_POINTS': '⚠️', 
        'DESIRED_OUTCOMES': '🏆',
        'TRIGGERS': '⚡',
        'BARRIERS': '🚧',
        'MESSAGING_EMPHASIS': '💬'
      };
      return iconMap[category?.toUpperCase() as keyof typeof iconMap] || '📋';
    };
    const getCategoryDisplayName = (category: string) => {
      const nameMap = {
        'BUYER_TITLES': 'BUYER TITLES',
        'COMPANY_SIZE': 'COMPANY SIZE',
        'PAIN_POINTS': 'PAIN POINTS',
        'DESIRED_OUTCOMES': 'DESIRED OUTCOMES',
        'TRIGGERS': 'TRIGGERS',
        'BARRIERS': 'BARRIERS',
        'MESSAGING_EMPHASIS': 'MESSAGING EMPHASIS'
      };
      return nameMap[category?.toUpperCase() as keyof typeof nameMap] || 'GENERAL';
    };
    const getCategoryColor = (category: string) => {
      const colorMap = {
        'BUYER_TITLES': 'blue',
        'COMPANY_SIZE': 'purple',
        'PAIN_POINTS': 'red',
        'DESIRED_OUTCOMES': 'green',
        'TRIGGERS': 'orange',
        'BARRIERS': 'gray',
        'MESSAGING_EMPHASIS': 'indigo'
      };
      return colorMap[category?.toUpperCase() as keyof typeof colorMap] || 'blue';
    };
    const categoryColor = getCategoryColor(assumption.category);
    const isExpanded = expandedCards.has(assumption.id);

    return (
      <div className="assumption-card pending-card">
        <div className="card-header" onClick={() => toggleCardExpand(assumption.id)}>
          <div className="category-info">
            <div className={`category-icon-container ${categoryColor}`}>
              <span className="category-icon">{getCategoryIcon(assumption.category)}</span>
            </div>
            <h3 className={`category-title ${categoryColor}`}>
              {getCategoryDisplayName(assumption.category)}
            </h3>
          </div>
          <div className="status-container">
            <span className="status-text pending">Pending Validation</span>
            <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>›</span>
          </div>
        </div>
        <div className="assumption-content">
          <p className="assumption-text">{assumption.assumption}</p>
          {isExpanded && (
            <div className="expanded-content">
              <div className="deck-evidence">
                <h4>Deck Evidence</h4>
                <p>{assumption.deckEvidence || 'No evidence provided'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- StatusBadge Subcomponent ---
  const StatusBadge = ({ status, confidence }: { status: string, confidence: number }) => {
    const color = status === 'ALIGNED' ? '#16a34a' : status === 'MISALIGNED' ? '#dc2626' : '#6b7280';
    const icon = status === 'ALIGNED' ? '✔️' : status === 'MISALIGNED' ? '❌' : '⚠️';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
        color, background: '#f0fdf4', borderRadius: 999, padding: '0.3em 1em', fontSize: '1rem'
      }}>
        <span>{icon}</span>
        <span style={{textTransform: 'capitalize'}}>{status.toLowerCase()}</span>
        <span style={{marginLeft: 8, fontWeight: 700}}>{confidence}%</span>
      </span>
    );
  };

  // --- ConfidenceBar Subcomponent ---
  const ConfidenceBar = ({ confidence, strength }: { confidence: number, strength: string }) => {
    const color = strength === 'HIGH' ? '#16a34a' : strength === 'MEDIUM' ? '#f59e42' : '#dc2626';
    return (
      <div style={{margin: '0.5em 0'}}>
        <div style={{background: '#e5e7eb', borderRadius: 8, height: 8, width: '100%'}}>
          <div style={{
            width: `${confidence}%`, background: color, height: 8, borderRadius: 8, transition: 'width 0.4s'
          }} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4}}>
          <span>Confidence</span>
          <span style={{fontWeight: 700}}>{confidence}%</span>
        </div>
      </div>
    );
  };

  // --- EnhancedQuoteDisplay Subcomponent ---
  const EnhancedQuoteDisplay = ({ quotes, interviewCount, showAllQuotes, setShowAllQuotes }: { quotes: any[], interviewCount: number, showAllQuotes: boolean, setShowAllQuotes: (v: boolean) => void }) => {
    const visibleQuotes = showAllQuotes ? quotes : quotes.slice(0, 2);
    return (
      <div>
        {visibleQuotes.map((q, i) => (
          <div key={i} className="mb-2">
            <div className="italic text-sm text-gray-800">"{q.text || q.quote || q.content}"</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              — {q.speaker}{q.role ? `, ${q.role}` : ''}{q.company ? ` at ${q.company}` : ''}
              {q.role && <span className="ml-2 bg-green-50 text-green-700 rounded px-2 py-0.5 text-xs font-medium">{q.role}</span>}
            </div>
          </div>
        ))}
        {quotes.length > 2 && !showAllQuotes && (
          <button
            className="mt-1 text-green-700 bg-green-50 rounded px-3 py-1 text-xs font-semibold hover:bg-green-100 transition"
            onClick={e => { e.stopPropagation(); setShowAllQuotes(true); }}
          >
            + View {quotes.length - 2} more quotes
          </button>
        )}
        <div className="text-xs text-gray-400 mt-2">{interviewCount} interview{interviewCount === 1 ? '' : 's'}</div>
      </div>
    );
  };

  // --- Main Card ---
  const ProcessedAssumptionCard = ({ assumption }: { assumption: AssumptionStateWithAPI }) => {
    // Collapsible state
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [showAllQuotes, setShowAllQuotes] = React.useState(false);
    React.useEffect(() => { if (!isExpanded) setShowAllQuotes(false); }, [isExpanded]);
    const toggleExpanded = () => setIsExpanded((prev) => !prev);

    const keyFinding = assumption.keyFinding || assumption.realityFromInterviews || assumption.explanation || '';
    const confidenceAnalysis = assumption.confidenceAnalysis || assumption.confidenceExplanation || assumption.explanation || '';
    const refinedStatement = assumption.refinedStatement || assumption.assumption || '';
    const evidenceStrength = assumption.evidenceStrength || (assumption.confidenceScore && assumption.confidenceScore >= 80 ? 'HIGH' : assumption.confidenceScore && assumption.confidenceScore >= 50 ? 'MEDIUM' : 'LOW');
    const interviewCount = assumption.interviewCount ?? (assumption.quotes ? assumption.quotes.length : 0) ?? 0;

    // Category helpers for icon and display name
    const getCategoryIcon = (category: string) => {
      const iconMap = {
        'BUYER_TITLES': '👥',
        'COMPANY_SIZE': '🏢',
        'PAIN_POINTS': '⚠️', 
        'DESIRED_OUTCOMES': '🏆',
        'TRIGGERS': '⚡',
        'BARRIERS': '🚧',
        'MESSAGING_EMPHASIS': '💬'
      };
      return iconMap[category?.toUpperCase() as keyof typeof iconMap] || '📋';
    };
    const getCategoryDisplayName = (category: string) => {
      const nameMap = {
        'BUYER_TITLES': 'BUYER TITLES',
        'COMPANY_SIZE': 'COMPANY SIZE',
        'PAIN_POINTS': 'PAIN POINTS',
        'DESIRED_OUTCOMES': 'DESIRED OUTCOMES',
        'TRIGGERS': 'TRIGGERS',
        'BARRIERS': 'BARRIERS',
        'MESSAGING_EMPHASIS': 'MESSAGING EMPHASIS'
      };
      return nameMap[category?.toUpperCase() as keyof typeof nameMap] || 'GENERAL';
    };

    return (
      <div className="bg-white border border-gray-200 border-l-4 rounded-lg shadow-sm mb-3" style={{borderLeftColor: assumption.status === 'ALIGNED' ? '#16a34a' : assumption.status === 'MISALIGNED' ? '#dc2626' : '#eab308'}}>
        {/* Header (clickable) */}
        <div
          className="flex items-center p-4 gap-3 cursor-pointer group"
          onClick={toggleExpanded}
        >
          <span className="text-xl mr-2 flex-shrink-0">{getCategoryIcon(assumption.category)}</span>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-gray-500 font-medium leading-tight mb-0.5">{getCategoryDisplayName(assumption.category)}</span>
            <span className="text-base font-medium text-gray-900 leading-snug truncate" title={refinedStatement}>{refinedStatement}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={assumption.status} confidence={assumption.confidenceScore ?? 0} />
            <button className="p-1 rounded hover:bg-gray-100 transition flex items-center" tabIndex={-1} onClick={e => { e.stopPropagation(); toggleExpanded(); }}>
              {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>
        {/* Separator */}
        {isExpanded && <div className="border-t border-gray-100 mx-4" />}
        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pt-3 pb-4">
            {/* Key Finding */}
            <div className="bg-green-50 border-l-4 border-green-400 rounded p-3 flex items-start gap-3 mb-3">
              <span className="text-lg text-green-600 mt-0.5">✔️</span>
              <div>
                <div className="text-xs font-semibold text-green-700 mb-0.5">KEY FINDING</div>
                <div className="text-sm text-green-900 font-medium leading-snug">{keyFinding}</div>
              </div>
            </div>
            {/* Confidence Analysis */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">📊 CONFIDENCE ANALYSIS</div>
              <ConfidenceBar confidence={assumption.confidenceScore ?? 0} strength={evidenceStrength} />
              <div className="text-sm text-gray-700 mt-1 leading-tight">{confidenceAnalysis}</div>
            </div>
            {/* Supporting Evidence */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">💬 SUPPORTING EVIDENCE</div>
              <EnhancedQuoteDisplay quotes={assumption.quotes} interviewCount={interviewCount} showAllQuotes={showAllQuotes} setShowAllQuotes={setShowAllQuotes} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Use useMemo to always have correct categories
  const processedAssumptions = useMemo(() => {
    console.log('=== PROCESSING ASSUMPTIONS DEBUG ===');
    
    // Get the raw assumptions from buyerMapData
    const rawAssumptions = buyerMapData?.assumptions || [];
    console.log('Raw assumptions from buyerMapData:', rawAssumptions);
    
    if (rawAssumptions.length === 0) {
      console.log('No raw assumptions found, returning empty array');
      return [];
    }
    
    // Apply the fixing function
    const fixed = fixAssumptionCategories(rawAssumptions);
    console.log('Fixed assumptions after processing:', fixed);
    
    return fixed;
  }, [buyerMapData]); // Make sure dependency is correct

  // Log each assumption's details
  processedAssumptions?.forEach((assumption: any, idx: number) => {
    console.log(`Assumption ${idx + 1}:`);
    console.log(`  Text: "${assumption.assumption}"`);
    console.log(`  Category: "${assumption.category}"`);
    console.log(`  Source: "${assumption.source}"`);
    console.log(`  Status: "${assumption.status}"`);
  });

  const renderAssumptions = () => {
    console.log('=== RENDER FUNCTION DEBUG ===');
    console.log('processedAssumptions (should have proper categories):', processedAssumptions);
    
    // Verify each assumption has proper data
    processedAssumptions.forEach((assumption, idx) => {
      console.log(`Render assumption ${idx + 1}:`, {
        id: assumption.id,
        category: assumption.category,
        assumption: assumption.assumption,
        source: assumption.source
      });
    });
    
    const hasPendingOnly = processedAssumptions.every(a => a.source === 'DECK_ONLY');
    
    console.log('Has pending only:', hasPendingOnly);
    console.log('About to group assumptions...');
    
    const categoryGroups = groupAssumptionsByCategory(processedAssumptions);
    console.log('Category groups returned:', categoryGroups);
    
    if (categoryGroups.length === 0) {
      return (
        <div className="buyer-map-layout">
          <h1>Buyer Map</h1>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Debug: No category groups found</p>
            <p>Processed assumptions: {processedAssumptions.length}</p>
            <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1rem' }}>
              {JSON.stringify(processedAssumptions.map(a => ({ 
                category: a.category, 
                assumption: a.assumption?.slice(0, 50) + '...' 
              })), null, 2)}
            </pre>
          </div>
        </div>
      );
    }
    
    return (
      <div className="buyer-map-layout">
        <h1>Buyer Map</h1>
        {categoryGroups.map(group => (
          <div key={group.id} className="category-section">
            <h2 className="category-header">
              <span className="category-emoji">{group.icon}</span>
              {group.title}
            </h2>
            <div className="assumptions-list">
              {group.assumptions.map(assumption => (
                hasPendingOnly ? (
                  <PendingAssumptionCard key={assumption.id} assumption={assumption} />
                ) : (
                  <ProcessedAssumptionCard key={assumption.id} assumption={assumption} />
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // File input handler for interview upload
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    handleInterviewUpload(files);
  };

  // For demo: simulate deck upload on mount if no assumptions
  useEffect(() => {
    if (assumptions.length === 0 && buyerMapData?.assumptions) {
      // Use the deck assumptions from buyerMapData
      handleDeckUpload(buyerMapData.assumptions);
    }
  }, [buyerMapData]);

  // === PHASE 1 DEBUG: API RESPONSE ===
  // Add this after receiving the API response to debug what you're getting
  console.log('=== PHASE 1 DEBUG: API RESPONSE ===');
  console.log('Full response:', buyerMapData);
  if (buyerMapData?.assumptions) {
    buyerMapData.assumptions.forEach((assumption, idx) => {
      console.log(`\nAssumption ${idx + 1}: ${(assumption as any).assumption || assumption.v1Assumption}`);
      console.log(`  Total quotes: ${assumption.quotes?.length || 0}`);
      console.log(`  Quote classifications:`, (assumption.quotes || []).map((q: any) => q.classification) || []);
      console.log(`  Current status/outcome:`, (assumption as any).outcome || (assumption as any).status || 'not set');
    });
  }

  // === BuyerMap-compliant outcome calculation ===
  function calculateBuyerMapOutcome(quotes: any[]): {
    outcome: string;
    confidence: number;
    explanation: string;
  } {
    if (!quotes || quotes.length === 0) {
      return {
        outcome: 'PENDING_VALIDATION',
        confidence: 0,
        explanation: 'No quotes available for analysis'
      };
    }

    // Group quotes by interview source to count interview consensus
    const interviewData = new Map();
    const roleSet = new Set();

    quotes.forEach(quote => {
      const source = quote.source || quote.fileName || 'unknown';
      const role = quote.role || quote.speaker_role || 'unknown';
      
      if (!interviewData.has(source)) {
        interviewData.set(source, {
          classifications: new Set(),
          roles: new Set(),
          quotes: []
        });
      }
      
      interviewData.get(source).classifications.add((quote.classification || '').toUpperCase());
      interviewData.get(source).roles.add(role);
      interviewData.get(source).quotes.push(quote);
      roleSet.add(role);
    });

    // Count interview consensus (each interview contributes its strongest signal)
    const interviewOutcomes = {
      ALIGNED: 0,
      MISALIGNED: 0,
      NEW_INSIGHT: 0,
      NEUTRAL: 0
    };

    interviewData.forEach((data, source) => {
      // Priority: MISALIGNED > ALIGNED > NEW_INSIGHT > NEUTRAL
      if (data.classifications.has('MISALIGNED')) {
        interviewOutcomes.MISALIGNED++;
      } else if (data.classifications.has('ALIGNED')) {
        interviewOutcomes.ALIGNED++;
      } else if (data.classifications.has('NEW_INSIGHT')) {
        interviewOutcomes.NEW_INSIGHT++;
      } else {
        interviewOutcomes.NEUTRAL++;
      }
    });

    const totalInterviews = interviewData.size;
    const totalQuotes = quotes.length;
    const roleDiversity = roleSet.size;

    // Determine outcome based on interview majority
    let outcome = 'NEUTRAL';
    if (interviewOutcomes.MISALIGNED > interviewOutcomes.ALIGNED + interviewOutcomes.NEW_INSIGHT) {
      outcome = 'MISALIGNED';
    } else if (interviewOutcomes.ALIGNED > interviewOutcomes.MISALIGNED + interviewOutcomes.NEW_INSIGHT) {
      outcome = 'ALIGNED';
    } else if (interviewOutcomes.NEW_INSIGHT > 0 && interviewOutcomes.MISALIGNED <= interviewOutcomes.ALIGNED) {
      outcome = 'NEW_DATA_ADDED';
    }

    // Calculate confidence score using BuyerMap factors
    let confidence = 0;
    confidence += Math.min(totalQuotes * 5, 40); // Quote volume
    confidence += Math.min(roleDiversity * 10, 30); // Role diversity
    confidence += Math.min(totalInterviews * 5, 20); // Interview coverage
    const dominantCount = Math.max(...Object.values(interviewOutcomes));
    const consensusStrength = totalInterviews > 0 ? dominantCount / totalInterviews : 0;
    confidence += consensusStrength * 10;
    confidence = Math.min(Math.round(confidence), 100);

    // Generate explanation
    const explanation = `Based on ${totalQuotes} quotes from ${totalInterviews} interviews with ${roleDiversity} different roles. ${dominantCount}/${totalInterviews} interviews show ${outcome.toLowerCase().replace('_', ' ')} evidence.`;

    console.log('BuyerMap calculation for assumption:', {
      outcome,
      confidence,
      interviewBreakdown: interviewOutcomes,
      totalInterviews,
      totalQuotes,
      roleDiversity
    });

    return { outcome, confidence, explanation };
  }

  const getDynamicICPTitle = () => {
    const assumptions = buyerMapData?.assumptions || [];
    if (assumptions.length > 0) {
      // Prefer icpTheme, fallback to v1Assumption, then fallback
      const first = assumptions[0];
      const theme = first.icpTheme && first.icpTheme.trim();
      if (theme) return `${theme} ICP`;
      const v1 = first.v1Assumption && first.v1Assumption.trim();
      if (v1) return `${v1} ICP`;
    }
    return 'Business ICP';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="dashboard-header-container" style={{marginBottom: '2.5rem'}}>
          <div className="dashboard-header-main" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap'}}>
            <div className="dashboard-header-title-area" style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
              <div className="dashboard-app-icon" style={{width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 60%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div>
                <h1 className="dashboard-title" style={{fontSize: '2.25rem', fontWeight: 700, color: '#1f2937', margin: 0}}>{getDynamicICPTitle()}</h1>
                <div className="dashboard-subtitle" style={{fontSize: '1.1rem', color: '#6b7280', marginTop: '0.25rem'}}>Built from archetype analysis and sales deck assumptions</div>
              </div>
            </div>
            <div className="dashboard-header-actions" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <button className="btn btn-primary" style={{background: '#2563eb', color: '#fff', fontWeight: 600, borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '1rem', border: 'none', boxShadow: '0 1px 2px rgba(37,99,235,0.08)', cursor: 'pointer', transition: 'background 0.2s'}} onClick={handleUploadClick}>
                Upload Interviews
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept={allowedExtensions.join(',')}
                multiple
              />
              <button className="btn btn-secondary" style={{background: '#f3f4f6', color: '#2563eb', fontWeight: 600, borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '1rem', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 1px 2px rgba(37,99,235,0.04)', cursor: 'pointer', transition: 'background 0.2s'}}>
                <svg width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                Export Analysis
              </button>
            </div>
          </div>
          <div className="dashboard-header-meta" style={{display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1.5rem', flexWrap: 'wrap'}}>
            <span className="meta-pill" style={{background: '#dbeafe', color: '#2563eb', fontWeight: 600, borderRadius: '999px', padding: '0.4rem 1.1rem', fontSize: '1rem'}}>ICP Collection 2025</span>
            <span className="meta-id" style={{color: '#6b7280', fontWeight: 500, fontSize: '1rem'}}>#001</span>
            <span className="meta-validated" style={{background: '#dcfce7', color: '#16a34a', fontWeight: 600, borderRadius: '999px', padding: '0.4rem 1.1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <svg width="18" height="18" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9.5 17 4 11.5"/></svg>
              Validated against 47 interviews
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {renderAssumptions()}
        </div>
      </div>
    </div>
  );
}

export default ICPValidationDashboard;