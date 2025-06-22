import mammoth from 'mammoth';

// Smart company profile extraction - finds scattered company info throughout conversation
export function extractSmartCompanyProfile(rawText: string): string {
  const companyIndicators: string[] = [];
  
  // Split into sentences for analysis
  const sentences = rawText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  // High-signal company size patterns
  const sizePatterns = [
    /(?:we're|we are)\s+a\s+(small|large|mid-?sized?|solo|boutique|enterprise)\s+(firm|company|practice|office)/i,
    /(?:our|the)\s+(firm|company|practice|office)\s+(?:has|is)\s+(?:about\s+)?(\d+)\s+(employees?|attorneys?|people|staff)/i,
    /(?:it's|we're)\s+(?:just\s+)?(?:a\s+)?(solo\s+practice|one-person\s+firm|two-person\s+office)/i,
    /(?:i'm|i am)\s+(?:a\s+)?(solo\s+practitioner)/i,
    /(?:just me|only me)\s+.{0,20}(don't have any staff|no staff|no employees)/i,
    /(?:we have|there are)\s+(\d+)\s+(locations?|offices?|partners?)/i
  ];
  
  // Industry/practice area patterns  
  const industryPatterns = [
    /(?:we|our firm)\s+(?:specialize|focus|work)\s+(?:in|on)\s+([^,.]+(?:law|legal|defense|litigation|injury|family|criminal|corporate|IP|patent))/i,
    /(?:we're|we are)\s+(?:a\s+)?([^,.]+(?:law|legal|defense|litigation)\s+(?:firm|practice))/i,
    /(?:our practice|we)\s+(?:focuses on|handles|does)\s+([^,.]+)/i
  ];
  
  // Client type patterns
  const clientPatterns = [
    /(?:we work with|our clients are|we represent)\s+([^,.]+)/i,
    /(?:clients are typically|mostly work with|specialize in)\s+([^,.]+)/i
  ];
  
  // Extract size information
  for (const sentence of sentences) {
    for (const pattern of sizePatterns) {
      const match = sentence.match(pattern);
      if (match) {
        // Clean up the matched text
        const sizeInfo = sentence.replace(/\s+/g, ' ').trim();
        if (sizeInfo.length < 150) { // Keep it concise
          companyIndicators.push(sizeInfo);
        }
        break; // One match per sentence
      }
    }
  }
  
  // Extract industry/practice information
  for (const sentence of sentences) {
    for (const pattern of industryPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        const industryInfo = sentence.replace(/\s+/g, ' ').trim();
        if (industryInfo.length < 150) {
          companyIndicators.push(industryInfo);
        }
        break;
      }
    }
  }
  
  // Extract client type information (limit to 1-2 to avoid noise)
  let clientCount = 0;
  for (const sentence of sentences) {
    if (clientCount >= 2) break;
    for (const pattern of clientPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        const clientInfo = sentence.replace(/\s+/g, ' ').trim();
        if (clientInfo.length < 150) {
          companyIndicators.push(clientInfo);
          clientCount++;
        }
        break;
      }
    }
  }
  
  // Combine into a concise company profile
  if (companyIndicators.length === 0) {
    return '';
  }
  
  // Remove duplicates and create 1-sentence summary
  const uniqueIndicators = [...new Set(companyIndicators)];
  const profile = uniqueIndicators.slice(0, 3).join('. '); // Max 3 key facts
  
  return profile.length > 200 ? profile.substring(0, 197) + '...' : profile;
}

// Extract company snapshot from transcript
export function extractSnapshot(rawText: string): string {
  const match = rawText.match(/Company Snapshot([\s\S]*?)(?:\n{2,}|$)/i);
  return match ? match[1].trim() : "";
}

export async function extractRawText(buffer: Buffer): Promise<{ value: string, companySnapshot?: string }> {
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
    
    // Extract company snapshot before final cleaning (since we'll remove it in cleaning)
    const structuredSnapshot = extractSnapshot(value);
    const smartProfile = extractSmartCompanyProfile(value);
    
    // Combine structured and smart extraction
    let companySnapshot = '';
    if (structuredSnapshot && smartProfile) {
      companySnapshot = `${structuredSnapshot}. ${smartProfile}`;
    } else if (structuredSnapshot) {
      companySnapshot = structuredSnapshot;
    } else if (smartProfile) {
      companySnapshot = `Based on the conversation: ${smartProfile}`;
    }
    
    console.log('🏢 [DEBUG] Structured snapshot:', structuredSnapshot.slice(0, 100));
    console.log('🏢 [DEBUG] Smart profile:', smartProfile.slice(0, 100));
    console.log('🏢 [DEBUG] Final company snapshot:', companySnapshot.slice(0, 200));
    
    return { value: cleanedText, companySnapshot };
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