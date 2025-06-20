import mammoth from 'mammoth';

export async function extractRawText(buffer: Buffer): Promise<{ value: string }> {
  try {
    const { value, messages } = await mammoth.extractRawText({ buffer });
    
    // Log raw extraction for debugging
    console.log('📄 [DEBUG] Raw mammoth extraction preview:', value.slice(0, 500));
    
    // Aggressive filtering for deck contamination and XML artifacts
    let cleanedText = value
      // Remove deck-specific headers and content
      .replace(/^Company Snapshot[\s\S]*?(?=\n[A-Z])/g, '')
      .replace(/Company Snapshot.*/g, '')
      .replace(/Forensic Psychology.*/g, '')
      .replace(/Practice.*/g, '')
      
      // Remove XML artifacts and headers/footers
      .replace(/<[^>]+>/g, '') // Remove any remaining XML tags
      .replace(/\[Content_Types\]\.xml.*/g, '')
      .replace(/word\/document\.xml.*/g, '')
      .replace(/PK\s*[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~]*/g, '') // ZIP headers
      .replace(/docProps\/app\.xml.*/g, '')
      .replace(/docProps\/core\.xml.*/g, '')
      
      // Remove numbering and formatting artifacts
      .replace(/^\d+\s*$/gm, '') // Standalone numbers
      .replace(/^[•·▪▫▸▹►▻].*$/gm, '') // Bullet points without content
      .replace(/^\s*\[\s*\]\s*$/gm, '') // Empty brackets
      
      // Remove excessive whitespace but preserve interview structure
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple line breaks
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .trim();
    
    // Validate this looks like interview content
    const isValidTranscript = (
      cleanedText.length > 100 &&
      !cleanedText.includes('Company Snapshot') &&
      !cleanedText.includes('Forensic Psychology') &&
      !cleanedText.includes('ppt/slides/') &&
      !cleanedText.includes('Content_Types') &&
      !cleanedText.includes('docProps/')
    );
    
    if (!isValidTranscript) {
      console.warn('📄 [WARNING] Extracted text may contain deck/XML contamination');
      console.log('📄 [DEBUG] Suspicious content preview:', cleanedText.slice(0, 300));
    }
    
    // Log extraction messages for debugging
    if (messages.length > 0) {
      console.log('📄 Mammoth extraction messages:', messages);
    }
    
    console.log('📄 [DEBUG] Final cleaned text preview:', cleanedText.slice(0, 300));
    
    return { value: cleanedText };
  } catch (error) {
    console.error('📄 [ERROR] DOCX extraction failed:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function chunkify(text: string, size: number = 2000): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first to avoid breaking mid-sentence
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Skip paragraphs that look like XML or ZIP artifacts
    if (paragraph.includes('xml') || 
        paragraph.includes('Content_Types') ||
        paragraph.includes('PK') ||
        paragraph.length < 10) {
      continue;
    }
    
    if (currentChunk.length + paragraph.length > size && currentChunk.length > 0) {
      if (currentChunk.trim().length > 100) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim().length > 100) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`📦 [DEBUG] Created ${chunks.length} clean chunks from transcript`);
  
  return chunks;
} 