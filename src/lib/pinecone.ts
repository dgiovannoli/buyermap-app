// src/lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;

export function initPinecone(): Pinecone {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

export function getPineconeIndex(indexName: string = 'buyermap-embeddings') {
  const pc = initPinecone();
  return pc.index(indexName);
}
