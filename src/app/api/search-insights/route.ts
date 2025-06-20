import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPineconeIndex } from '../../../lib/pinecone';
import { isMockMode } from '../../../utils/mockHelper';

export async function POST(req: Request) {
  try {
    const { query, k = 5, source = "deck" } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // If in mock mode, return sample results
    if (isMockMode()) {
      const mockResults = source === "interviews" ? [
        {
          id: 'intv-1-1234567890',
          score: 0.95,
          text: 'We are a small criminal defense firm with 3 attorneys and 2 paralegals.',
          metadata: {
            assumptionId: '2',
            speaker: 'John Smith',
            role: 'Attorney',
            source: 'Interview_1.txt',
            classification: 'ALIGNED'
          }
        },
        {
          id: 'intv-3-1234567891',
          score: 0.87,
          text: 'The biggest challenge we face is manually reviewing hours of evidence recordings.',
          metadata: {
            assumptionId: '3',
            speaker: 'Sarah Johnson', 
            role: 'Paralegal',
            source: 'Interview_2.txt',
            classification: 'ALIGNED'
          }
        }
      ] : [
        {
          id: 'deck-assumption-0',
          score: 0.95,
          text: 'The buyer titles are likely to be attorneys or paralegals, as the product is designed to assist in legal case preparation and evidence review.'
        },
        {
          id: 'deck-assumption-1',
          score: 0.87,
          text: 'The company size can vary from small to large law firms, as the product is used by thousands of lawyers from different sized firms.'
        }
      ];
      
      return NextResponse.json({ 
        query, 
        source,
        hits: mockResults.filter(r => r.text.toLowerCase().includes(query.toLowerCase().split(' ')[0]))
      });
    }

    // Initialize clients for real search
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pineconeIndex = getPineconeIndex();

    // Map source to Pinecone namespace
    const namespace = source === "interviews" ? "interviews" : "analyze-deck";

    // Embed the incoming query
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [query],
    });
    const qVector = embedRes.data[0].embedding;

    // Pinecone query with namespace
    const namespacedIndex = pineconeIndex.namespace(namespace);
    const queryRes = await namespacedIndex.query({
      vector: qVector,
      topK: k,
      includeMetadata: true,
    });

    // Extract hits with proper metadata handling
    const hits = queryRes.matches?.map((m) => ({
      id: m.id,
      score: m.score,
      text: m.metadata?.text,
      metadata: source === "interviews" ? {
        assumptionId: m.metadata?.assumptionId,
        speaker: m.metadata?.speaker,
        role: m.metadata?.role,
        source: m.metadata?.source,
        classification: m.metadata?.classification,
        topic_relevance: m.metadata?.topic_relevance,
        specificity_score: m.metadata?.specificity_score
      } : undefined
    }));

    return NextResponse.json({ query, source, namespace, hits });

  } catch (error) {
    console.error('Search insights error:', error);
    return NextResponse.json(
      { error: 'Failed to search insights', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 