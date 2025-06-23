import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest) {
  try {
    console.log('=== GENERATING DIRECT UPLOAD URL ===');
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: BLOB_READ_WRITE_TOKEN not found' },
        { status: 500 }
      );
    }
    console.log('✅ BLOB_READ_WRITE_TOKEN is available');
    
    const body = (await request.json()) as HandleUploadBody;
    
    console.log('Generating upload URL for client-side upload');
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log('Generating token for:', pathname);
        
        // Parse client payload to check for preferences
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
          addRandomSuffix: payload.addRandomSuffix !== undefined ? payload.addRandomSuffix : true, // Default to true for safety
          allowOverwrite: payload.allowOverwrite || false,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
    
  } catch (error: any) {
    console.error('Upload URL generation error:', error);
    
    return NextResponse.json(
      { error: `Upload URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 