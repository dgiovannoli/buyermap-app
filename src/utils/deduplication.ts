// Content hash generation for exact duplicate detection (browser-compatible)
export async function generateContentHash(content: string): Promise<string> {
  // Use Web Crypto API for browser compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

// Simple client-side hash for immediate use (synchronous)
export function generateSimpleHash(content: string): string {
  // Simple hash for client-side duplicate checking (not cryptographically secure)
  let hash = 0;
  const str = content.trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 16);
}

// Database record for content tracking
export interface ContentRecord {
  contentHash: string;
  filename: string;
  fileSize: number;
  uploadDate: Date;
  contentType: 'deck' | 'interview';
  userId: string;
  // Database IDs for existing processing
  databaseId?: string;
  blobUrl?: string;
}

// Duplicate check result interface
export interface DuplicateCheckResult {
  hasExactDuplicate: boolean;
  hasSimilarDuplicate: boolean;
  exactDuplicate?: ContentRecord;
  similarDuplicate?: ContentRecord;
  contentHash: string;
  similarityScore?: number;
}

// Simplified return type for the checkDuplicatesViaAPI function
export interface DuplicateApiResult {
  isDuplicate: boolean;
  metadata: DuplicateCheckResult;
}

// Client-side function to check for duplicates via API (ONLY client-safe function)
export async function checkForDuplicatesAPI(
  file: File,
  contentType: 'deck' | 'interview',
  options: {
    checkSimilarity?: boolean;
    similarityThreshold?: number;
  } = {}
): Promise<DuplicateCheckResult> {
  const {
    checkSimilarity = true,
    similarityThreshold = contentType === 'deck' ? 0.95 : 0.90
  } = options;

  console.log(`🔍 Checking for duplicates via API: ${file.name} (${contentType})`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('contentType', contentType);
  formData.append('checkSimilarity', checkSimilarity.toString());
  formData.append('similarityThreshold', similarityThreshold.toString());

  const response = await fetch('/api/check-duplicates', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Duplicate check failed: ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  
  // Convert date strings back to Date objects
  if (result.exactDuplicate?.uploadDate) {
    result.exactDuplicate.uploadDate = new Date(result.exactDuplicate.uploadDate);
  }
  if (result.similarDuplicate?.uploadDate) {
    result.similarDuplicate.uploadDate = new Date(result.similarDuplicate.uploadDate);
  }

  return result;
}

// Simplified wrapper function to match the user's expected interface
export async function checkDuplicatesViaAPI(
  file: File,
  type: 'deck' | 'interview'
): Promise<{ isDuplicate: boolean; metadata: any }> {
  console.log(`🔍 Checking for duplicates via API: ${file.name} (${type})`);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/check-duplicates', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error(`❌ API check failed: ${response.statusText}`);
      return { isDuplicate: false, metadata: null };
    }

    const json = await response.json();
    return {
      isDuplicate: json.isDuplicate ?? false,
      metadata: json.metadata ?? null
    };
  } catch (err) {
    console.error("❌ Error during duplicate API check", err);
    return { isDuplicate: false, metadata: null };
  }
} 