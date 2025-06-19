'use client';

import React from 'react';

interface UploadComponentProps {
  onComplete: () => void;
}

const UploadComponent: React.FC<UploadComponentProps> = ({ onComplete }) => {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Materials</h2>
          <p className="text-gray-600">We'll validate your ICP assumptions against interview data</p>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-400 mx-auto mb-4 rounded"></div>
            <h3 className="text-lg font-semibold mb-2">Sales Deck / Pitch Materials</h3>
            <p className="text-gray-500 mb-4">Upload your current sales presentation</p>
            
            <button
              onClick={onComplete}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
            >
              Skip Upload (Demo Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadComponent; 