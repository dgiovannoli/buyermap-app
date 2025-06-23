import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { head } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('=== GENERATING DIRECT UPLOAD URL ===');
    
    const body = (await request.json()) as HandleUploadBody;
    
    console.log('Generating upload URL for client-side upload');
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log('Generating token for:', pathname);
        
        // ✅ Check if file already exists
        try {
          const existingBlob = await head(pathname);
          if (existingBlob) {
            // Parse client payload to check for overwrite preference
            const payload = clientPayload ? JSON.parse(clientPayload) : {};
            
            if (payload.allowOverwrite === true) {
              console.log(`🔄 Overwriting existing deck: ${pathname}`);
              return {
                allowedContentTypes: [
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ],
                maximumSizeInBytes: 100 * 1024 * 1024, // 100MB limit
                allowOverwrite: true,
              };
            } else {
              // File exists and user hasn't confirmed overwrite
              throw new Error(`FILE_EXISTS:${existingBlob.url}`);
            }
          }
        } catch (error: any) {
          if (error.message?.startsWith('FILE_EXISTS:')) {
            throw error; // Re-throw file exists error
          }
          // File doesn't exist (head() threw BlobNotFoundError), continue with upload
          console.log(`📁 New deck upload: ${pathname}`);
        }
        
        // Parse client payload to check for addRandomSuffix preference
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        
        return {
          allowedContentTypes: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB limit
          addRandomSuffix: payload.addRandomSuffix || false,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
    
  } catch (error: any) {
    console.error('Upload URL generation error:', error);
    
    // Handle file exists error specially
    if (error.message?.startsWith('FILE_EXISTS:')) {
      const existingUrl = error.message.replace('FILE_EXISTS:', '');
      return NextResponse.json(
        { 
          error: 'FILE_EXISTS',
          existingUrl,
          message: 'A file with this name already exists. Would you like to use the existing file or overwrite it?'
        },
        { status: 409 } // Conflict status
      );
    }
    
    return NextResponse.json(
      { error: `Upload URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 