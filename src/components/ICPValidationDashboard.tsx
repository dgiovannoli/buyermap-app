import React, { useState, useEffect, useRef } from 'react';
import { Users, Target, Calendar, Shield, Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { BuyerMapData, ValidationAttribute, ICPValidationData, Quote, ICPValidationResponse } from '../types/buyermap';
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

  // Extract assumptions array from buyerMapData (the API response object)
  const assumptions = responseData.assumptions || [];
  console.log('Assumptions being passed to createValidationData:', assumptions);
  const validationData = createValidationData(assumptions);
  console.log('Created validation data:', validationData);

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
    attributes.forEach(attr => {
      console.log(`Attribute ${attr} data:`, validationData[attr]);
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ICP Validation Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {icpValidation?.subtitle || 'Validate your ICP assumptions against real customer interviews'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={handleUploadClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Interviews
          </button>
          <button
            onClick={handleExportAnalysis}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Analysis
          </button>
          <button
            onClick={handleViewCollection}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Collection
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".mp3,.mp4,.wav,.m4a,.txt,.pdf,.docx,.doc"
          multiple
        />

        {/* Main Content */}
        <div className="space-y-8">
          {/* WHO Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">WHO</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectionAttributes.who.map(attr => {
                const data = validationData[attr];
                console.log(`Rendering WHO card for ${attr}:`, data);
                return (
                  <AttributeCard
                    key={attr}
                    id={attr}
                    icon={Users}
                    title={attr.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    content={data.assumption || 'No assumption identified from deck'}
                    colorClass="bg-blue-100"
                    hasValidation={!!data}
                    validation={data}
                  />
                );
              })}
            </div>
          </div>

          {/* WHAT Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">WHAT</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectionAttributes.what.map(attr => {
                const data = validationData[attr];
                console.log(`Rendering WHAT card for ${attr}:`, data);
                return (
                  <AttributeCard
                    key={attr}
                    id={attr}
                    icon={Target}
                    title={attr.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    content={data.assumption || 'No assumption identified from deck'}
                    colorClass="bg-purple-100"
                    hasValidation={!!data}
                    validation={data}
                  />
                );
              })}
            </div>
          </div>

          {/* WHEN Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">WHEN</h2>
            <div className="grid grid-cols-1 gap-6">
              {sectionAttributes.when.map(attr => {
                const data = validationData[attr];
                console.log(`Rendering WHEN card for ${attr}:`, data);
                return (
                  <AttributeCard
                    key={attr}
                    id={attr}
                    icon={Calendar}
                    title={attr.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    content={data.assumption || 'No assumption identified from deck'}
                    colorClass="bg-green-100"
                    hasValidation={!!data}
                    validation={data}
                  />
                );
              })}
            </div>
          </div>

          {/* WHY & HOW Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">WHY & HOW</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectionAttributes.whyHow.map(attr => {
                const data = validationData[attr];
                console.log(`Rendering WHY & HOW card for ${attr}:`, data);
                return (
                  <AttributeCard
                    key={attr}
                    id={attr}
                    icon={Shield}
                    title={attr.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    content={data.assumption || 'No assumption identified from deck'}
                    colorClass="bg-orange-100"
                    hasValidation={!!data}
                    validation={data}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ICPValidationDashboard;