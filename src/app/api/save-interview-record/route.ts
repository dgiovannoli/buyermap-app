import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 [DEBUG] Save interview record API called');

    const { filename, contentHash, fileSize, blobUrl } = await request.json();
    
    console.log('💾 [DEBUG] Request data:', {
      filename,
      contentHash,
      fileSize,
      blobUrl: blobUrl?.substring(0, 50) + '...' // Truncate for logging
    });

    const supabase = await createServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ [DEBUG] User authentication failed:', userError);
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ [DEBUG] User authenticated:', user.id);

    // Insert interview record
    const { data: interview, error: insertError } = await supabase
      .from('user_interviews')
      .insert({
        user_id: user.id,
        filename,
        content_hash: contentHash,
        file_size: fileSize,
        blob_url: blobUrl,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [DEBUG] Database insert failed:', insertError);
      return NextResponse.json(
        { error: `Failed to save interview record: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [DEBUG] Interview record saved successfully:', interview.id);

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      message: 'Interview record saved successfully'
    });

  } catch (error) {
    console.error('❌ [DEBUG] Save interview record failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save interview record',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 