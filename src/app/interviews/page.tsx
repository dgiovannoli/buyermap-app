'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Building, 
  Tag, 
  Search, 
  Filter, 
  Plus, 
  BarChart3,
  Clock,
  Upload,
  FileText,
  MapPin,
  Briefcase,
  MessageSquare,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { StoredInterview, InterviewFilterCriteria } from '../../types/buyermap';

interface InterviewLibraryProps {
  // Will be populated from database
}

export default function InterviewLibraryPage() {
  const [interviews, setInterviews] = useState<StoredInterview[]>([]);
  const [filteredInterviews, setFilteredInterviews] = useState<StoredInterview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<InterviewFilterCriteria>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingInterview, setDeletingInterview] = useState<string | null>(null);
  const [analyzedInterviewIds, setAnalyzedIds] = useState<string[]>(getAnalyzedInterviewIds());

  // Load user's interviews from database
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoading(true);
        console.log('🔍 [INTERVIEWS] Loading interviews from API...');
        
        // Use the new API route instead of client-side function
        const response = await fetch('/api/get-user-interviews');
        
        if (!response.ok) {
          // Check if it's an authentication error
          if (response.status === 401) {
            throw new Error('Authentication required: Please log in to access your interview library');
          }
          throw new Error(`Failed to fetch interviews: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('🔍 [INTERVIEWS] API response:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch interviews');
        }
        
        const userInterviews = result.interviews;
        
        console.log('🔍 [INTERVIEWS] Raw database response:', userInterviews);
        
        // Convert database format to StoredInterview format
        const convertedInterviews: StoredInterview[] = userInterviews.map((interview: any) => ({
          id: interview.id,
          filename: interview.filename,
          uploadDate: new Date(interview.upload_date),
          status: interview.status,
          companySize: interview.company_size,
          role: interview.role,
          industry: interview.industry,
          region: interview.region,
          quotesExtracted: interview.quotes_extracted,
          processingTime: interview.processing_time,
          uniqueSpeakers: interview.unique_speakers,
          vectorsStored: interview.vectors_stored,
          tags: interview.tags || [],
          blobUrl: interview.blob_url
        }));
        
        console.log('🔍 [INTERVIEWS] Converted interviews:', convertedInterviews.map(i => ({
          id: i.id,
          filename: i.filename,
          hasBlobUrl: !!i.blobUrl,
          blobUrl: i.blobUrl ? `${i.blobUrl.substring(0, 50)}...` : 'null'
        })));
        
        setInterviews(convertedInterviews);
        // Save to localStorage for results page summary
        if (typeof window !== 'undefined') {
          localStorage.setItem('allUserInterviews', JSON.stringify(convertedInterviews));
        }
        setError(null);
      } catch (error: any) {
        console.error('❌ [INTERVIEWS] Failed to load interviews:', error);
        
        // Check if it's an authentication error
        if (error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('Unauthorized') ||
          error.message.includes('Authentication required')
        )) {
          setError('Please log in to access your interview library. You will be redirected to the login page.');
          // Redirect to auth debug page after a short delay
          setTimeout(() => {
            window.location.href = '/auth-debug';
          }, 2000);
        } else {
          setError('Failed to load interviews. Please try again.');
        }
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadInterviews();
  }, []);

  // Update analyzedInterviewIds from localStorage on mount
  useEffect(() => {
    setAnalyzedIds(getAnalyzedInterviewIds());
  }, []);

  // Enhanced status detection for better filtering
  const getInterviewStatus = (interview: StoredInterview) => {
    // Check for various invalid states
    if (interview.status === 'failed') {
      return { status: 'error' as const, label: 'Processing Failed', description: 'Interview failed to process' };
    }
    
    if (interview.quotesExtracted === 0) {
      return { status: 'no-quotes' as const, label: 'No Quotes Found', description: 'No relevant quotes extracted' };
    }
    
    if (interview.status === 'processing') {
      return { status: 'processing' as const, label: 'Processing', description: 'Currently being analyzed' };
    }
    
    if (interview.quotesExtracted > 0 && interview.status === 'completed') {
      return { status: 'valid' as const, label: 'Valid', description: 'Successfully processed with quotes' };
    }
    
    // Default fallback
    return { status: 'unknown' as const, label: 'Unknown', description: 'Status unclear' };
  };

  // Delete interview functionality
  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }

    setDeletingInterview(interviewId);
    
    try {
      const response = await fetch(`/api/delete-interview`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete interview: ${response.status}`);
      }

      // Remove from local state
      setInterviews(prev => prev.filter(i => i.id !== interviewId));
      setSelectedInterviews(prev => prev.filter(id => id !== interviewId));
      
      console.log('✅ [DELETE] Interview deleted successfully:', interviewId);
    } catch (error: any) {
      console.error('❌ [DELETE] Failed to delete interview:', error);
      alert(`Failed to delete interview: ${error.message}`);
    } finally {
      setDeletingInterview(null);
    }
  };

  // Filter interviews based on search and criteria
  useEffect(() => {
    let filtered = interviews;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(interview => 
        interview.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (selectedFilters.status?.length) {
      filtered = filtered.filter(interview => {
        const status = getInterviewStatus(interview);
        return selectedFilters.status!.includes(status.status);
      });
    }

    // Company size filter
    if (selectedFilters.companySize?.length) {
      filtered = filtered.filter(interview => 
        selectedFilters.companySize!.includes(interview.companySize || '')
      );
    }

    // Role filter
    if (selectedFilters.roles?.length) {
      filtered = filtered.filter(interview => 
        selectedFilters.roles!.some(role => 
          interview.role?.toLowerCase().includes(role.toLowerCase())
        )
      );
    }

    setFilteredInterviews(filtered);
  }, [interviews, searchTerm, selectedFilters]);

  const handleFilterChange = (filterType: keyof InterviewFilterCriteria, value: string, checked: boolean) => {
    setSelectedFilters(prev => {
      const currentValues = prev[filterType] as string[] || [];
      const newValues = checked 
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);
      
      return {
        ...prev,
        [filterType]: newValues.length > 0 ? newValues : undefined
      };
    });
  };

  const handleInterviewSelect = (interviewId: string, checked: boolean) => {
    setSelectedInterviews(prev => 
      checked 
        ? [...prev, interviewId]
        : prev.filter(id => id !== interviewId)
    );
  };

  // When Analyze Selected is clicked, update analyzedInterviewIds
  const handleAnalyzeSelected = () => {
    if (selectedInterviews.length === 0) {
      alert('Please select at least one interview to analyze.');
      return;
    }
    // Get the selected interview data
    const selectedInterviewData = interviews.filter(interview => 
      selectedInterviews.includes(interview.id)
    );
    // Store the selected interviews in localStorage for the main page to use
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedInterviewsForAnalysis', JSON.stringify(selectedInterviewData));
      // Update analyzedInterviewIds
      const newAnalyzed = Array.from(new Set([...analyzedInterviewIds, ...selectedInterviews]));
      setAnalyzedInterviewIds(newAnalyzed);
      setAnalyzedIds(newAnalyzed);
    }
    // Navigate to the main page to trigger analysis
    window.location.href = '/';
  };

  // Enhanced status badge with better visual indicators
  const getStatusBadge = (interview: StoredInterview) => {
    const status = getInterviewStatus(interview);
    
    const badgeStyles: Record<string, string> = {
      'valid': 'bg-green-100 text-green-800 border-green-200',
      'processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'error': 'bg-red-100 text-red-800 border-red-200',
      'no-quotes': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'unknown': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons: Record<string, React.ComponentType<any>> = {
      'valid': CheckCircle,
      'processing': Clock,
      'error': XCircle,
      'no-quotes': AlertTriangle,
      'unknown': AlertCircle
    };

    const Icon = icons[status.status];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[status.status]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.label}
      </span>
    );
  };

  const getCompanySizeIcon = (size?: string) => {
    switch (size) {
      case 'solo': return '👤';
      case 'small': return '👥';
      case 'medium': return '🏢';
      case 'large': return '🏬';
      case 'enterprise': return '🏭';
      default: return '❓';
    }
  };

  // Calculate statistics for different status types
  const getStatusStats = () => {
    const stats: Record<string, number> = {
      valid: 0,
      processing: 0,
      error: 0,
      'no-quotes': 0,
      unknown: 0
    };

    interviews.forEach(interview => {
      const status = getInterviewStatus(interview);
      stats[status.status]++;
    });

    return stats;
  };

  const statusStats = getStatusStats();

  // Helper to parse name, role, and company from filename
  function parseInterviewDetails(filename: string) {
    // Example: Interview_with_John_Doe__CEO_at_Acme_Corp-abc123.docx
    // or _Interview_with_Yusuf_Elmarakby__Paralegal_at_Bruce_Harvey_Law_Firm-xyz.docx
    const match = filename.match(/Interview_with[_ ]([\w]+)_([\w]+)__([\w ]+)_at_([\w _]+)-/i);
    if (match) {
      const firstName = match[1].replace(/_/g, ' ');
      const lastName = match[2].replace(/_/g, ' ');
      const role = match[3].replace(/_/g, ' ');
      const company = match[4].replace(/_/g, ' ');
      return {
        name: `${firstName} ${lastName}`.replace(/([A-Z])/g, ' $1').trim(),
        role,
        company
      };
    }
    // Fallback: try to extract at least role and company
    const fallback = filename.match(/__([\w ]+)_at_([\w _]+)-/i);
    if (fallback) {
      const role = fallback[1].replace(/_/g, ' ');
      const company = fallback[2].replace(/_/g, ' ');
      return {
        name: '',
        role,
        company
      };
    }
    return { name: '', role: '', company: '' };
  }

  // Helper to get analyzed interview IDs from localStorage
  function getAnalyzedInterviewIds(): string[] {
    if (typeof window === 'undefined') return [];
    const analyzed = localStorage.getItem('analyzedInterviewIds');
    if (!analyzed) return [];
    try {
      return JSON.parse(analyzed);
    } catch {
      return [];
    }
  }

  // Helper to set analyzed interview IDs in localStorage
  function setAnalyzedInterviewIds(ids: string[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('analyzedInterviewIds', JSON.stringify(ids));
  }

  // Also, add a useEffect to keep localStorage in sync if interviews change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('allUserInterviews', JSON.stringify(interviews));
    }
  }, [interviews]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('log in') || error.includes('401') || error.includes('Unauthorized');
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {isAuthError ? 'Authentication Required' : 'Error Loading Interviews'}
          </h2>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthError ? (
              <>
                <button 
                  onClick={() => window.location.href = '/auth-debug'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Log In
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Go to Home
                </button>
              </>
            ) : (
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Update Analyze Selected button to show summary
  const newToAnalyze = selectedInterviews.filter(id => !analyzedInterviewIds.includes(id)).length;
  const alreadyAnalyzed = selectedInterviews.length - newToAnalyze;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Interview Library</h1>
            <p className="text-gray-300 mt-2">
              Manage your customer interviews and create filtered analyses
            </p>
          </div>
          <div className="flex space-x-4">
            <button className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Interviews
            </button>
            <button 
              onClick={handleAnalyzeSelected}
              disabled={selectedInterviews.length === 0 || newToAnalyze === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {newToAnalyze > 0
                ? `Analyze Selected (${newToAnalyze} new${alreadyAnalyzed > 0 ? ", "+alreadyAnalyzed+" already analyzed" : ""})`
                : `All selected already analyzed`}
            </button>
          </div>
        </div>

        {/* Enhanced Stats Overview with Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Interviews</dt>
                    <dd className="text-lg font-medium text-gray-900">{interviews.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Valid</dt>
                    <dd className="text-lg font-medium text-gray-900">{statusStats.valid}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">No Quotes</dt>
                    <dd className="text-lg font-medium text-gray-900">{statusStats['no-quotes']}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Errors</dt>
                    <dd className="text-lg font-medium text-gray-900">{statusStats.error}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Quotes</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {interviews.reduce((sum, i) => sum + i.quotesExtracted, 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search interviews, roles, industries, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Status Filter */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Status</h4>
                    <div className="space-y-2">
                      {[
                        { value: 'valid', label: 'Valid', count: statusStats.valid },
                        { value: 'no-quotes', label: 'No Quotes', count: statusStats['no-quotes'] },
                        { value: 'error', label: 'Errors', count: statusStats.error },
                        { value: 'processing', label: 'Processing', count: statusStats.processing }
                      ].map(status => (
                        <label key={status.value} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onChange={(e) => handleFilterChange('status', status.value, e.target.checked)}
                            />
                            <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                          </div>
                          <span className="text-xs text-gray-500">({status.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Company Size Filter */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Company Size</h4>
                    <div className="space-y-2">
                      {['solo', 'small', 'medium', 'large', 'enterprise'].map(size => (
                        <label key={size} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={(e) => handleFilterChange('companySize', size, e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {getCompanySizeIcon(size)} {size}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Role</h4>
                    <div className="space-y-2">
                      {['Attorney', 'Paralegal', 'Legal Assistant', 'Manager', 'Partner'].map(role => (
                        <label key={role} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={(e) => handleFilterChange('roles', role, e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-700">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Industry Filter */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Industry</h4>
                    <div className="space-y-2">
                      {['Legal Services', 'Healthcare', 'Financial Services', 'Technology'].map(industry => (
                        <label key={industry} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={(e) => handleFilterChange('industries', industry, e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-700">{industry}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interview List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Interviews ({filteredInterviews.length})
            </h3>
            
            {filteredInterviews.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {interviews.length === 0 
                    ? "Get started by uploading your first interview transcript."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {interviews.length === 0 && (
                  <div className="mt-6">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Interview
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInterviews.map((interview) => {
                  const details = parseInterviewDetails(interview.filename);
                  const isAnalyzed = analyzedInterviewIds.includes(interview.id);
                  return (
                    <div key={interview.id} className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 ${isAnalyzed ? 'bg-green-50/40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedInterviews.includes(interview.id)}
                            onChange={(e) => handleInterviewSelect(interview.id, e.target.checked)}
                            disabled={isAnalyzed} // Optionally disable if already analyzed
                          />
                          <div className="flex-1 min-w-0">
                            {/* Main display: Name, Role, Company */}
                            <div className="flex items-center space-x-3 mb-1">
                              <h4 className="text-base font-semibold text-gray-900 truncate" title={interview.filename}>
                                {details.name || 'Unknown Name'}
                                {details.role && (
                                  <span className="ml-2 text-sm text-gray-500 font-normal">{details.role}</span>
                                )}
                                {details.company && (
                                  <span className="ml-2 text-sm text-gray-500 font-normal">@ {details.company}</span>
                                )}
                              </h4>
                              {getStatusBadge(interview)}
                              {isAnalyzed && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800 border border-green-300">Analyzed</span>
                              )}
                            </div>
                            {/* Secondary: filename as subtext */}
                            <div className="text-xs text-gray-400 truncate" title={interview.filename}>{interview.filename}</div>
                            {/* Details row */}
                            <div className="flex items-center space-x-6 text-sm text-gray-500 mt-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{interview.uploadDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Briefcase className="w-4 h-4" />
                                <span>{interview.role || details.role || 'Unknown Role'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Building className="w-4 h-4" />
                                <span className="capitalize">{getCompanySizeIcon(interview.companySize)} {interview.companySize || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="w-4 h-4" />
                                <span>{interview.quotesExtracted} quotes</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{interview.processingTime}s</span>
                              </div>
                            </div>
                            {interview.tags && interview.tags.length > 0 && (
                              <div className="flex items-center space-x-2 mt-2">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <div className="flex space-x-1">
                                  {interview.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {interview.vectorsStored} vectors
                          </span>
                          <button
                            onClick={() => handleDeleteInterview(interview.id)}
                            disabled={deletingInterview === interview.id}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete interview"
                          >
                            {deletingInterview === interview.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 