'use client';

import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  X, 
  Calendar, 
  Users, 
  Building, 
  Briefcase, 
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StoredInterview, InterviewFilterCriteria } from '../types/buyermap';

interface DynamicFilterPanelProps {
  interviews: StoredInterview[];
  selectedFilters: InterviewFilterCriteria;
  onFilterChange: (filters: InterviewFilterCriteria) => void;
  showSelectedCount?: boolean;
  compact?: boolean;
}

export default function DynamicFilterPanel({
  interviews,
  selectedFilters,
  onFilterChange,
  showSelectedCount = true,
  compact = false
}: DynamicFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  // Extract unique values for filter options
  const filterOptions = React.useMemo(() => {
    const companySizes: string[] = [];
    const roles: string[] = [];
    const industries: string[] = [];
    const regions: string[] = [];
    const allTags: string[] = [];
    
    interviews.forEach(interview => {
      if (interview.companySize) companySizes.push(interview.companySize);
      if (interview.role) roles.push(interview.role);
      if (interview.industry) industries.push(interview.industry);
      if (interview.region) regions.push(interview.region);
      if (interview.tags) allTags.push(...interview.tags);
    });
    
    return {
      companySizes: [...new Set(companySizes)].sort(),
      roles: [...new Set(roles)].sort(),
      industries: [...new Set(industries)].sort(),
      regions: [...new Set(regions)].sort(),
      tags: [...new Set(allTags)].sort()
    };
  }, [interviews]);

  // Count filtered interviews
  const filteredCount = React.useMemo(() => {
    return interviews.filter(interview => {
      // Company size filter
      if (selectedFilters.companySize?.length && 
          !selectedFilters.companySize.includes(interview.companySize || '')) {
        return false;
      }
      
      // Role filter
      if (selectedFilters.roles?.length && 
          !selectedFilters.roles.some(role => 
            interview.role?.toLowerCase().includes(role.toLowerCase()))) {
        return false;
      }
      
      // Industry filter
      if (selectedFilters.industries?.length && 
          !selectedFilters.industries.includes(interview.industry || '')) {
        return false;
      }
      
      // Region filter
      if (selectedFilters.regions?.length && 
          !selectedFilters.regions.includes(interview.region || '')) {
        return false;
      }
      
      // Tags filter
      if (selectedFilters.tags?.length && 
          !selectedFilters.tags.some(tag => 
            interview.tags?.includes(tag))) {
        return false;
      }
      
      return true;
    }).length;
  }, [interviews, selectedFilters]);

  const handleFilterToggle = (
    filterType: keyof InterviewFilterCriteria,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (selectedFilters[filterType] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    onFilterChange({
      ...selectedFilters,
      [filterType]: newValues.length > 0 ? newValues : undefined
    });
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(selectedFilters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter
  );

  const getCompanySizeIcon = (size: string) => {
    switch (size) {
      case 'solo': return '👤';
      case 'small': return '👥';
      case 'medium': return '🏢';
      case 'large': return '🏬';
      case 'enterprise': return '🏭';
      default: return '❓';
    }
  };

  if (compact && !isExpanded) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Filters {hasActiveFilters && `(${filteredCount}/${interviews.length})`}
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.values(selectedFilters).flat().length} active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Filter Interviews
            </h3>
            {showSelectedCount && (
              <span className="text-sm text-gray-500">
                ({filteredCount} of {interviews.length} selected)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </button>
            )}
            {compact && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Company Size Filter */}
          {filterOptions.companySizes.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Building className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900">Company Size</h4>
              </div>
              <div className="space-y-2">
                {filterOptions.companySizes.map(size => (
                  <label key={size} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedFilters.companySize?.includes(size) || false}
                      onChange={(e) => handleFilterToggle('companySize', size, e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {getCompanySizeIcon(size)} {size}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Role Filter */}
          {filterOptions.roles.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900">Roles</h4>
              </div>
              <div className="space-y-2">
                {filterOptions.roles.map(role => (
                  <label key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedFilters.roles?.includes(role) || false}
                      onChange={(e) => handleFilterToggle('roles', role, e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Industry Filter */}
          {filterOptions.industries.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900">Industry</h4>
              </div>
              <div className="space-y-2">
                {filterOptions.industries.map(industry => (
                  <label key={industry} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedFilters.industries?.includes(industry) || false}
                      onChange={(e) => handleFilterToggle('industries', industry, e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700">{industry}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional filters row */}
        {(filterOptions.regions.length > 0 || filterOptions.tags.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
            {/* Region Filter */}
            {filterOptions.regions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-900">Region</h4>
                </div>
                <div className="space-y-2">
                  {filterOptions.regions.map(region => (
                    <label key={region} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedFilters.regions?.includes(region) || false}
                        onChange={(e) => handleFilterToggle('regions', region, e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-gray-700">{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Filter */}
            {filterOptions.tags.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-900">Tags</h4>
                </div>
                <div className="space-y-2">
                  {filterOptions.tags.slice(0, 8).map(tag => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedFilters.tags?.includes(tag) || false}
                        onChange={(e) => handleFilterToggle('tags', tag, e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-gray-700">{tag}</span>
                    </label>
                  ))}
                  {filterOptions.tags.length > 8 && (
                    <span className="text-xs text-gray-500">
                      +{filterOptions.tags.length - 8} more tags available
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 