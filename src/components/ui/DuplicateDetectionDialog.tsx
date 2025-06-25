import { ContentRecord } from '../../utils/deduplication';

interface DuplicateDetectionDialogProps {
  isOpen: boolean;
  fileName: string;
  duplicateType: 'exact' | 'similar';
  existingFile: ContentRecord;
  similarityScore?: number;
  onResolve: (action: 'use-existing' | 'process-anyway' | 'cancel') => void;
}

export default function DuplicateDetectionDialog({
  isOpen,
  fileName,
  duplicateType,
  existingFile,
  similarityScore,
  onResolve
}: DuplicateDetectionDialogProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
          {/* Current File */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Current Upload</h4>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-blue-800">{fileName}</p>
                <p className="text-sm text-blue-600">New file</p>
              </div>
            </div>
          </div>

          {/* Existing File */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center justify-between">
              <span>Existing File</span>
              {duplicateType === 'similar' && similarityScore && (
                <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  {(similarityScore * 100).toFixed(1)}% similar
                </span>
              )}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-gray-800">{existingFile.filename}</p>
                  <p className="text-sm text-gray-600">
                    Processed on {formatDate(existingFile.uploadDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(existingFile.fileSize)} • {existingFile.contentType}
                  </p>
                </div>
              </div>
            </div>
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
          {duplicateType === 'exact' ? (
            <>
              {/* Exact duplicate options */}
              <button
                onClick={() => onResolve('use-existing')}
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
                onClick={() => onResolve('process-anyway')}
                className="w-full p-4 text-left rounded-lg border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <span className="text-orange-600 font-bold text-sm">⚡</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Process Anyway</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Re-process this file despite it being identical
                    </p>
                    <p className="text-xs text-orange-600 mt-1 font-medium">May create duplicate data</p>
                  </div>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Similar content options */}
              <button
                onClick={() => onResolve('use-existing')}
                className="w-full p-4 text-left rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 font-bold text-sm">♻️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Use Similar Results</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Use results from the similar file instead of processing
                    </p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">Saves resources</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onResolve('process-anyway')}
                className="w-full p-4 text-left rounded-lg border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <span className="text-green-600 font-bold text-sm">▶️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Process New File</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Continue processing this file to capture any unique insights
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-medium">Recommended for similar content</p>
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <button
            onClick={() => onResolve('cancel')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel upload
          </button>
        </div>
      </div>
    </div>
  );
} 