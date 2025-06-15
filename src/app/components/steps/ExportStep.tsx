'use client';

import React, { useState } from 'react';
import { Download, FileText, BarChart, Mail, CheckCircle2 } from 'lucide-react';

interface ExportStepProps {
  results: unknown[];
  onBack: () => void;
  onComplete: () => void;
}

export default function ExportStep({ results, onBack, onComplete }: ExportStepProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['csv']);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const exportFormats = [
    { id: 'csv', name: 'CSV File', icon: FileText, description: 'Comma-separated values for spreadsheet apps' },
    { id: 'excel', name: 'Excel Workbook', icon: BarChart, description: 'Multi-sheet Excel file with charts' },
    { id: 'pdf', name: 'PDF Report', icon: FileText, description: 'Professional report with visualizations' },
    { id: 'email', name: 'Email Summary', icon: Mail, description: 'Send summary to your team' }
  ];

  const handleFormatToggle = (formatId: string) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsExporting(false);
    setExportComplete(true);
    
    // Auto-complete after showing success
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (exportComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Complete!</h2>
          <p className="text-gray-600 mb-6">
            Your buyer analysis results have been successfully exported and are ready for download.
          </p>
          <div className="space-y-3">
            {selectedFormats.map(format => {
              const formatInfo = exportFormats.find(f => f.id === format);
              return (
                <div key={format} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {formatInfo && <formatInfo.icon className="h-5 w-5 text-gray-600 mr-3" />}
                    <span className="font-medium text-gray-900">{formatInfo?.name}</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Export Results</h1>
          </div>
          <div className="text-sm text-gray-500">
            Step 5 of 5
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Export Options */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Export Formats</h2>
              <p className="text-gray-600 mb-6">Choose how you would like to export your buyer analysis results</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormats.includes(format.id);
                  
                  return (
                    <div
                      key={format.id}
                      onClick={() => handleFormatToggle(format.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg mr-3 ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{format.name}</h3>
                          <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Export Options</h2>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeInsights}
                    onChange={(e) => setIncludeInsights(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">Include AI insights and recommendations</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">Include confidence scores</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">Include segmentation data</span>
                </label>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Export Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Records analyzed:</span>
                  <span className="font-semibold">{results.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Export formats:</span>
                  <span className="font-semibold">{selectedFormats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File size (est.):</span>
                  <span className="font-semibold">~2.4 MB</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">What you will get:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Buyer propensity scores (0-100)</li>
                  <li>• Confidence ratings</li>
                  <li>• Segment classifications</li>
                  <li>• Key insights and patterns</li>
                  <li>• Recommended actions</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  disabled={selectedFormats.length === 0 || isExporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  {isExporting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Exporting...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </div>
                  )}
                </button>
                
                <button
                  onClick={onBack}
                  className="w-full text-gray-600 hover:text-gray-800 py-2 px-4 rounded-lg transition-colors"
                >
                  Back to Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}