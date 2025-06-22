'use client';

import React from 'react';
import ConfidenceBreakdown from '../../components/ConfidenceBreakdown';
import ValidationCard from '../../components/ValidationCard';
import { generateConfidenceBreakdown } from '../../utils/confidenceHelpers';
import { ValidationDataObject } from '../../types/buyermap';

export default function ConfidenceDemo() {
  // Your specific case: Gap identified with 85% confidence
  const gapAnalysisBreakdown = generateConfidenceBreakdown(
    'Gap Identified',
    5, // 5 quotes supporting the gap finding
    6, // 6 interviews conducted  
    85, // 85% deck extraction accuracy
    true // Has real interview data
  );

  // Deck-only analysis (before interviews)
  const deckOnlyBreakdown = generateConfidenceBreakdown(
    'Gap Identified',
    0, // No interview quotes yet
    0, // No interviews yet
    85, // 85% deck extraction accuracy  
    false // No interview data
  );

  // Create sample validation cards to show the integration
  const enhancedCard: ValidationDataObject = {
    id: 1,
    icpAttribute: 'Buyer Titles',
    icpTheme: 'buyer-titles',
    assumption: 'Target buyers include criminal defense attorneys, forensic psychologists, and legal professionals in leadership roles such as VP of Sales and Customer Success.',
    reality: '**Deck Gap Identified**: Your deck targets criminal defense attorneys and forensic psychologists, but interviews reveal the actual buyers are legal assistants and paralegals who act as \'one-person shops\' handling diverse responsibilities. These support staff roles are completely missing from your current targeting.',
    outcome: 'Gap Identified',
    confidence: 88, // Overall confidence from breakdown
    confidence_explanation: '90% confident in the gap analysis based on 5 contradictory quotes from 6 interviews. Deck extraction confidence: 85%.',
    confidenceBreakdown: gapAnalysisBreakdown, // Enhanced breakdown
    quotes: [
      {
        text: 'I handle most of the transcription work for our firm. The attorneys are too busy with cases to deal with the technical stuff.',
        author: 'Betty Behrens',
        role: 'Paralegal'
      },
      {
        text: 'As a legal assistant, I\'m the one who evaluates and recommends new tools. I research everything before presenting options to the partners.',
        author: 'Sarah Martinez',
        role: 'Legal Assistant'
      },
      {
        text: 'The attorneys might be the decision makers on paper, but I\'m the one doing all the legwork and initial evaluation of solutions.',
        author: 'Jennifer Wong',
        role: 'Paralegal'
      },
      {
        text: 'I wear many hats - paralegal, IT support, vendor evaluation. In small firms like ours, support staff handle everything.',
        author: 'Maria Rodriguez',
        role: 'Legal Assistant'
      },
      {
        text: 'The partners trust my judgment on operational tools. I present the business case and they usually approve what I recommend.',
        author: 'Lisa Thompson',
        role: 'Paralegal'
      }
    ],
    comparisonOutcome: 'Gap Identified',
    confidenceScore: 88,
    confidenceExplanation: '90% confident in the gap analysis based on 5 contradictory quotes from 6 interviews. Deck extraction confidence: 85%.',
    waysToAdjustMessaging: 'Shift primary messaging to target legal assistants and paralegals as key influencers and evaluators. Emphasize how the solution empowers support staff to be more efficient and strategic in their roles.'
  };

  const oldStyleCard: ValidationDataObject = {
    id: 2,
    icpAttribute: 'Buyer Titles',
    icpTheme: 'buyer-titles',
    assumption: 'Target buyers include criminal defense attorneys, forensic psychologists, and legal professionals in leadership roles.',
    reality: 'Deck analysis shows explicit references to roles such as \'Criminal Defense Attorney\' and \'Forensic Psychologist\' in testimonials indicate specific job titles.',
    outcome: 'Gap Identified',
    confidence: 85,
    confidence_explanation: 'Explicit references to roles such as \'Criminal Defense Attorney\' and \'Forensic Psychologist\' in testimonials indicate specific job titles.',
    // No confidenceBreakdown - will show old style
    quotes: [],
    comparisonOutcome: 'Gap Identified',
    confidenceScore: 85,
    confidenceExplanation: 'Explicit references to roles such as \'Criminal Defense Attorney\' and \'Forensic Psychologist\' in testimonials indicate specific job titles.',
    waysToAdjustMessaging: 'Review deck assumptions for accuracy.'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Confidence Analysis Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            This addresses the confusion where two 85% confidence scores seemed contradictory.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-2">The Problem You Identified:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <strong>Gap Analysis:</strong> 85% confidence that deck targets wrong personas</li>
              <li>• <strong>Deck Analysis:</strong> 85% confidence in extracting assumptions from deck</li>
              <li>• <strong>User Confusion:</strong> These seemed contradictory but were measuring different things</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Analysis (After Interviews) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ✅ Enhanced Analysis (After Interviews)
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Key Finding</h3>
                <p className="text-sm text-gray-600">
                  <strong>Gap Identified:</strong> Your deck targets criminal defense attorneys and forensic psychologists, 
                  but interviews reveal the actual buyers are legal assistants and paralegals who act as 'one-person shops' 
                  handling diverse responsibilities.
                </p>
              </div>
              
              <ConfidenceBreakdown 
                breakdown={gapAnalysisBreakdown}
                comparisonOutcome="Gap Identified"
              />
            </div>
          </div>

          {/* Deck-Only Analysis (Before Interviews) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⚠️ Deck-Only Analysis (Before Interviews)
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Deck Assumption</h3>
                <p className="text-sm text-gray-600">
                  Explicit references to roles such as 'Criminal Defense Attorney' and 'Forensic Psychologist' 
                  in testimonials indicate specific job titles.
                </p>
              </div>
              
              <ConfidenceBreakdown 
                breakdown={deckOnlyBreakdown}
                comparisonOutcome="Gap Identified"
              />
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-3">🎯 How This Solves the Confusion:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Gap Analysis Confidence</h4>
              <p>How confident we are that there's actually a mismatch between your deck and reality</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Quality Confidence</h4>
              <p>How accurately we extracted assumptions from your deck content</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sample Size Confidence</h4>
              <p>Statistical validity based on number of interviews and supporting quotes</p>
            </div>
          </div>
        </div>

        {/* Full Buyer Map Cards Comparison */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🎯 Integration in Buyer Map Cards
          </h2>
          <p className="text-gray-600 mb-4">
            Here's how the enhanced confidence analysis appears in your actual buyer map cards:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-700">
              💡 <strong>Note:</strong> These cards are expanded by default to showcase the new confidence breakdown. 
              In the actual app, users click the chevron button to expand/collapse cards and see the detailed analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Card */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ✅ Enhanced Card (With Interview Data)
              </h3>
                             <ValidationCard 
                 data={enhancedCard}
                 initialExpanded={true}
               />
             </div>

             {/* Old Style Card */}
             <div>
               <h3 className="text-lg font-medium text-gray-900 mb-4">
                 ⚠️ Old Style Card (Deck Only)
               </h3>
               <ValidationCard 
                 data={oldStyleCard}
                 initialExpanded={true}
               />
            </div>
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2">🔍 Key Differences:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>Enhanced card</strong> shows three distinct confidence dimensions instead of one confusing score</li>
              <li>• <strong>Old card</strong> shows single 85% that could be misinterpreted</li>
              <li>• <strong>Enhanced card</strong> includes actionable recommendations for improving each dimension</li>
              <li>• <strong>Enhanced card</strong> has rich interview quotes supporting the analysis</li>
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-800 mb-3">💡 Recommendations to Improve Confidence:</h3>
          <ul className="text-sm text-green-700 space-y-2">
            <li>• <strong>For Gap Analysis:</strong> Conduct 3-5 more interviews to reach 90%+ confidence</li>
            <li>• <strong>For Data Quality:</strong> Review deck extraction and provide feedback on accuracy</li>
            <li>• <strong>For Sample Size:</strong> Target 10+ interviews for maximum statistical confidence</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 