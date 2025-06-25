import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '../../../lib/pinecone';
import { createEmbedding } from '../../../lib/openai';
import { isMockMode } from '../../../utils/mockHelper';
import { transformBuyerMapDataArray } from '../../../utils/dataMapping';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper function to map ICP attributes
function mapICPAttributeToKey(attribute: string): string {
  const attributeMap: { [key: string]: string } = {
    'Buyer Titles': 'buyer-titles',
    'Company Size': 'company-size',
    'Pain Points': 'pain-points',
    'Desired Outcomes': 'desired-outcomes',
    'Triggers': 'triggers',
    'Barriers': 'barriers',
    'Messaging Emphasis': 'messaging-emphasis'
  };
  
  return attributeMap[attribute] || attribute.toLowerCase().replace(/\s+/g, '-');
}

// Helper functions for calculating metrics
function calculateOverallAlignmentScore(data: any[]): number {
  const validAssumptions = data.filter(a => a.confidenceScore > 0);
  if (validAssumptions.length === 0) return 0;
  return Math.round(validAssumptions.reduce((sum, a) => sum + a.confidenceScore, 0) / validAssumptions.length);
}

function countValidationStatus(data: any[], status: string): number {
  return data.filter(a => a.validationStatus === status).length;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 RAG Cache Check: Starting cache lookup');
    
    const { contentHash } = await req.json();
    
    if (!contentHash) {
      return NextResponse.json({ error: 'Content hash required' }, { status: 400 });
    }
    
    console.log(`🔍 RAG Cache Check: Looking for content hash ${contentHash}`);
    
    if (isMockMode()) {
      console.log('🎭 Mock mode: RAG cache check skipped');
      return NextResponse.json({ cached: false });
    }
    
    try {
      const pineconeIndex = getPineconeIndex();
      
      // Search for existing metadata with this content hash
      const dummyEmbedding = await createEmbedding('deck analysis query');
      
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
        if (match.metadata && match.metadata.assumptions) {
          console.log(`✅ RAG Cache Hit: Found existing analysis for content hash ${contentHash}`);
          
          // Parse stored assumptions
          const storedAssumptions = JSON.parse(match.metadata.assumptions as string);
          
          // Reconstruct BuyerMapData format
          const cachedAssumptions = storedAssumptions.map((assumption: any, index: number) => ({
            id: index + 1,
            icpAttribute: assumption.icpAttribute,
            icpTheme: mapICPAttributeToKey(assumption.icpAttribute),
            v1Assumption: assumption.v1Assumption,
            whyAssumption: 'Retrieved from cache (identical content)',
            evidenceFromDeck: assumption.v1Assumption,
            comparisonOutcome: 'New Data Added',
            confidenceScore: assumption.confidenceScore,
            confidenceExplanation: `Cached analysis from ${match.metadata?.processedAt ? new Date(match.metadata.processedAt as string).toLocaleDateString() : 'unknown date'}`,
            validationStatus: 'pending',
            quotes: []
          }));
          
          // Transform to expected format
          const transformedData = transformBuyerMapDataArray(cachedAssumptions);
          const overallAlignmentScore = calculateOverallAlignmentScore(transformedData);
          const validatedCount = countValidationStatus(transformedData, 'validated');
          const partiallyValidatedCount = countValidationStatus(transformedData, 'partial');
          const pendingCount = countValidationStatus(transformedData, 'pending');
          
          const cachedResult = {
            success: true,
            assumptions: transformedData,
            overallAlignmentScore,
            validatedCount,
            partiallyValidatedCount,
            pendingCount,
            cached: true,
            contentHash
          };
          
          return NextResponse.json({ 
            cached: true, 
            result: cachedResult 
          });
        }
      }
      
      console.log(`❌ RAG Cache Miss: No cached analysis found for content hash ${contentHash}`);
      return NextResponse.json({ cached: false });
      
    } catch (error) {
      console.error('❌ RAG Cache Check Error:', error);
      return NextResponse.json({ cached: false });
    }
    
  } catch (error: any) {
    console.error('❌ RAG Cache Check Failed:', error);
    return NextResponse.json({ 
      error: 'Cache check failed',
      details: error.message 
    }, { status: 500 });
  }
} 