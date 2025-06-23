import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // ✅ Validate file type
        if (!/\.(pdf|doc|docx|txt)$/i.test(pathname)) {
          throw new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed for interviews.');
        }

        // ✅ Here you could add auth checks
        // const user = await getCurrentUserServer();
        // if (!user) throw new Error('Unauthorized');

        // Parse client payload to check for preferences
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        
        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
          ],
          addRandomSuffix: payload.addRandomSuffix || false,
          allowOverwrite: payload.allowOverwrite || false,
          tokenPayload: JSON.stringify({
            uploadedBy: 'user-id', // Replace with actual user ID
            uploadType: 'interview',
            action: payload.allowOverwrite ? 'overwrite' : 'new'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('🎙️ Interview blob upload completed!', blob, tokenPayload);
        // Here you can run any side effects like logging to database
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('❌ Interview upload error:', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
} 