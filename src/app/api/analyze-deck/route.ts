import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData } from '../../../types/buyermap';
import { transformBuyerMapDataArray } from '../../../utils/dataMapping';
import { isMockMode, logMockUsage } from '../../../utils/mockHelper';
import { getPineconeIndex } from '../../../lib/pinecone';
import { createEmbedding } from '../../../lib/openai';
import { chunkify } from '../../../utils/transcriptParser';
import crypto from 'crypto';

// Configure API route for larger file uploads
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout

// Initialize OpenAI with proper error handling (only if not using mocks)
let openai: OpenAI | null = null;
if (!isMockMode()) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Timeout wrapper for OpenAI calls
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Generate content hash for deduplication
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Enhanced RAG storage for deck content
async function storeProcessedDeckInRAG(
  filename: string,
  content: string,
  assumptions: BuyerMapData[],
  contentHash: string
): Promise<void> {
  if (isMockMode()) {
    console.log('🎭 Mock mode: Skipping RAG storage');
    return;
  }

  try {
    const pineconeIndex = getPineconeIndex();
    
    // Chunk the deck content for better retrieval
    const chunks = chunkify(content, 1000);
    console.log(`📦 Chunking deck into ${chunks.length} pieces for RAG storage`);
    
    const vectors = [];
    
    // Store deck chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk);
      
      vectors.push({
        id: `deck-${contentHash}-chunk-${i}`,
        values: embedding.data[0].embedding,
        metadata: {
          type: 'deck-chunk',
          filename,
          contentHash,
          chunkIndex: i,
          text: chunk,
          processedAt: new Date().toISOString()
        } as Record<string, any>
      });
    }
    
    // Store assumption embeddings with enhanced metadata
    for (let i = 0; i < assumptions.length; i++) {
      const assumption = assumptions[i];
      const embedding = await createEmbedding(assumption.v1Assumption);
      
      vectors.push({
        id: `deck-${contentHash}-assumption-${i}`,
        values: embedding.data[0].embedding,
        metadata: {
          type: 'deck-assumption',
          filename,
          contentHash,
          assumptionIndex: i,
          icpAttribute: assumption.icpAttribute,
          text: assumption.v1Assumption,
          confidenceScore: assumption.confidenceScore,
          processedAt: new Date().toISOString()
        } as Record<string, any>
      });
    }
    
    // Store comprehensive deck metadata
    const deckMetaEmbedding = await createEmbedding(`${filename} deck analysis summary`);
    vectors.push({
      id: `deck-${contentHash}-metadata`,
      values: deckMetaEmbedding.data[0].embedding,
      metadata: {
        type: 'deck-metadata',
        filename,
        contentHash,
        assumptionCount: assumptions.length,
        contentLength: content.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
        // Store complete assumptions for quick retrieval
        assumptions: JSON.stringify(assumptions.map(a => ({
          icpAttribute: a.icpAttribute,
          v1Assumption: a.v1Assumption,
          confidenceScore: a.confidenceScore
        })))
      } as Record<string, any>
    });
    
    // Upsert all vectors in batches for efficiency
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeIndex.namespace("analyze-deck").upsert(batch);
      console.log(`📤 Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)} (${batch.length} vectors)`);
    }
    
    console.log(`✅ Successfully stored ${vectors.length} vectors for deck ${filename}`);
    
  } catch (error) {
    console.error('❌ Error storing deck in RAG:', error);
    // Don't throw - RAG storage is supplementary
  }
}

// Check if identical content was already processed
async function checkForExistingProcessedDeck(contentHash: string): Promise<BuyerMapData[] | null> {
  if (isMockMode()) {
    return null;
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
        console.log(`🔍 Found existing analysis for content hash ${contentHash}`);
        
        // Parse stored assumptions
        const storedAssumptions = JSON.parse(match.metadata.assumptions as string);
        
        // Reconstruct BuyerMapData format
        const existingAssumptions: BuyerMapData[] = storedAssumptions.map((assumption: any, index: number) => ({
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
        
        return existingAssumptions;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Error checking for existing deck:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== SALES DECK ANALYSIS PHASE ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Request URL:', req.url);
    
    // Check if we should use mock data
    if (isMockMode()) {
      logMockUsage('deck analysis');
      const mock = await import("../../../mocks/fixtures/deck-analysis.json");
      return NextResponse.json(mock.default);
    }
    
    console.log('Attempting to parse request body...');
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json({ 
        error: `Failed to parse request data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 400 });
    }
    
    const { blobUrl, filename } = requestBody;
    console.log('Blob URL received:', blobUrl, 'Filename:', filename);

    if (!blobUrl) {
      console.error('No blob URL provided in request');
      return NextResponse.json({ error: 'No blob URL provided' }, { status: 400 });
    }

    console.log('Starting deck analysis for file:', filename, 'from blob:', blobUrl);
    
    const timingLog: Record<string, number> = {};

    // At the start of the handler
    const startTime = Date.now();
    timingLog.uploadReceived = startTime;
    console.log('[TIMING] Upload received at', new Date(startTime).toISOString());

    // Before file download
    const downloadStart = Date.now();
    timingLog.downloadStart = downloadStart;
    console.log('[TIMING] File download start at', new Date(downloadStart).toISOString());
    // Download the file from Vercel Blob
    console.log('Downloading file from blob...');
    const fileResponse = await fetch(blobUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from blob: ${fileResponse.statusText}`);
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    const deckFile = new File([fileBuffer], filename, { 
      type: fileResponse.headers.get('content-type') || 'application/pdf' 
    });
    console.log('File downloaded successfully, size:', deckFile.size, 'bytes');
    const downloadEnd = Date.now();
    timingLog.downloadEnd = downloadEnd;
    console.log('[TIMING] File download end at', new Date(downloadEnd).toISOString(), 'Duration:', downloadEnd - downloadStart, 'ms');

    // Before parsing
    const parsingStart = Date.now();
    timingLog.parsingStart = parsingStart;
    console.log('[TIMING] Parsing start at', new Date(parsingStart).toISOString());
    // 1. Parse the deck file
    console.log('Step 1: Parsing deck file...');
    const parsedResult = await parseFile(deckFile);
    console.log('Extracted deck text length:', parsedResult.text?.length || 0);
    if (!parsedResult.text) {
      console.error('No text extracted from deck');
      return NextResponse.json({ error: 'Could not extract text from deck' }, { status: 400 });
    }
    const parsingEnd = Date.now();
    timingLog.parsingEnd = parsingEnd;
    console.log('[TIMING] Parsing end at', new Date(parsingEnd).toISOString(), 'Duration:', parsingEnd - parsingStart, 'ms');

    // Duplicate check and content hash generation (after parsing)
    const duplicateCheckStart = Date.now();
    timingLog.duplicateCheckStart = duplicateCheckStart;
    console.log('[TIMING] Duplicate check start at', new Date(duplicateCheckStart).toISOString());
    const contentHash = generateContentHash(parsedResult.text);
    console.log(`📋 Content hash: ${contentHash}`);
    const existingAnalysis = await checkForExistingProcessedDeck(contentHash);
    if (existingAnalysis) {
      console.log(`⚡ Found cached analysis! Returning existing results for content hash ${contentHash}`);
      // Transform the cached assumptions
      const transformedData = transformBuyerMapDataArray(existingAnalysis);
      const overallAlignmentScore = calculateOverallAlignmentScore(transformedData);
      const validatedCount = countValidationStatus(transformedData, 'validated');
      const partiallyValidatedCount = countValidationStatus(transformedData, 'partial');
      const pendingCount = countValidationStatus(transformedData, 'pending');
      return NextResponse.json({
        success: true,
        assumptions: transformedData,
        overallAlignmentScore,
        validatedCount,
        partiallyValidatedCount,
        pendingCount,
        cached: true,
        contentHash
      });
    }
    const duplicateCheckEnd = Date.now();
    timingLog.duplicateCheckEnd = duplicateCheckEnd;
    console.log('[TIMING] Duplicate check end at', new Date(duplicateCheckEnd).toISOString(), 'Duration:', duplicateCheckEnd - duplicateCheckStart, 'ms');

    // 2. Analyze the deck content with AI
    console.log('Step 2: Analyzing deck content with AI...');
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const systemPrompt = `You are an expert business analyst specializing in B2B buyer personas and Ideal Customer Profiles (ICPs). Your task is to analyze sales/marketing materials and extract specific, testable assumptions about the target buyer, WITH supporting evidence from the deck.

CRITICAL INSTRUCTIONS:
1. For ALL 7 ICP attributes: Buyer Titles, Company Size, Pain Points, Desired Outcomes, Triggers, Barriers, Messaging Emphasis
2. For EACH attribute, extract:
   - The specific, testable assumption (as before)
   - 2-3 direct quotes or slide references from the deck that support or contradict the assumption (include slide number if possible)
3. Base assumptions and evidence on EXPLICIT content from the deck
4. Include confidence scores (0-100) based on strength of evidence
5. Return ONLY valid JSON in the exact format specified

RESPONSE FORMAT:
{
  "assumptions": [
    {
      "icpAttribute": "Buyer Titles|Company Size|Pain Points|Desired Outcomes|Triggers|Barriers|Messaging Emphasis",
      "v1Assumption": "Specific, testable assumption with metrics/behaviors when possible",
      "confidenceScore": 0-100,
      "confidenceExplanation": "Brief explanation of evidence strength and source",
      "evidenceFromDeck": [
        { "quote": "Direct quote from deck", "slideNumber": 5 },
        { "quote": "Another quote or summary", "slideNumber": 7 }
      ]
    }
  ]
}

QUALITY STANDARDS:
- Buyer Titles: Specific job titles/roles, not generic terms
- Company Size: Include quantitative ranges when possible
- Pain Points: Specific problems with business impact
- Desired Outcomes: Measurable business results
- Triggers: Specific events/situations that drive need
- Barriers: Concrete obstacles to adoption
- Messaging Emphasis: Key value propositions and positioning

AVOID:
- Generic or obvious statements
- Assumptions without clear evidence
- Vague language ("some", "many", "often")
- Product features instead of buyer needs
- Quotes without slide numbers if possible`;

    const analysisResponse = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this sales deck/pitch material and extract ICP assumptions for all 7 attributes. For each attribute, provide 2-3 direct quotes or slide references from the deck that support or contradict the assumption (include slide number if possible). Focus on what the content reveals about the TARGET BUYER, not the product features.\n\nDECK CONTENT (slide-by-slide if possible):\n${parsedResult.text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      30000 // 30 second timeout
    );

    if (!analysisResponse.choices?.[0]?.message?.content) {
      throw new Error('No content in AI response');
    }

    console.log('AI analysis response received, length:', analysisResponse.choices[0].message.content.length);

    // 3. Parse the AI response into structured assumptions
    console.log('Step 3: Parsing AI response into structured assumptions...');
    let parsedAssumptions;
    try {
      const aiResponse = analysisResponse.choices[0].message.content;

      // Extract JSON content from markdown code block if present
      let jsonContent = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1].trim();
        } else {
          console.warn('Found ```json marker but could not extract content');
        }
      }

      // Clean the JSON content
      jsonContent = jsonContent
        .replace(/^[^{[]*/, '')
        .replace(/[^}\]]*$/, '')
        .trim();

      // Parse the JSON content
      parsedAssumptions = JSON.parse(jsonContent);
      console.log('Parsed assumptions count:', parsedAssumptions.assumptions?.length || 0);

      // Validate the response format
      if (!parsedAssumptions.assumptions || !Array.isArray(parsedAssumptions.assumptions)) {
        throw new Error('Invalid response format: missing assumptions array');
      }

      // Validate we have all 7 ICP attributes
      const requiredAttributes = [
        'Buyer Titles', 'Company Size', 'Pain Points', 'Desired Outcomes', 
        'Triggers', 'Barriers', 'Messaging Emphasis'
      ];
      
      const foundAttributes = parsedAssumptions.assumptions.map((a: any) => a.icpAttribute);
      const missingAttributes = requiredAttributes.filter(attr => !foundAttributes.includes(attr));
      
      if (missingAttributes.length > 0) {
        console.warn('Missing ICP attributes:', missingAttributes);
        // Continue anyway, but log the warning
      }

      // Validate each assumption has required fields
      parsedAssumptions.assumptions.forEach((assumption: any, index: number) => {
        const requiredFields = ['icpAttribute', 'v1Assumption', 'confidenceScore', 'confidenceExplanation'];
        const missingFields = requiredFields.filter(field => !assumption[field]);
        if (missingFields.length > 0) {
          throw new Error(`Invalid assumption at index ${index}: missing fields ${missingFields.join(', ')}`);
        }
      });

      // Evidence array validation (new)
      parsedAssumptions.assumptions.forEach((a: any) => {
        if (!Array.isArray(a.evidenceFromDeck)) {
          a.evidenceFromDeck = [];
        }
      });

      // Create assumption objects with proper typing
      const assumptions: BuyerMapData[] = parsedAssumptions.assumptions.map((assumption: any, index: number) => {
        return {
          id: index + 1,
          icpAttribute: assumption.icpAttribute,
          icpTheme: mapICPAttributeToKey(assumption.icpAttribute),
          v1Assumption: assumption.v1Assumption,
          whyAssumption: 'Extracted from deck analysis',
          evidenceFromDeck: assumption.evidenceFromDeck,
          comparisonOutcome: 'New Data Added',
          confidenceScore: assumption.confidenceScore,
          confidenceExplanation: assumption.confidenceExplanation,
          validationStatus: 'pending',
          quotes: []
        };
      });

      console.log('Created BuyerMapData array with', assumptions.length, 'assumptions');

      // Step 4: Wrap your embedding logic
      console.log('Step 4: Generating and storing embeddings...');
      
      // Generate embeddings for each assumption
      const assumptionsText = assumptions.map(assumption => assumption.v1Assumption);
      
      if (!isMockMode() && assumptionsText.length > 0) {
        try {
          const pineconeIndex = getPineconeIndex();
          
          const embedRes = await openai!.embeddings.create({
            model: 'text-embedding-ada-002',
            input: assumptionsText
          });

          const vectors = embedRes.data.map((item, idx) => ({
            id: `deck-assumption-${idx}`,
            values: item.embedding,
            metadata: { text: assumptionsText[idx] }
          }));

          // Sanity check: ensure vectors is actually an Array
          if (!Array.isArray(vectors)) {
            console.error('Pinecone upsert failed: `vectors` is not an Array', vectors);
            throw new Error('vectors is not an Array');
          }

          console.log('About to upsert vectors:', {
            vectorsCount: vectors.length,
            firstVector: vectors[0] ? { id: vectors[0].id, valuesLength: vectors[0].values?.length, metadata: vectors[0].metadata } : null
          });

          // Pinecone v6 JS client: use namespace() method then upsert vectors array
          await pineconeIndex.namespace("analyze-deck").upsert(vectors);

          console.log(`✅ Upserted ${vectors.length} assumption embeddings into Pinecone.`);
        } catch (embeddingError: any) {
          console.error('Error creating embeddings:', embeddingError);
          // Continue anyway - embeddings are not critical for the response
        }
      } else if (isMockMode()) {
        console.log('🎭 Mock mode: Skipping embedding generation');
      }

      // 5. Transform the assumptions into the standard format
      console.log('Step 5: Transforming assumptions into standard format...');
      const transformedData = transformBuyerMapDataArray(assumptions);

      // Validate the transformed data
      if (!transformedData || transformedData.length === 0) {
        throw new Error('Transformation resulted in empty data');
      }

      // 6. Store in enhanced RAG system for future retrieval
      console.log('Step 6: Storing analysis in RAG system...');
      await storeProcessedDeckInRAG(filename, parsedResult.text, assumptions, contentHash);

      // Calculate final metrics
      const overallAlignmentScore = calculateOverallAlignmentScore(transformedData);
      const validatedCount = countValidationStatus(transformedData, 'validated');
      const partiallyValidatedCount = countValidationStatus(transformedData, 'partial');
      const pendingCount = countValidationStatus(transformedData, 'pending');

      console.log('Final response metrics:', {
        assumptionsCount: transformedData.length,
        overallAlignmentScore,
        validatedCount,
        partiallyValidatedCount,
        pendingCount
      });

      return NextResponse.json({
        success: true,
        assumptions: transformedData,
        overallAlignmentScore,
        validatedCount,
        partiallyValidatedCount,
        pendingCount
      });

    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', analysisResponse.choices[0].message.content?.substring(0, 500));
      return NextResponse.json({ 
        error: 'Failed to parse AI response: ' + parseError.message,
        details: 'Invalid JSON format from AI'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in deck analysis:', error);
    
    // Handle specific error types
    if (error.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Analysis timed out. Please try again with a smaller file.',
        details: 'OpenAI request timeout'
      }, { status: 408 });
    }
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json({ 
        error: 'OpenAI API configuration error',
        details: 'Missing or invalid API key'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.stack
    }, { status: 500 });
  }
}

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

// Helper function to calculate overall alignment score
function calculateOverallAlignmentScore(data: BuyerMapData[]): number {
  const validAssumptions = data.filter(a => a.confidenceScore > 0);
  if (validAssumptions.length === 0) return 0;
  return Math.round(validAssumptions.reduce((sum, a) => sum + a.confidenceScore, 0) / validAssumptions.length);
}

// Helper function to count validation status
function countValidationStatus(data: BuyerMapData[], status: 'validated' | 'partial' | 'pending'): number {
  return data.filter(a => a.validationStatus === status).length;
} 