import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPineconeIndex } from '@/lib/pinecone';
import { isMockMode } from '@/utils/mockHelper';

export async function POST(req: Request) {
  try {
    const { query, k = 5 } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // If in mock mode, return sample results
    if (isMockMode()) {
      const mockResults = [
        {
          id: 'deck-assumption-0',
          score: 0.95,
          text: 'The buyer titles are likely to be attorneys or paralegals, as the product is designed to assist in legal case preparation and evidence review.'
        },
        {
          id: 'deck-assumption-1',
          score: 0.87,
          text: 'The company size can vary from small to large law firms, as the product is used by thousands of lawyers from different sized firms.'
        },
        {
          id: 'deck-assumption-2',
          score: 0.82,
          text: 'The main pain points are the time and effort spent on manual review of evidence, the disorganization of multimedia files, and the disadvantage defense teams face due to the prosecution\'s head start.'
        }
      ].filter(item => item.text.toLowerCase().includes(query.toLowerCase()));

      return NextResponse.json({ 
        query, 
        hits: mockResults.slice(0, k),
        mode: 'mock'
      });
    }

    // 1) Init clients
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pineconeIndex = getPineconeIndex();

    // 2) Embed the incoming query
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [query],
    });
    const qVector = embedRes.data[0].embedding;

    // 3) Pinecone query
    const queryRes = await pineconeIndex.query({
      queryRequest: {
        vector: qVector,
        topK: k,
        includeMetadata: true,
        namespace: 'analyze-deck',
      },
    });

    // 4) Extract hits
    const hits = queryRes.matches?.map((m) => ({
      id: m.id,
      score: m.score,
      text: m.metadata?.text,
    })) || [];

    return NextResponse.json({ query, hits });

  } catch (error: any) {
    console.error('Error in search-insights:', error);
    return NextResponse.json({ 
      error: 'Failed to search insights',
      details: error.message 
    }, { status: 500 });
  }
} 