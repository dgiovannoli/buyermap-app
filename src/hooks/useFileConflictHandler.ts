import { useState, useCallback } from 'react';
import { head } from '@vercel/blob';

export interface FileConflictInfo {
  fileName: string;
  existingUrl: string;
  existingFileInfo?: {
    size?: string;
    uploadedAt?: string;
    url: string;
  };
}

export interface FileConflictResolution {
  action: 'use-existing' | 'overwrite' | 'rename';
  fileName: string;
  url?: string;
}

export function useFileConflictHandler() {
  const [conflicts, setConflicts] = useState<FileConflictInfo[]>([]);
  const [currentConflict, setCurrentConflict] = useState<FileConflictInfo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if a file already exists
  const checkFileExists = useCallback(async (fileName: string): Promise<FileConflictInfo | null> => {
    try {
      const existingBlob = await head(fileName);
      if (existingBlob) {
        // Format file size
        const sizeInMB = existingBlob.size ? (existingBlob.size / (1024 * 1024)).toFixed(1) + ' MB' : undefined;
        
        // Format upload date
        const uploadedAt = existingBlob.uploadedAt 
          ? new Date(existingBlob.uploadedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : undefined;

        return {
          fileName,
          existingUrl: existingBlob.url,
          existingFileInfo: {
            size: sizeInMB,
            uploadedAt,
            url: existingBlob.url
          }
        };
      }
      return null;
    } catch (error) {
      // File doesn't exist
      return null;
    }
  }, []);

  // Check multiple files for conflicts
  const checkFilesForConflicts = useCallback(async (files: File[]): Promise<{
    conflictFiles: FileConflictInfo[];
    clearFiles: File[];
  }> => {
    const conflictFiles: FileConflictInfo[] = [];
    const clearFiles: File[] = [];

    for (const file of files) {
      // Use sanitized filename for conflict check to match upload behavior
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const conflict = await checkFileExists(sanitizedFileName);
      if (conflict) {
        // Store the original filename for display purposes
        conflictFiles.push({
          ...conflict,
          fileName: file.name // Show original filename in dialog
        });
      } else {
        clearFiles.push(file);
      }
    }

    return { conflictFiles, clearFiles };
  }, [checkFileExists]);

  // Show conflict dialog for the next conflict
  const showNextConflict = useCallback(() => {
    if (conflicts.length > 0) {
      setCurrentConflict(conflicts[0]);
      setIsDialogOpen(true);
    }
  }, [conflicts]);

  // Generate unique filename
  const generateUniqueFileName = useCallback((fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${fileName} (2)`;
    }
    
    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    return `${name} (2)${extension}`;
  }, []);

  // Resolve current conflict
  const resolveConflict = useCallback((resolution: Omit<FileConflictResolution, 'fileName'>) => {
    if (!currentConflict) return null;

    let finalFileName = currentConflict.fileName;
    let finalUrl: string | undefined = currentConflict.existingUrl;

    switch (resolution.action) {
      case 'use-existing':
        // Use existing file URL
        break;
      case 'overwrite':
        // Will upload with allowOverwrite: true
        finalUrl = undefined; // Will be set after upload
        break;
      case 'rename':
        // Generate unique filename
        finalFileName = generateUniqueFileName(currentConflict.fileName);
        finalUrl = undefined; // Will be set after upload
        break;
    }

    const resolvedConflict: FileConflictResolution = {
      action: resolution.action,
      fileName: finalFileName,
      url: finalUrl
    };

    // Remove current conflict from queue
    setConflicts(prev => prev.slice(1));
    setCurrentConflict(null);
    setIsDialogOpen(false);

    return resolvedConflict;
  }, [currentConflict, generateUniqueFileName]);

  // Cancel current conflict resolution
  const cancelConflict = useCallback(() => {
    setCurrentConflict(null);
    setIsDialogOpen(false);
    // Don't remove from conflicts array - let user handle it
  }, []);

  // Set conflicts and show first one
  const setConflictsAndShow = useCallback((newConflicts: FileConflictInfo[]) => {
    setConflicts(newConflicts);
    if (newConflicts.length > 0) {
      setCurrentConflict(newConflicts[0]);
      setIsDialogOpen(true);
    }
  }, []);

  return {
    // State
    conflicts,
    currentConflict,
    isDialogOpen,
    hasConflicts: conflicts.length > 0,
    
    // Actions
    checkFileExists,
    checkFilesForConflicts,
    setConflictsAndShow,
    showNextConflict,
    resolveConflict,
    cancelConflict,
    
    // Utilities
    generateUniqueFileName
  };
} 