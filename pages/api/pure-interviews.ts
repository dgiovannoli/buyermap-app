import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File, IncomingForm } from 'formidable'
import fs from 'fs/promises'
import OpenAI from 'openai'
import pLimit from 'p-limit'
import { extractRawText, chunkify } from '../../src/utils/transcriptParser'
import { getPineconeIndex } from '../../src/lib/pinecone'

// Disable Next's default body parsing
export const config = { api: { bodyParser: false } }

// Initialize OpenAI
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Initialize Pinecone
let pineconeIndex: any = null;
try {
  pineconeIndex = getPineconeIndex();
} catch (error) {
  console.warn('Pinecone initialization failed:', error);
}

// Types for pure interview processing
interface InterviewQuote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  topic: string;
  specificity_score?: number;
}

interface InterviewResult {
  success: boolean;
  quotes: InterviewQuote[];
  totalInterviews: number;
  totalQuotes: number;
  processingTimeSeconds: string;
}

// Configuration
const CONCURRENT_LIMIT = 5;

// Pure interview topics (no deck assumptions)
const INTERVIEW_TOPICS = [
  'Job titles and responsibilities',
  'Company or firm size and structure', 
  'Main challenges and pain points',
  'Desired outcomes and goals',
  'Triggers for seeking new solutions',
  'Barriers to adopting new tools',
  'Messaging and value propositions that resonate'
];

// Timeout wrapper
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

// Robust OpenAI call with retries
async function callOpenAIWithRetry(params: any, purpose: string, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const start = Date.now();
      if (!openai) {
        throw new Error('OpenAI client not initialized');
      }
      const response = await openai.chat.completions.create({
        ...params,
        response_format: { type: 'json_object' },
      });
      const duration = Date.now() - start;
      console.log(`[OpenAI][${purpose}] Attempt ${attempt}: duration=${duration}ms, tokens=${response.usage?.total_tokens}`);
      return response;
    } catch (err) {
      lastError = err;
      console.error(`[OpenAI][${purpose}] Error on attempt ${attempt}:`, (err as Error).message);
      if (attempt <= maxRetries) {
        await new Promise(res => setTimeout(res, 500 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Extract quotes from transcript for a specific topic
async function extractQuotesForTopic(transcriptText: string, fileName: string, topic: string): Promise<InterviewQuote[]> {
  // [DEBUG] Log original text length
  console.log(`📏 [DEBUG] Transcript length for ${topic}: ${transcriptText.length} chars`);
  
  // Split into chunks
  const chunks = chunkify(transcriptText, 2000);
  console.log(`📦 [DEBUG] Split into ${chunks.length} chunks for topic: ${topic}`);
  
  const allQuotes: InterviewQuote[] = [];
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔍 Processing chunk ${i + 1}/${chunks.length} for topic: ${topic}`);
    
    const prompt = `You are extracting quotes from an interview transcript about a specific topic.

TOPIC: "${topic}"

INTERVIEW CHUNK: ${chunk}
SOURCE: ${fileName}

INSTRUCTIONS:
- Extract quotes that directly relate to the topic
- Focus on specific, concrete statements
- Include speaker attribution when available
- Avoid generic or vague statements
- Extract 1-2 of the most relevant quotes from this chunk

Return in this exact JSON format:
{
  "quotes": [
    {
      "text": "specific quote text",
      "speaker": "speaker name if identifiable",
      "role": "speaker role if mentioned", 
      "source": "${fileName}",
      "topic": "${topic}",
      "specificity_score": 8
    }
  ]
}`;

    try {
      const response = await withTimeout(
        callOpenAIWithRetry({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an expert at extracting relevant quotes from interview transcripts. Extract only quotes that directly relate to the specified topic. Do not make up or hallucinate content." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 800
        }, `topic-extraction-${topic}-chunk-${i}`),
        45000
      );

      const content = response.choices[0].message.content;
      if (!content) {
        console.log(`[OpenAI] Empty response for chunk ${i}, topic: ${topic}`);
        continue;
      }

      const parsed = JSON.parse(content);
      let chunkQuotes = parsed.quotes || [];
      
      // Filter out quotes with no real text
      const realQuotes = chunkQuotes.filter((quote: any) => 
        quote.text && 
        quote.text.length > 20 &&
        quote.specificity_score >= 6
      );
      
      console.log(`🎯 Chunk ${i + 1}: extracted ${realQuotes.length} quotes for topic: ${topic}`);
      allQuotes.push(...realQuotes);
      
    } catch (error) {
      console.error(`[OpenAI] Error processing chunk ${i} for topic ${topic}:`, error);
      continue;
    }
  }
  
  // Remove duplicates and take top quotes
  const uniqueQuotes = allQuotes.filter((quote, index, array) => 
    array.findIndex(q => q.text === quote.text) === index
  );
  
  const topQuotes = uniqueQuotes
    .sort((a, b) => (b.specificity_score || 0) - (a.specificity_score || 0))
    .slice(0, 3);
  
  console.log(`🎯 Final: ${topQuotes.length} quotes for topic: ${topic}`);
  return topQuotes;
}

// Index quote embeddings into Pinecone interviews namespace
async function indexInterviewQuotes(quotes: InterviewQuote[]): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE" || !pineconeIndex || !openai) {
    console.log('🎭 Skipping Pinecone indexing: mock mode or services not available');
    return;
  }

  const embeddingTasks = quotes
    .filter(quote => quote.text && quote.text.length > 20)
    .map(async (quote, index) => {
      try {
        // [DEBUG] Log the text being embedded
        console.log(`🧮 [DEBUG] Embedding interview quote:`, quote.text.slice(0, 200));
        
        // Generate embedding
        const { data: [embeddingResult] } = await openai!.embeddings.create({
          model: 'text-embedding-ada-002',
          input: [quote.text],
        });
        
        const vector = embeddingResult.embedding;
        const quoteId = `${Date.now()}-${index}`;
        
        const vectorRecord = {
          id: `interview-${quoteId}`,
          values: vector,
          metadata: {
            text: quote.text,
            speaker: quote.speaker || '',
            role: quote.role || '',
            source: quote.source || '',
            topic: quote.topic,
            specificity_score: quote.specificity_score || 0,
            type: 'interview'
          },
        };
        
        // [DEBUG] Log the metadata being upserted
        console.log(`🔧 [DEBUG] Upserting interview metadata:`, vectorRecord.metadata.text.slice(0,200));
        
        // Upsert into Pinecone interviews namespace
        const namespacedIndex = pineconeIndex.namespace('interviews');
        await namespacedIndex.upsert([vectorRecord]);
        
        console.log(`📊 Indexed interview quote: ${quoteId}`);
      } catch (error) {
        console.error(`❌ Failed to index interview quote:`, error);
      }
    });

  await Promise.all(embeddingTasks);
  console.log(`✅ Indexed ${embeddingTasks.length} interview quote embeddings`);
}

// Process a single interview file
async function processSingleInterview(file: File): Promise<InterviewQuote[]> {
  console.log(`📁 Processing interview: ${file.originalFilename || file.newFilename}`);
  
  // Extract transcript text (DOCX only)
  const buffer = await fs.readFile((file as any).filepath);
  const filename = file.originalFilename || file.newFilename || '';
  
  if (!filename.toLowerCase().endsWith('.docx')) {
    throw new Error('Only .docx files supported for interviews');
  }
  
  const { value: transcriptText } = await extractRawText(buffer);
  
  // [DEBUG] Log transcript snippet
  console.log('📄 [DEBUG] Transcript snippet:', transcriptText.slice(0, 300));
  
  const allQuotes: InterviewQuote[] = [];
  
  // Extract quotes for each topic
  for (const topic of INTERVIEW_TOPICS) {
    console.log(`🎯 Processing topic: ${topic}`);
    const topicQuotes = await extractQuotesForTopic(transcriptText, filename, topic);
    allQuotes.push(...topicQuotes);
  }
  
  return allQuotes;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InterviewResult | { error: string }>
) {
  const processingStartTime = Date.now();
  
  console.log('🔒 [Pure Interview API] Processing interviews independently of deck analysis')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse form data
    const form = new IncomingForm({ multiples: true })
    
    const data = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

    // Get interview files
    const transcriptFiles = data.files.transcripts || data.files.interviews || data.files.files || []
    const interviewFiles: File[] = Array.isArray(transcriptFiles)
      ? transcriptFiles
      : transcriptFiles ? [transcriptFiles] : []

    console.log(`🗂️ Received ${interviewFiles.length} interview files`)

    if (interviewFiles.length === 0) {
      return res.status(400).json({ error: 'No interview files provided' })
    }

    // Check mock mode
    if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE") {
      console.log('🎭 Using mock data for pure interview analysis');
      const mockResponse: InterviewResult = {
        success: true,
        quotes: [],
        totalInterviews: interviewFiles.length,
        totalQuotes: 12,
        processingTimeSeconds: "2.5"
      };
      return res.status(200).json(mockResponse);
    }

    if (!openai) {
      throw new Error('OpenAI client not initialized - missing API key');
    }

    console.log(`🚀 Processing ${interviewFiles.length} interviews with ${INTERVIEW_TOPICS.length} topics each`);
    
    // Process interviews in parallel
    const limit = pLimit(CONCURRENT_LIMIT);
    const allResults = await Promise.all(
      interviewFiles.map(file => 
        limit(async () => {
          try {
            console.log(`Starting interview: ${file.originalFilename || file.newFilename}`);
            const quotes = await processSingleInterview(file);
            const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
            console.log(`✅ Completed interview ${file.originalFilename || file.newFilename} in ${elapsed}s`);
            return quotes;
          } catch (error) {
            console.error(`❌ Error processing interview ${file.originalFilename || file.newFilename}:`, error);
            return [];
          }
        })
      )
    );
    
    // Flatten all quotes
    const allQuotes = allResults.flat();
    console.log(`📊 Total quotes extracted: ${allQuotes.length}`);
    
    // Index quotes into Pinecone
    if (allQuotes.length > 0) {
      console.log('📊 Indexing interview quotes into Pinecone...');
      await indexInterviewQuotes(allQuotes);
    }
    
    const processingTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
    
    const result: InterviewResult = {
      success: true,
      quotes: allQuotes,
      totalInterviews: interviewFiles.length,
      totalQuotes: allQuotes.length,
      processingTimeSeconds: processingTime
    };

    console.log(`🎉 Pure interview processing completed: ${allQuotes.length} quotes from ${interviewFiles.length} interviews`);
    return res.status(200).json(result);

  } catch (error: unknown) {
    console.error('Error in pure interview processing:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ 
      error: errorMessage 
    });
  }
} 