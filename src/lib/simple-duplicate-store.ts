// Simple in-memory duplicate detection store (for testing without database issues)

interface DuplicateRecord {
  contentHash: string;
  filename: string;
  fileSize: number;
  uploadDate: string;
  contentType: 'deck' | 'interview';
}

// In-memory storage (will reset on server restart)
const duplicateStore = new Map<string, DuplicateRecord>();

export function saveFileRecord(record: {
  contentHash: string;
  filename: string;
  fileSize: number;
  contentType: 'deck' | 'interview';
}): void {
  const key = `${record.contentType}:${record.contentHash}`;
  duplicateStore.set(key, {
    ...record,
    uploadDate: new Date().toISOString(),
  });
  
  console.log(`📝 [MEMORY] Saved duplicate record: ${record.filename} (${record.contentHash})`);
}

export function findDuplicateByHash(contentHash: string, contentType: 'deck' | 'interview'): DuplicateRecord | null {
  const key = `${contentType}:${contentHash}`;
  const record = duplicateStore.get(key);
  
  if (record) {
    console.log(`🔍 [MEMORY] Found duplicate: ${record.filename} (${record.contentHash})`);
    return record;
  }
  
  console.log(`🔍 [MEMORY] No duplicate found for hash: ${contentHash}`);
  return null;
}

export function getAllRecords(): DuplicateRecord[] {
  return Array.from(duplicateStore.values());
}

export function clearAllRecords(): void {
  duplicateStore.clear();
  console.log(`🗑️ [MEMORY] Cleared all duplicate records`);
} 