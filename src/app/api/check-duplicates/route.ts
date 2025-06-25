import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '../../../lib/database-server';
import { generateContentHash, checkContentDuplicate, checkRAGSimilarity } from '../../../lib/deduplication-server';
import { parseFile } from '../../../utils/fileParser';
import { findDuplicateByHash } from '../../../lib/simple-duplicate-store';

async function runSimilarityCheck(text: string, contentType: 'deck' | 'interview', similarityThreshold: number = 0.95) {
  // Guard for empty text
  if (!text || text.length < 20) {
    console.warn("⚠️ Skipping similarity check — insufficient text length");
    return { hasSimilarDuplicate: false };
  }

  console.log("🔍 [DEBUG] Running RAG similarity check...");
  console.log("🔍 [DEBUG] Text length:", text.length);
  console.log("🔍 [DEBUG] Content type:", contentType);
  console.log("🔍 [DEBUG] Similarity threshold:", similarityThreshold);

  try {
    // Call Pinecone or vector DB here
    const similarityResult = await checkRAGSimilarity(text, contentType, similarityThreshold);
    
    console.log("🔍 [DEBUG] RAG similarity result:", {
      isDuplicate: similarityResult.isDuplicate,
      similarityScore: similarityResult.similarityScore,
      hasContent: !!similarityResult.similarContent,
      contentFilename: similarityResult.similarContent?.filename
    });

    return {
      hasSimilarDuplicate: similarityResult.isDuplicate,
      similarDuplicate: similarityResult.similarContent,
      similarityScore: similarityResult.similarityScore
    };
  } catch (error) {
    console.error("❌ [DEBUG] Similarity check failed:", error);
    return { hasSimilarDuplicate: false };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const type = (formData.get('type') || formData.get('contentType')) as 'deck' | 'interview';
  const skipRAG = formData.get('skipRAG') === 'true'; // New parameter to skip expensive RAG check

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
  }

  console.log("✅ Processing live duplicate check");
  console.log(`🔍 Checking duplicates for: ${file.name} (${type})${skipRAG ? ' [RAG SKIPPED]' : ''}`);

  try {
    // Get current user (with fallback for testing)
    const user = await getCurrentUserServer().catch(() => ({ id: '00000000-0000-0000-0000-000000000000' }));
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Step 1: Parse file content
    const parseStart = Date.now();
    console.log('🔍 [DEBUG] Parsing file content...');
    const parsed = await parseFile(file);
    if (parsed.error || !parsed.text) {
      console.log('❌ [DEBUG] File parsing failed:', parsed.error);
      return NextResponse.json({ 
        error: `Failed to extract content from ${file.name}: ${parsed.error}` 
      }, { status: 400 });
    }
    console.log(`✅ [DEBUG] File parsed successfully, content length: ${parsed.text.length} (${Date.now() - parseStart}ms)`);

    // Step 2: Generate content hash
    const hashStart = Date.now();
    console.log('🔍 [DEBUG] Generating content hash...');
    const contentHash = generateContentHash(parsed.text);
    console.log(`📋 Content hash: ${contentHash} (${Date.now() - hashStart}ms)`);

    // Step 3: Check for exact duplicates (FAST - in-memory)
    const exactCheckStart = Date.now();
    console.log('🔍 [DEBUG] Checking for exact duplicates...');
    const memoryDuplicate = findDuplicateByHash(contentHash, type);
    const exactDuplicate = memoryDuplicate ? {
      id: 'memory-' + contentHash,
      filename: memoryDuplicate.filename,
      upload_date: memoryDuplicate.uploadDate,
      file_size: memoryDuplicate.fileSize,
      content_hash: memoryDuplicate.contentHash
    } : null;
    const hasExactDuplicate = !!exactDuplicate;
    console.log(`🔍 [DEBUG] Exact duplicate check result: { hasExactDuplicate: ${hasExactDuplicate}, exactDuplicate: ${exactDuplicate ? 'found' : 'null'} } (${Date.now() - exactCheckStart}ms)`);

    // EARLY EXIT: If exact duplicate found, skip expensive RAG check
    if (hasExactDuplicate) {
      console.log("✅ [DEBUG] Exact duplicate found, skipping similarity check");
      console.log(`⏱️ Total duplicate check time: ${Date.now() - startTime}ms`);
      return NextResponse.json({
        isDuplicate: true,
        metadata: {
          hasExactDuplicate: true,
          hasSimilarDuplicate: false,
          exactDuplicate,
          contentHash
        }
      });
    }

    // EARLY EXIT: If RAG check is disabled, return fast
    if (skipRAG) {
      console.log("✅ [DEBUG] RAG check disabled, returning fast");
      console.log(`⏱️ Total duplicate check time: ${Date.now() - startTime}ms`);
      return NextResponse.json({
        isDuplicate: false,
        metadata: {
          hasExactDuplicate: false,
          hasSimilarDuplicate: false,
          exactDuplicate: null,
          contentHash,
          ragSkipped: true
        }
      });
    }

    // Step 4: RAG similarity check (EXPENSIVE - only if no exact duplicate and RAG not skipped)
    console.log("🔍 [DEBUG] No exact duplicate found, running similarity check...");
    const similarityStart = Date.now();
    
    const vectorResult = await runSimilarityCheck(parsed.text, type, 0.95);
    console.log(`🔍 [DEBUG] Similarity check result: ${JSON.stringify(vectorResult)} (${Date.now() - similarityStart}ms)`);
    
    console.log(`⏱️ Total duplicate check time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      isDuplicate: vectorResult.hasSimilarDuplicate,
      metadata: {
        hasExactDuplicate: false,
        hasSimilarDuplicate: vectorResult.hasSimilarDuplicate,
        exactDuplicate: null,
        similarDuplicate: vectorResult.similarDuplicate,
        contentHash,
        similarityScore: vectorResult.similarityScore
      }
    });

  } catch (error) {
    console.error('❌ Duplicate check API error:', error);
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Duplicate check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 