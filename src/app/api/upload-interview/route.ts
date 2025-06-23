import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { head } from '@vercel/blob';
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

        // ✅ Check if file already exists
        try {
          const existingBlob = await head(pathname);
          if (existingBlob) {
            // Parse client payload to check for overwrite preference
            const payload = clientPayload ? JSON.parse(clientPayload) : {};
            
            if (payload.allowOverwrite === true) {
              console.log(`🔄 Overwriting existing file: ${pathname}`);
              return {
                allowedContentTypes: [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain'
                ],
                allowOverwrite: true,
                tokenPayload: JSON.stringify({
                  uploadedBy: 'user-id',
                  uploadType: 'interview',
                  action: 'overwrite'
                }),
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
          console.log(`📁 New file upload: ${pathname}`);
        }

        // ✅ Here you could add auth checks
        // const user = await getCurrentUserServer();
        // if (!user) throw new Error('Unauthorized');

        // Parse client payload to check for addRandomSuffix preference
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        
        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
          ],
          addRandomSuffix: payload.addRandomSuffix || false,
          tokenPayload: JSON.stringify({
            uploadedBy: 'user-id', // Replace with actual user ID
            uploadType: 'interview',
            action: 'new'
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
      { error: error.message },
      { status: 400 }
    );
  }
} 