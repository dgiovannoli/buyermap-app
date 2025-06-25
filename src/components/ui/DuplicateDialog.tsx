import React from 'react';

interface DuplicateDialogProps {
  data: {
    hasExactDuplicate?: boolean;
    hasSimilarDuplicate?: boolean;
    exactDuplicate?: any;
    similarDuplicate?: any;
    contentHash: string;
    similarityScore?: number;
  };
  onUseExisting: () => void;
  onProcessAnyway: () => void;
  onCancel: () => void;
}

export default function DuplicateDialog({ 
  data, 
  onUseExisting, 
  onProcessAnyway, 
  onCancel 
}: DuplicateDialogProps) {
  const isDuplicate = data.hasExactDuplicate || data.hasSimilarDuplicate;
  const duplicateType = data.hasExactDuplicate ? 'exact' : 'similar';
  const duplicateFile = data.exactDuplicate || data.similarDuplicate;

  if (!isDuplicate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-orange-600 text-xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {duplicateType === 'exact' ? 'Exact Duplicate Detected' : 'Similar Content Detected'}
              </h3>
              <p className="text-sm text-gray-600">
                {duplicateType === 'exact' 
                  ? 'This file has already been processed'
                  : `This file appears very similar to existing content`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Existing File Info */}
          {duplicateFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                <span>Existing File</span>
                {duplicateType === 'similar' && data.similarityScore && (
                  <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {(data.similarityScore * 100).toFixed(1)}% similar
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-800">{duplicateFile.filename || duplicateFile.fileName}</p>
                    {duplicateFile.uploadDate && (
                      <p className="text-sm text-gray-600">
                        Processed on {new Date(duplicateFile.uploadDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hash Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Content Hash: <code className="font-mono text-xs">{data.contentHash}</code>
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              {duplicateType === 'exact' 
                ? 'The content of this file is identical to a previously processed file. You can use the existing results to save time and resources.'
                : 'The content appears very similar to an existing file. Processing similar content may not provide additional insights.'
              }
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
          <button
            onClick={onUseExisting}
            className="w-full p-4 text-left rounded-lg border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Use Existing Results</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Skip processing and use the results from the previously processed file
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">Recommended • Saves time</p>
              </div>
            </div>
          </button>

          <button
            onClick={onProcessAnyway}
            className="w-full p-4 text-left rounded-lg border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <span className="text-orange-600 font-bold text-sm">⚡</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Process Anyway</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {duplicateType === 'exact' 
                    ? 'Re-process this file despite it being identical'
                    : 'Continue processing this file to capture any unique insights'
                  }
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  {duplicateType === 'exact' ? 'May create duplicate data' : 'Recommended for similar content'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
} 