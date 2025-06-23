import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    console.log('🔄 Processing upload request for deck');

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        console.log('🔐 Generating token for:', { pathname, multipart });
        
        // Allow overwrite if specified in client payload
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const allowOverwrite = payload.allowOverwrite === true;

        return {
          allowedContentTypes: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/pdf'
          ],
          addRandomSuffix: true,
          allowOverwrite,
          // Optimize cache for better performance
          cacheControlMaxAge: 31536000, // 1 year cache
          // Enable compression for better transfer speeds
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB limit
          tokenPayload: JSON.stringify({
            uploadTime: Date.now(),
            allowOverwrite
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ Upload completed:', {
          url: blob.url,
          contentType: blob.contentType
        });

        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          const uploadDuration = Date.now() - (payload.uploadTime || 0);
          console.log(`📊 Upload metrics: ${uploadDuration}ms total time`);
        } catch (error) {
          console.warn('Failed to parse token payload:', error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 