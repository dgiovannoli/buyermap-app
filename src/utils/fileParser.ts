import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedFileResult {
  text: string;
  fileType: string;
  error?: string;
}

function isReadableText(text: string): boolean {
  if (!text || text.length < 20) return false;
  // At least 80% printable ASCII, not mostly XML, not empty
  const printable = text.replace(/[\x20-\x7E]/g, '').length;
  const xmlLike = /<.*?>/.test(text);
  return (printable / text.length < 0.2) && !xmlLike;
}

/**
 * Extracts text content from PPTX XML using regex
 */
function extractTextFromPPTX(content: string): string {
  // Match text between tags, excluding tags themselves
  const textMatches = content.match(/>([^<]+)</g);
  if (!textMatches) return '';
  
  return textMatches
    .map(match => match.slice(1, -1)) // Remove < and >
    .filter(text => text.trim().length > 0) // Remove empty strings
    .join(' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Parses a File object and extracts text content based on file type.
 * Uses pdf-parse for PDFs, mammoth for DOCX, multiple approaches for PPTX, and simplified text extraction for other files.
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const fileType = file.type || file.name.split('.').pop()?.toLowerCase() || 'unknown';

  try {
    // Handle PDFs specifically
    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await import('pdf-parse');
        const data = await pdf.default(Buffer.from(buffer));
        const text = data.text;
        
        console.log('Extracted PDF text preview:', text.slice(0, 500));
        if (!isReadableText(text)) {
          console.warn('PDF parsing produced unreadable text');
          return { text: '', fileType: 'pdf', error: 'Unreadable PDF content' };
        }
        return { text, fileType: 'pdf' };
      } catch (error) {
        console.error('PDF parsing error:', error);
        return { text: '', fileType: 'pdf', error: 'Could not parse PDF file' };
      }
    }

    // Handle DOCX files specifically
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      try {
        console.log('Attempting to parse DOCX with mammoth...');
        const buffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        const extractedText = result.value;
        
        if (isReadableText(extractedText)) {
          console.log('Successfully extracted text from DOCX using mammoth');
          return { text: extractedText, fileType: 'docx' };
        }
        
        console.warn('DOCX parsing produced unreadable text');
        return { text: '', fileType: 'docx', error: 'Unreadable DOCX content' };
      } catch (error) {
        console.error('DOCX parsing error:', error);
        return { text: '', fileType: 'docx', error: 'Could not parse DOCX file' };
      }
    }

    // Handle PPTX files with multiple fallback approaches
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.endsWith('.pptx')
    ) {
      const buffer = await file.arrayBuffer();
      let extractedText = '';

      // Try mammoth first
      try {
        console.log('Attempting to parse PPTX with mammoth...');
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        extractedText = result.value;
        
        if (isReadableText(extractedText)) {
          console.log('Successfully extracted text using mammoth');
          return { text: extractedText, fileType: 'pptx' };
        }
        console.log('Mammoth extraction produced unreadable text, trying ZIP extraction...');
      } catch (error) {
        console.log('Mammoth parsing failed, trying ZIP extraction...', error);
      }

      // Try ZIP-based extraction
      try {
        console.log('Attempting ZIP-based extraction...');
        const JSZip = await import('jszip');
        const zip = new JSZip.default();
        const contents = await zip.loadAsync(buffer);
        let zipExtractedText = '';

        // Extract text from slide files
        for (const filename in contents.files) {
          if (filename.includes('slide') && filename.endsWith('.xml')) {
            const content = await contents.files[filename].async('text');
            zipExtractedText += extractTextFromPPTX(content) + ' ';
          }
        }

        if (isReadableText(zipExtractedText)) {
          console.log('Successfully extracted text using ZIP extraction');
          return { text: zipExtractedText.trim(), fileType: 'pptx' };
        }
        console.log('ZIP extraction produced unreadable text, trying basic text extraction...');
      } catch (error) {
        console.log('ZIP extraction failed, trying basic text extraction...', error);
      }

      // Try basic text extraction as last resort
      try {
        console.log('Attempting basic text extraction...');
        const text = await file.text();
        if (isReadableText(text) && !text.includes('ppt/') && !text.includes('xml')) {
          console.log('Successfully extracted text using basic extraction');
          return { text, fileType: 'pptx' };
        }
      } catch (error) {
        console.log('Basic text extraction failed...', error);
      }

      console.error('All PPTX parsing methods failed');
      return { text: '', fileType: 'pptx', error: 'Could not extract readable text from PPTX file' };
    }

    // Handle other files with simplified text extraction
    try {
      const text = await file.text();
      console.log('Extracted text preview:', text.slice(0, 500));
      
      // Additional check for binary/XML content
      if (text.includes('ppt/') || text.includes('xml') || !isReadableText(text)) {
        console.warn('File contains binary or unreadable content');
        return { text: '', fileType, error: 'File contains binary or unreadable content' };
      }
      
      return { text, fileType };
    } catch (error) {
      console.error('Text extraction error:', error);
      return { text: '', fileType, error: 'Could not extract text from file' };
    }
  } catch (error: any) {
    console.error('General parsing error:', error);
    return {
      text: '',
      fileType,
      error: error?.message || 'Failed to parse file.'
    };
  }
} 