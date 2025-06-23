import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

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
          addRandomSuffix: payload.addRandomSuffix || false,
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