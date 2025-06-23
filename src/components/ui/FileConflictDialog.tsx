'use client';

import React from 'react';
import { X, FileText, Clock, HardDrive } from 'lucide-react';

export interface FileConflictDialogProps {
  isOpen: boolean;
  fileName: string;
  existingFileInfo?: {
    size?: string;
    uploadedAt?: string;
    url: string;
  };
  onResolve: (action: 'use-existing' | 'overwrite' | 'rename') => void;
  onCancel: () => void;
}

export default function FileConflictDialog({
  isOpen,
  fileName,
  existingFileInfo,
  onResolve,
  onCancel
}: FileConflictDialogProps) {
  if (!isOpen) return null;

  const suggestedName = fileName.replace(/(\.[^.]+)$/, ` (2)$1`);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">File Already Exists</h3>
                <p className="text-sm text-gray-600">Choose how to handle this conflict</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-amber-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* File Info */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 truncate">{fileName}</p>
              {existingFileInfo && (
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  {existingFileInfo.size && (
                    <span className="flex items-center space-x-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{existingFileInfo.size}</span>
                    </span>
                  )}
                  {existingFileInfo.uploadedAt && (
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{existingFileInfo.uploadedAt}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Use Existing */}
          <button
            onClick={() => onResolve('use-existing')}
            className="w-full p-4 text-left rounded-lg border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Use existing file</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Skip upload and continue with the current version
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">Recommended • Saves time</p>
              </div>
            </div>
          </button>

          {/* Overwrite */}
          <button
            onClick={() => onResolve('overwrite')}
            className="w-full p-4 text-left rounded-lg border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <span className="text-orange-600 font-bold text-sm">⟲</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Replace with new version</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Upload your file and overwrite the existing one
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">Will replace current file</p>
              </div>
            </div>
          </button>

          {/* Rename */}
          <button
            onClick={() => onResolve('rename')}
            className="w-full p-4 text-left rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <span className="text-blue-600 font-bold text-sm">+</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Save as "{suggestedName}"</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Keep both versions with a unique filename
                </p>
                <p className="text-xs text-blue-600 mt-1 font-medium">Keeps both files</p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel upload
          </button>
        </div>
      </div>
    </div>
  );
} 