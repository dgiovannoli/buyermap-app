import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData, Quote } from '../../../types/buyermap';
import { createICPValidationData, createValidationData } from '../../../utils/dataMapping';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Helper: Robust OpenAI call with retries, logging, and response_format enforcement
async function callOpenAIWithRetry(params: any, purpose: string, maxRetries = 2) {
  const apiKeyPresent = !!process.env.OPENAI_API_KEY;
  console.log(`[OpenAI][${purpose}] API key present:`, apiKeyPresent ? 'YES' : 'NO');
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const start = Date.now();
      const response = await openai.chat.completions.create({
        ...params,
        response_format: { type: 'json_object' },
      });
      const duration = Date.now() - start;
      const choice = response.choices?.[0];
      const content = choice?.message?.content || '';
      console.log(`[OpenAI][${purpose}] Attempt ${attempt}: duration=${duration}ms, finish_reason=${choice?.finish_reason}, tokens=${response.usage?.total_tokens}`);
      console.log(`[OpenAI][${purpose}] Raw content length: ${content.length}`);
      console.log(`[OpenAI][${purpose}] Raw content preview:`, content.substring(0, 200));
      if (!content.trim()) {
        throw new Error('Empty content from OpenAI');
      }
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

// Helper: Fallback manual extraction for classifications
function extractClassificationsManually(content: string) {
  const classifications = [];
  // Pattern 1: JSON-like key-value
  const pattern1 = /"(.+?)"\s*:\s*"(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)"/gi;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    classifications.push({ quote: match[1], classification: match[2] });
  }
  // Pattern 2: 1. "quote" - ALIGNED
  if (classifications.length === 0) {
    const pattern2 = /(\d+)\.\s*"(.+?)"\s*-\s*(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)/gi;
    while ((match = pattern2.exec(content)) !== null) {
      classifications.push({ quote: match[2], classification: match[3] });
    }
  }
  // Pattern 3: JSON array objects
  if (classifications.length === 0) {
    const pattern3 = /"text"\s*:\s*"(.+?)".+?"classification"\s*:\s*"(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)"/gi;
    while ((match = pattern3.exec(content)) !== null) {
      classifications.push({ quote: match[1], classification: match[2] });
    }
  }
  return classifications;
}

// Helper: Normalize quote extraction results
function normalizeQuoteExtractionResults(rawResults: any[]): Quote[] {
  const normalizedQuotes: Quote[] = [];
  rawResults.forEach((fileResult, fileIndex) => {
    let quotes: Quote[] = [];
    if (Array.isArray(fileResult)) {
      quotes = fileResult;
    } else if (fileResult?.quotes && Array.isArray(fileResult.quotes)) {
      quotes = fileResult.quotes;
    } else if (typeof fileResult === 'object' && fileResult.text) {
      quotes = [fileResult];
    }
    console.log(`📝 Found ${quotes.length} quotes in file ${fileIndex + 1}`);
    normalizedQuotes.push(...quotes);
  });
  return normalizedQuotes;
}

// Helper: Robust quote extraction from OpenAI response
function extractQuotesFromOpenAIResponse(content: string): Quote[] {
  console.log('🔧 Extracting quotes from content:', content.substring(0, 200));
  try {
    const parsed = JSON.parse(content);
    console.log('🔧 Parsed structure:', JSON.stringify(parsed, null, 2));
    console.log('🔧 Parsed type:', typeof parsed);
    let quotes: Quote[] = [];
    if (Array.isArray(parsed)) {
      quotes = parsed;
    } else if (parsed.quotes && Array.isArray(parsed.quotes)) {
      quotes = parsed.quotes;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      quotes = parsed.data;
    }
    console.log('🔧 Extracted quotes count:', quotes.length);
    console.log('🔧 First quote preview:', quotes[0] ? JSON.stringify(quotes[0], null, 2) : 'No quotes');
    return quotes;
  } catch (error) {
    console.error('🔧 Parse error:', error);
    console.log('🔧 Raw content that failed to parse:', content);
    return [];
  }
}

// Helper: Robust batch classification parser
function parseBatchClassificationResponse(content: string): any[] {
  console.log('🔧 BATCH PARSING DEBUG:');
  console.log('🔧 Raw content:', content.substring(0, 200));
  try {
    const parsed = JSON.parse(content);
    console.log('🔧 Parsed structure keys:', Object.keys(parsed));
    let quotes: any[] = [];
    if (parsed.quotes && Array.isArray(parsed.quotes)) {
      quotes = parsed.quotes;
      console.log('🔧 Found quotes property with', quotes.length, 'items');
    } else if (parsed.result && Array.isArray(parsed.result)) {
      quotes = parsed.result;
      console.log('🔧 Found result property with', quotes.length, 'items');
    } else if (Array.isArray(parsed)) {
      quotes = parsed;
      console.log('🔧 Found direct array with', quotes.length, 'items');
    }
    console.log('🔧 Extracted', quotes.length, 'classified quotes');
    console.log('🔧 Sample:', quotes[0] ? JSON.stringify(quotes[0], null, 2) : 'None');
    return quotes;
  } catch (error) {
    console.error('🔧 Batch parsing error:', error);
    console.log('🔧 Failed content:', content);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const assumptionsJson = formData.get('assumptions') as string;
    const existingAssumptions: BuyerMapData[] = JSON.parse(assumptionsJson);

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log('📁 Starting file parsing...');
    console.log('🚀 EXTRACTION FLOW DEBUG:');
    console.log('🚀 Files array:', files.map(f => f.name));
    let extractedQuotes: any[] = [];
    const MAX_QUOTES_PER_INTERVIEW = 4; // Limit quotes per interview
    const MAX_TOTAL_QUOTES = 12; // Overall limit across all interviews

    for (const file of files) {
      console.log('🔍 Processing file:', file.name);
      const parsedContent = await parseFile(file);
      if (parsedContent.error) {
        console.error(`Error parsing interview file ${file.name}:`, parsedContent.error);
        continue;
      }
      console.log(`📁 Parsed file: ${file.name}`);
      
      // Use OpenAI to extract quotes
      let processedQuotes: Quote[] = [];
      let quoteResponse;
      try {
        console.log('📁 File extraction started for:', file.name);
        quoteResponse = await withTimeout(callOpenAIWithRetry({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract exactly 3-4 of the most impactful quotes from this interview that relate to:\n- Who uses transcription tools (titles, roles)\n- Pain points with current solutions\n- Desired outcomes or benefits\n- What triggers the need for transcription\n- Barriers to adoption\n- Key messaging that resonates\n\nRespond ONLY with a valid JSON array, no text, no markdown, no explanation.\nFormat:\n[\n  {\n    \"text\": \"exact quote text\",\n    \"speaker\": \"speaker name\", \n    \"role\": \"speaker role/title\",\n    \"source\": \"interview name\"\n  }\n]`
            },
            {
              role: "user",
              content: `INTERVIEW TRANSCRIPT:\n${parsedContent.text}\n\nExtract ONLY the 3-4 most impactful quotes that reveal customer needs, pain points, behaviors, or outcomes.`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        }, 'quote-extraction'), 60000);
        let content = quoteResponse.choices[0]?.message?.content || '';
        if (!content.trim()) {
          console.error(`[OpenAI][quote-extraction] Empty response for file ${file.name}`);
          continue;
        }
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
        processedQuotes = extractQuotesFromOpenAIResponse(content);
        console.log('📝 Extraction function returned:', typeof processedQuotes);
        console.log('📝 Is array:', Array.isArray(processedQuotes));
        console.log('📝 Length:', processedQuotes?.length || 0);
        console.log('📝 Sample item:', processedQuotes?.[0] ? JSON.stringify(processedQuotes[0], null, 2) : 'No items');
      } catch (error) {
        console.error('[OpenAI][quote-extraction] API error:', (error as Error).message);
        continue;
      }
      console.log('💾 About to push to extractedQuotes...');
      extractedQuotes.push(processedQuotes);
      console.log('💾 Push completed. New length:', extractedQuotes.length);
    }

    console.log('🔍 DEBUGGING QUOTE AGGREGATION:');
    console.log('extractedQuotes type:', typeof extractedQuotes);
    console.log('extractedQuotes length:', extractedQuotes?.length);
    console.log('extractedQuotes structure:', JSON.stringify(extractedQuotes, null, 2));
    if (Array.isArray(extractedQuotes)) {
      extractedQuotes.forEach((fileQuotes, index) => {
        console.log(`File ${index + 1}: ${fileQuotes?.length || 0} quotes`);
      });
    }
    let allQuotes = normalizeQuoteExtractionResults(extractedQuotes);
    if (allQuotes.length === 0) {
      console.error('❌ CRITICAL: No quotes found for processing!');
    }
    console.log(`📊 Processing ${allQuotes.length} quotes against ${existingAssumptions.length} assumptions`);

    // Limit total quotes across all interviews
    allQuotes = allQuotes.slice(0, MAX_TOTAL_QUOTES);
    console.log('📊 Processing', allQuotes.length, 'quotes against assumptions');

    // 2. For each assumption, classify quotes in smaller batches
    const MAX_QUOTES_PER_ASSUMPTION = 6; // Hard limit per assumption
    for (const assumption of existingAssumptions) {
      console.log('🚀 Starting classification for assumption:', assumption.v1Assumption);
      let relevantQuotes: Quote[] = [];
      let allClassifiedQuotes: Quote[] = [];
      let alignedCount = 0;
      let misalignedCount = 0;
      let newDataCount = 0;

      // Skip batch processing if we have few quotes
      if (allQuotes.length <= 5) {
        try {
          let batchResponse;
          try {
            batchResponse = await withTimeout(callOpenAIWithRetry({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `Classify each quote as ALIGNED, MISALIGNED, NEW_INSIGHT, or IRRELEVANT to this assumption.\n\nASSUMPTION: \"${assumption.v1Assumption}\"\n\nQUOTES:\n${allQuotes.map((q, idx) => `${idx + 1}. \"${q.text}\"`).join('\\n')}\n\nRespond ONLY with a valid JSON array, no text, no markdown, no explanation.\nFormat:\n[\n  {\n    \"quote\": \"quote text here\", \"classification\": \"ALIGNED\"\n  }\n]`
                },
                {
                  role: "user",
                  content: `ASSUMPTION: ${assumption.v1Assumption}\n\nQUOTES:\n${allQuotes.map((q, idx) => `${idx + 1}. \"${q.text}\"`).join('\\n')}\n\nClassify each quote against the assumption.`
                }
              ],
              temperature: 0.1,
              max_tokens: 2000
            }, 'classification-single'), 60000);
          } catch (error) {
            console.error('[OpenAI][classification-single] API error:', (error as Error).message);
            // Fallback: mark all as unclassified
            continue;
          }
          let content = batchResponse.choices[0]?.message?.content || '';
          if (!content.trim()) {
            console.error('[OpenAI][classification-single] Empty response from OpenAI');
            continue;
          }
          // Aggressive cleaning
          content = content
            .replace(/```json\s*/gi, '')
            .replace(/```\s*$/gi, '')
            .replace(/^[^{[]*/, '')
            .replace(/[^}\]]*$/, '')
            .trim()
            .replace(/^\s*["']/, '')
            .replace(/["']\s*$/, '')
            .replace(/\n\s*\n/g, '\n')
            .replace(/,\s*[}\]]/, '}')
            .trim();
          console.log('[Debug] Cleaned content for parsing:', content.substring(0, 200));
          try {
            const classifications = JSON.parse(content);
            if (Array.isArray(classifications)) {
              classifications.forEach((item) => {
                const quote = allQuotes.find(q => q.text === item.quote);
                if (quote && item.classification !== 'irrelevant') {
                  relevantQuotes.push(quote);
                  allClassifiedQuotes.push(quote);
                  switch (item.classification.toLowerCase()) {
                    case 'aligned': alignedCount++; break;
                    case 'misaligned': misalignedCount++; break;
                    case 'new_insight': newDataCount++; break;
                  }
                }
              });
            }
          } catch (parseError) {
            console.error('[Debug] JSON parse failed. Raw content:', content);
            console.error('[Debug] Parse error:', (parseError as Error).message);
            // Fallback: try to extract classifications manually
            const fallbackClassifications = extractClassificationsManually(content);
            if (fallbackClassifications.length > 0) {
              console.log('[Debug] Using fallback classification extraction');
              fallbackClassifications.forEach((item) => {
                const quote = allQuotes.find(q => q.text === item.quote);
                if (quote && item.classification !== 'irrelevant') {
                  relevantQuotes.push(quote);
                  allClassifiedQuotes.push(quote);
                  switch (item.classification.toLowerCase()) {
                    case 'aligned': alignedCount++; break;
                    case 'misaligned': misalignedCount++; break;
                    case 'new_insight': newDataCount++; break;
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('OpenAI API error (batch classification):', error);
          throw error;
        }
      } else {
        // Process in smaller batches for larger quote sets
        const BATCH_SIZE = 3; // Smaller batch size
        for (let i = 0; i < allQuotes.length && relevantQuotes.length < MAX_QUOTES_PER_ASSUMPTION; i += BATCH_SIZE) {
          const quoteBatch = allQuotes.slice(i, i + BATCH_SIZE);
          console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allQuotes.length / BATCH_SIZE)} (${quoteBatch.length} quotes)`);
          
          try {
            let batchResponse;
            try {
              batchResponse = await withTimeout(callOpenAIWithRetry({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Classify each quote as ALIGNED, MISALIGNED, NEW_INSIGHT, or IRRELEVANT to this assumption.\n\nASSUMPTION: \"${assumption.v1Assumption}\"\n\nQUOTES:\n${quoteBatch.map((q, idx) => `${i + idx + 1}. \"${q.text}\"`).join('\\n')}\n\nRespond ONLY with a valid JSON array, no text, no markdown, no explanation.\nFormat:\n[\n  {\n    \"quote\": \"quote text here\", \"classification\": \"ALIGNED\"\n  }\n]`
                  },
                  {
                    role: "user",
                    content: `ASSUMPTION: ${assumption.v1Assumption}\n\nQUOTES:\n${quoteBatch.map((q, idx) => `${i + idx + 1}. \"${q.text}\"`).join('\\n')}\n\nClassify each quote against the assumption.`
                  }
                ],
                temperature: 0.1,
                max_tokens: 2000
              }, 'classification-batch'), 60000);
            } catch (error) {
              console.error('[OpenAI][classification-batch] API error:', (error as Error).message);
              // Fallback: mark all as unclassified
              continue;
            }
            let content = batchResponse.choices[0]?.message?.content || '';
            if (!content.trim()) {
              console.error('[OpenAI][classification-batch] Empty response from OpenAI');
              continue;
            }
            // Aggressive cleaning
            content = content
              .replace(/```json\s*/gi, '')
              .replace(/```\s*$/gi, '')
              .replace(/^[^{[]*/, '')
              .replace(/[^}\]]*$/, '')
              .trim()
              .replace(/^\s*["']/, '')
              .replace(/["']\s*$/, '')
              .replace(/\n\s*\n/g, '\n')
              .replace(/,\s*[}\]]/, '}')
              .trim();
            console.log('[Debug] Cleaned content for parsing:', content.substring(0, 200));
            try {
              const batchClassified = parseBatchClassificationResponse(content);
              console.log('🔧 Batch result:', batchClassified.length, 'classified quotes');
              allClassifiedQuotes.push(...batchClassified.filter(item => item.classification !== 'irrelevant'));
              console.log('🔧 Total accumulated:', allClassifiedQuotes.length, 'quotes');
            } catch (parseError) {
              console.error('[Debug] JSON parse failed. Raw content:', content);
              console.error('[Debug] Parse error:', (parseError as Error).message);
              // Fallback: try to extract classifications manually
              const fallbackClassifications = extractClassificationsManually(content);
              if (fallbackClassifications.length > 0) {
                console.log('[Debug] Using fallback classification extraction');
                fallbackClassifications.forEach((item) => {
                  const quote = allQuotes.find(q => q.text === item.quote);
                  if (quote && item.classification !== 'irrelevant' && relevantQuotes.length < MAX_QUOTES_PER_ASSUMPTION) {
                    relevantQuotes.push(quote);
                    allClassifiedQuotes.push(quote);
                    switch (item.classification.toLowerCase()) {
                      case 'aligned': alignedCount++; break;
                      case 'misaligned': misalignedCount++; break;
                      case 'new_insight': newDataCount++; break;
                    }
                  }
                });
              }
            }
          } catch (error) {
            console.error('OpenAI API error (batch classification):', error);
            throw error;
          }
        }
      }

      // Update assumption based on quote analysis
      console.log('🔧 About to store classified quotes for assumption:', assumption.v1Assumption);
      console.log('�� Quotes to store:', allClassifiedQuotes.length);
      if (allClassifiedQuotes.length > 0) {
        console.log('🔧 Sample quote to store:', JSON.stringify(allClassifiedQuotes[0], null, 2));
      }
      assumption.quotes = allClassifiedQuotes;
      // Determine comparison outcome
      if (alignedCount > misalignedCount && alignedCount > newDataCount) {
        assumption.comparisonOutcome = 'Aligned';
      } else if (misalignedCount > alignedCount && misalignedCount > newDataCount) {
        assumption.comparisonOutcome = 'Misaligned';
      } else {
        assumption.comparisonOutcome = 'New Data Added';
      }
      // Calculate confidence score based on quote support
      const totalRelevant = alignedCount + misalignedCount + newDataCount;
      if (totalRelevant > 0) {
        const baseConfidence = 85;
        const quoteMultiplier = Math.min(totalRelevant / 3, 1);
        assumption.confidenceScore = Math.round(baseConfidence * (0.7 + (0.3 * quoteMultiplier)));
        assumption.confidenceExplanation = `${totalRelevant} relevant quotes found: ${alignedCount} aligned, ${misalignedCount} misaligned, ${newDataCount} new insights`;
      }
      // Generate messaging adjustment
      if (assumption.comparisonOutcome === 'Misaligned') {
        assumption.waysToAdjustMessaging = `Adjust messaging to address ${misalignedCount} contradicting quotes. Focus on actual customer needs revealed in interviews.`;
      } else if (assumption.comparisonOutcome === 'New Data Added') {
        assumption.waysToAdjustMessaging = `Incorporate ${newDataCount} new insights from interviews into messaging.`;
      } else {
        assumption.waysToAdjustMessaging = `Continue emphasizing points validated by ${alignedCount} supporting quotes.`;
      }
      // Map quotes to exampleQuotes with attribution/source
      assumption.exampleQuotes = (assumption.quotes || []).map(q => ({
        quote: q.text,
        attribution: `${q.speaker}, ${q.role}`,
        interviewSource: q.source
      }));
    }
    console.log('✅ OpenAI processing complete');

    // --- TRANSFORM TO NEW FORMAT ---
    // 1. Update icpValidation subtitle and totalInterviews
    const icpValidation = createICPValidationData(existingAssumptions[0]);
    icpValidation.subtitle = 'Validated against customer interviews';
    icpValidation.totalInterviews = files.length;

    // 2. Regenerate validationAttributes from updated assumptions
    const validationAttributes = Object.values(createValidationData(existingAssumptions));

    // 3. Calculate new validation counts
    const validatedCount = existingAssumptions.filter(a => a.comparisonOutcome === 'Aligned').length;
    const partiallyValidatedCount = existingAssumptions.filter(a => a.comparisonOutcome === 'New Data Added').length;
    const pendingCount = existingAssumptions.filter(a => !a.comparisonOutcome).length;
    const overallAlignmentScore = Math.round(
      (validatedCount / existingAssumptions.length) * 100
    );

    // 4. Return transformed BuyerMapData (array of one object for compatibility)
    console.log('🔧 FINAL VALIDATION CHECK:');
    existingAssumptions.forEach((a, idx) => {
      console.log(`🔧 Assumption ${idx + 1}: ${a.quotes?.length ?? 0} quotes`);
      if (a.quotes && a.quotes.length > 0) {
        console.log(`🔧 Sample quote:`, JSON.stringify(a.quotes[0], null, 2));
      }
    });
    return NextResponse.json({
      success: true,
      assumptions: existingAssumptions,
      icpValidation,
      validationAttributes,
      overallAlignmentScore,
      validatedCount,
      partiallyValidatedCount,
      pendingCount
    });
  } catch (error) {
    console.error('Error processing interview batch:', error);
    return NextResponse.json(
      { error: 'Failed to process interview batch' },
      { status: 500 }
    );
  }
} 