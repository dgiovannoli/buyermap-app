'use client';

import React from 'react';
import { BarChart, Users, TrendingUp, ArrowRight, Brain, Target, Zap } from 'lucide-react';

interface BuyerResult {
  id?: string;
  buyerScore: number;
  confidence: number;
  outcome: string;
}

interface ResultsStepProps {
  results: BuyerResult[];
  onExport: () => void;
  onBack: () => void;
}

export default function ResultsStep({ results, onExport, onBack }: ResultsStepProps) {
  const totalRecords = results.length;
  const highProbabilityBuyers = results.filter((r: BuyerResult) => r.buyerScore >= 70).length;
  const mediumProbabilityBuyers = results.filter((r: BuyerResult) => r.buyerScore >= 40 && r.buyerScore < 70).length;
  const lowProbabilityBuyers = results.filter((r: BuyerResult) => r.buyerScore < 40).length;
  const averageScore = results.reduce((sum: number, r: BuyerResult) => sum + r.buyerScore, 0) / totalRecords;
  const averageConfidence = results.reduce((sum: number, r: BuyerResult) => sum + r.confidence, 0) / totalRecords;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getOutcomeColor = (outcome: string) => {
    return outcome === 'likely_buyer' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <BarChart className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
          </div>
          <div className="text-sm text-gray-500">
            Step 4 of 5
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Total Records</h3>
            <p className="text-sm text-gray-600">Analyzed profiles</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{highProbabilityBuyers}</span>
            </div>
            <h3 className="font-semibold text-gray-900">High Probability</h3>
            <p className="text-sm text-gray-600">Score ≥ 70</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">{averageScore.toFixed(1)}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Average Score</h3>
            <p className="text-sm text-gray-600">Buyer propensity</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Brain className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold text-indigo-600">{averageConfidence.toFixed(1)}%</span>
            </div>
            <h3 className="font-semibold text-gray-900">Avg Confidence</h3>
            <p className="text-sm text-gray-600">Model certainty</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Score Distribution</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span className="font-medium text-gray-900">High Probability (70-100)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-green-600 mr-2">{highProbabilityBuyers}</span>
                  <span className="text-sm text-gray-500">({((highProbabilityBuyers / totalRecords) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full" 
                  style={{ width: `${(highProbabilityBuyers / totalRecords) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                  <span className="font-medium text-gray-900">Medium Probability (40-69)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-yellow-600 mr-2">{mediumProbabilityBuyers}</span>
                  <span className="text-sm text-gray-500">({((mediumProbabilityBuyers / totalRecords) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full" 
                  style={{ width: `${(mediumProbabilityBuyers / totalRecords) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                  <span className="font-medium text-gray-900">Low Probability (0-39)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-red-600 mr-2">{lowProbabilityBuyers}</span>
                  <span className="text-sm text-gray-500">({((lowProbabilityBuyers / totalRecords) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full" 
                  style={{ width: `${(lowProbabilityBuyers / totalRecords) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Key Insights</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Zap className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">Top Opportunity</span>
                </div>
                <p className="text-sm text-green-700">
                  {highProbabilityBuyers} high-probability prospects identified for immediate outreach
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-800">Focus Area</span>
                </div>
                <p className="text-sm text-blue-700">
                  Medium probability segment shows potential for nurturing campaigns
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-semibold text-purple-800">Model Performance</span>
                </div>
                <p className="text-sm text-purple-700">
                  {averageConfidence.toFixed(0)}% average confidence indicates reliable predictions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sample Results</h2>
            <span className="text-sm text-gray-500">Showing first 10 records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Buyer Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Confidence</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Outcome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Segment</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 10).map((result: BuyerResult, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {result.id || `Record ${index + 1}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(result.buyerScore)}`}>
                        {result.buyerScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {result.confidence.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(result.outcome)}`}>
                        {result.outcome === 'likely_buyer' ? 'Likely Buyer' : 'Unlikely Buyer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {result.buyerScore >= 70 ? 'High Value' : result.buyerScore >= 40 ? 'Medium Value' : 'Low Value'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBack}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Configuration
          </button>
          
          <button
            onClick={onExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            Export Results
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}