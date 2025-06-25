// Server-side duplicate detection utilities
// This file should ONLY be imported by API routes and server components

import crypto from 'crypto';
import { ContentRecord } from '../utils/deduplication';

// Server-side content hash generation using Node.js crypto
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex').substring(0, 16);
}

// Check for exact content duplicates in database
export async function checkContentDuplicate(
  contentHash: string, 
  contentType: 'deck' | 'interview',
  userId: string
): Promise<ContentRecord | null> {
  // For decks: check RAG metadata storage
  if (contentType === 'deck') {
    return await checkDeckContentDuplicate(contentHash);
  }
  
  // For interviews: check database records
  return await checkInterviewContentDuplicate(contentHash, userId);
}

// Check deck content duplicates via RAG system
async function checkDeckContentDuplicate(contentHash: string): Promise<ContentRecord | null> {
  try {
    const { getPineconeIndex } = await import('./pinecone');
    const { createEmbedding } = await import('./openai');
    
    const pineconeIndex = getPineconeIndex();
    const dummyEmbedding = await createEmbedding('duplicate check');
    
    const queryResponse = await pineconeIndex.namespace("analyze-deck").query({
      vector: dummyEmbedding.data[0].embedding,
      topK: 1,
      includeMetadata: true,
      filter: {
        type: 'deck-metadata',
        contentHash: contentHash
      }
    });
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const match = queryResponse.matches[0];
      return {
        contentHash,
        filename: match.metadata?.filename as string || 'Unknown',
        fileSize: match.metadata?.contentLength as number || 0,
        uploadDate: new Date(match.metadata?.processedAt as string || Date.now()),
        contentType: 'deck',
        userId: 'system', // Deck processing doesn't track user IDs yet
        databaseId: match.id
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to check deck content duplicate:', error);
    return null;
  }
}

// Check interview content duplicates via database
async function checkInterviewContentDuplicate(contentHash: string, userId: string): Promise<ContentRecord | null> {
  try {
    // Import database functions dynamically to avoid circular imports
    const { createServerClient } = await import('./supabase-server');
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('user_interviews')
      .select('*')
      .eq('user_id', userId)
      .eq('content_hash', contentHash)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      contentHash,
      filename: data.filename,
      fileSize: data.file_size || 0,
      uploadDate: new Date(data.upload_date),
      contentType: 'interview',
      userId: data.user_id,
      databaseId: data.id,
      blobUrl: data.blob_url
    };
  } catch (error) {
    console.warn('Failed to check interview content duplicate:', error);
    return null;
  }
}

// RAG similarity check for near-duplicates
export async function checkRAGSimilarity(
  content: string,
  contentType: 'deck' | 'interview',
  similarityThreshold: number = 0.95
): Promise<{
  isDuplicate: boolean;
  similarContent?: ContentRecord;
  similarityScore?: number;
}> {
  const startTime = Date.now();
  try {
    console.log("🔍 [RAG] Starting similarity check...");
    
    // Import Pinecone and OpenAI (these are the expensive operations)
    const pineconeStart = Date.now();
    const { getPineconeIndex } = await import('./pinecone');
    const pineconeIndex = getPineconeIndex();
    console.log(`🔍 [RAG] Pinecone connection: ${Date.now() - pineconeStart}ms`);
    
    const embeddingStart = Date.now();
    const { createEmbedding } = await import('./openai');
    const embedding = await createEmbedding(content.slice(0, 1000)); // First 1000 chars for similarity
    console.log(`🔍 [RAG] Embedding generation: ${Date.now() - embeddingStart}ms`);
    
    const queryStart = Date.now();
    const namespace = contentType === 'deck' ? 'analyze-deck' : 'interviews';
    
    // OPTIMIZATION: Reduce topK and add timeout
    const queryResponse = await Promise.race([
      pineconeIndex.namespace(namespace).query({
        vector: embedding.data[0].embedding,
        topK: 1, // Reduced from 3 to 1 for faster query
        includeMetadata: true,
        filter: {
          type: contentType === 'deck' ? 'deck-metadata' : 'interview'
        }
      }),
      // Add 2-second timeout
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Pinecone query timeout')), 2000)
      )
    ]) as any;
    
    console.log(`🔍 [RAG] Pinecone query: ${Date.now() - queryStart}ms`);
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const topMatch = queryResponse.matches[0];
      const similarityScore = topMatch.score || 0;
      
      if (similarityScore >= similarityThreshold) {
        console.log(`🔍 [RAG] Similarity check complete: ${Date.now() - startTime}ms (duplicate found, score: ${similarityScore})`);
        return {
          isDuplicate: true,
          similarContent: {
            contentHash: topMatch.metadata?.contentHash as string || 'unknown',
            filename: topMatch.metadata?.filename as string || 'Unknown',
            fileSize: topMatch.metadata?.contentLength as number || 0,
            uploadDate: new Date(topMatch.metadata?.processedAt as string || Date.now()),
            contentType,
            userId: topMatch.metadata?.userId as string || 'unknown',
            databaseId: topMatch.id
          },
          similarityScore
        };
      }
    }
    
    console.log(`🔍 [RAG] Similarity check complete: ${Date.now() - startTime}ms (no duplicate found)`);
    return { isDuplicate: false };
  } catch (error) {
    console.warn('Failed to check RAG similarity:', error);
    console.log(`🔍 [RAG] Similarity check failed: ${Date.now() - startTime}ms`);
    return { isDuplicate: false };
  }
} 