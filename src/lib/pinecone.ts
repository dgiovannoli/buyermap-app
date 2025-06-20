// src/lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;

export function initPinecone(): Pinecone {
  if (!pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pinecone;
}

export function getPineconeIndex(indexName?: string) {
  const pc = initPinecone();
  const finalIndexName = indexName || process.env.PINECONE_INDEX_NAME || 'buyermap-embeddings';
  
  console.log('Connecting to Pinecone index:', finalIndexName);
  return pc.index(finalIndexName);
}
