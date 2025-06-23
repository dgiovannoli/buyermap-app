import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    console.log('🔄 Processing interview upload request');

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        console.log('🔐 Generating interview token for:', { pathname, multipart });
        
        // Allow overwrite if specified in client payload
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const allowOverwrite = payload.allowOverwrite === true;

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ],
          addRandomSuffix: true,
          allowOverwrite,
          // Optimize cache for better performance
          cacheControlMaxAge: 31536000, // 1 year cache
          // Enable larger file uploads for interviews
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB limit
          tokenPayload: JSON.stringify({
            uploadTime: Date.now(),
            allowOverwrite
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ Interview upload completed:', {
          url: blob.url,
          contentType: blob.contentType
        });

        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          const uploadDuration = Date.now() - (payload.uploadTime || 0);
          console.log(`📊 Interview upload metrics: ${uploadDuration}ms total time`);
        } catch (error) {
          console.warn('Failed to parse token payload:', error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('❌ Interview upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 