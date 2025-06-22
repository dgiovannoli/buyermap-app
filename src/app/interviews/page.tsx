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
  MessageSquare
} from 'lucide-react';
import { StoredInterview, InterviewFilterCriteria } from '../../types/buyermap';
import { getUserInterviewsClient } from '../../lib/database';

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

  // Load user's interviews from database
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoading(true);
        const userInterviews = await getUserInterviewsClient();
        
        // Convert database format to StoredInterview format
        const convertedInterviews: StoredInterview[] = userInterviews.map(interview => ({
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
          tags: interview.tags || []
        }));
        
        setInterviews(convertedInterviews);
        setError(null);
      } catch (error) {
        console.error('Failed to load interviews:', error);
        setError('Failed to load interviews. Please try again.');
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadInterviews();
  }, []);

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

  const handleAnalyzeSelected = () => {
    // This will trigger the analysis with selected interviews
    console.log('Analyzing selected interviews:', selectedInterviews);
    // Navigate to analysis page with filter criteria
  };

  const getStatusBadge = (status: StoredInterview['status']) => {
    const colors = {
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Interviews</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
              disabled={selectedInterviews.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyze Selected ({selectedInterviews.length})
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unique Speakers</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(interviews.flatMap(i => i.uniqueSpeakers)).size}
                    </dd>
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

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Processing Time</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Math.round(interviews.reduce((sum, i) => sum + i.processingTime, 0) / 60)}m
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                {filteredInterviews.map((interview) => (
                  <div key={interview.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedInterviews.includes(interview.id)}
                          onChange={(e) => handleInterviewSelect(interview.id, e.target.checked)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {interview.filename}
                            </h4>
                            {getStatusBadge(interview.status)}
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{interview.uploadDate.toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Briefcase className="w-4 h-4" />
                              <span>{interview.role || 'Unknown Role'}</span>
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 