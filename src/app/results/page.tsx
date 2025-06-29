'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Download, Upload, Library, ChevronDown, ChevronUp } from 'lucide-react';
import ModernBuyerMapLanding from '../../components/modern-buyermap-landing';
import { BuyerMapData } from '../../types/buyermap';
import sampleBuyerMapData from '../../mocks/sampleBuyerMapData.json';

// Helper to parse name, role, and company from filename
function parseInterviewDetails(filename: string) {
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

export default function ResultsPage() {
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[] | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contributingInterviews, setContributingInterviews] = useState<any[]>([]);
  const [showInterviewSummary, setShowInterviewSummary] = useState(false);

  // Load from localStorage first for fast UX
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const buyerMapData = localStorage.getItem('buyerMapData');
      const interviewData = localStorage.getItem('interviewData');
      
      // Check if we have any real data
      const hasRealData = (buyerMapData && buyerMapData !== '[]') || 
                         (interviewData && interviewData !== '[]');
      
      if (hasRealData) {
        // Use real data from localStorage
        if (buyerMapData && buyerMapData !== '[]') {
          setBuyerMapData(JSON.parse(buyerMapData));
        } else if (interviewData && interviewData !== '[]') {
          setBuyerMapData(JSON.parse(interviewData));
        }
        setIsDemoData(false);
      } else {
        // Use demo data when no real data exists
        setBuyerMapData(sampleBuyerMapData as unknown as BuyerMapData[]);
        setIsDemoData(true);
      }
      setChecked(true);
    }
  }, []);

  // Load contributing interviews from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const analyzed = localStorage.getItem('analyzedInterviewIds');
      const allInterviews = localStorage.getItem('allUserInterviews'); // Optionally store all interview metadata
      let interviewList: any[] = [];
      if (analyzed && allInterviews) {
        try {
          const analyzedIds = JSON.parse(analyzed);
          const all = JSON.parse(allInterviews);
          interviewList = all.filter((i: any) => analyzedIds.includes(i.id));
        } catch {}
      } else if (analyzed) {
        // Fallback: try to get interview metadata from interviewData
        const analyzedIds = JSON.parse(analyzed);
        const interviewData = localStorage.getItem('interviewData');
        if (interviewData) {
          try {
            const all = JSON.parse(interviewData);
            interviewList = all.filter((i: any) => analyzedIds.includes(i.id));
          } catch {}
        }
      }
      setContributingInterviews(interviewList);
    }
  }, []);

  // In the background, fetch latest results from backend
  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch('/api/user-results');
        if (res.ok) {
          const payload = await res.json();
          if (payload.success && payload.results && Array.isArray(payload.results) && payload.results.length > 0) {
            setBuyerMapData(payload.results);
            setIsDemoData(false);
            // Optionally update localStorage for future fast loads
            if (typeof window !== 'undefined') {
              localStorage.setItem('buyerMapData', JSON.stringify(payload.results));
            }
          } else {
            // Only show demo data if we don't have any real data from localStorage
            const buyerMapData = localStorage.getItem('buyerMapData');
            const interviewData = localStorage.getItem('interviewData');
            const hasRealData = (buyerMapData && buyerMapData !== '[]') || 
                               (interviewData && interviewData !== '[]');
            
            if (!hasRealData) {
              setBuyerMapData(sampleBuyerMapData as unknown as BuyerMapData[]);
              setIsDemoData(true);
            } else {
              // Use existing real data from localStorage
              if (buyerMapData && buyerMapData !== '[]') {
                setBuyerMapData(JSON.parse(buyerMapData));
              } else if (interviewData && interviewData !== '[]') {
                setBuyerMapData(JSON.parse(interviewData));
              }
              setIsDemoData(false);
            }
          }
        }
      } catch (err) {
        // On error, check if we have real data in localStorage before falling back to demo
        const buyerMapData = localStorage.getItem('buyerMapData');
        const interviewData = localStorage.getItem('interviewData');
        const hasRealData = (buyerMapData && buyerMapData !== '[]') || 
                           (interviewData && interviewData !== '[]');
        
        if (!hasRealData) {
          setBuyerMapData(sampleBuyerMapData as unknown as BuyerMapData[]);
          setIsDemoData(true);
        } else {
          // Use existing real data from localStorage
          if (buyerMapData && buyerMapData !== '[]') {
            setBuyerMapData(JSON.parse(buyerMapData));
          } else if (interviewData && interviewData !== '[]') {
            setBuyerMapData(JSON.parse(interviewData));
          }
          setIsDemoData(false);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  if (!checked || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your results...</p>
        </div>
      </div>
    );
  }

  // Always show the buyer cards structure with demo data as fallback
  return (
    <div className="relative">
      {/* Collapsible Contributing Interviews Summary */}
      {contributingInterviews.length > 0 && (
        <div className="max-w-4xl mx-auto mt-8 mb-4 bg-white/10 border border-white/20 rounded-xl p-4 shadow text-white">
          <button
            className="flex items-center font-semibold text-lg focus:outline-none hover:underline"
            onClick={() => setShowInterviewSummary((v) => !v)}
            aria-expanded={showInterviewSummary}
          >
            Analysis based on {contributingInterviews.length} interview{contributingInterviews.length > 1 ? 's' : ''}
            {showInterviewSummary ? (
              <ChevronUp className="ml-2 w-5 h-5" />
            ) : (
              <ChevronDown className="ml-2 w-5 h-5" />
            )}
          </button>
          {showInterviewSummary && (
            <div className="mt-3 space-y-2">
              {contributingInterviews.map((interview, idx) => {
                const details = parseInterviewDetails(interview.filename);
                return (
                  <div key={interview.id || idx} className="flex flex-col text-sm text-blue-100 bg-blue-900/40 rounded px-3 py-1">
                    <span className="font-medium text-white">{details.name || 'Unknown Name'}</span>
                    <span className="text-blue-200">{details.role && `(${details.role})`} {details.company && `@ ${details.company}`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {isDemoData && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-yellow-500/90 backdrop-blur-sm text-yellow-900 px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            🎯 Demo Data
          </div>
        </div>
      )}
      <ModernBuyerMapLanding 
        buyerMapData={buyerMapData || (sampleBuyerMapData as unknown as BuyerMapData[])} 
        overallScore={0} 
        currentStep={3} 
        setCurrentStep={() => {}} 
      />
    </div>
  );
} 