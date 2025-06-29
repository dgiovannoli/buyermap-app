import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

export async function DELETE(request: NextRequest) {
  try {
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: 'Interview ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ [DELETE] Attempting to delete interview:', interviewId);

    // Use the server-side Supabase client (same as get-user-interviews)
    const supabase = await createServerClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ [DELETE] User authentication failed:', userError);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ [DELETE] User authenticated:', user.id);

    // First, get the interview to check ownership and get blob URL
    const { data: interview, error: fetchError } = await supabase
      .from('user_interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !interview) {
      console.error('❌ [DELETE] Interview not found or access denied:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Interview not found or access denied' },
        { status: 404 }
      );
    }

    console.log('🔍 [DELETE] Found interview to delete:', {
      id: interview.id,
      filename: interview.filename,
      blobUrl: interview.blob_url ? `${interview.blob_url.substring(0, 50)}...` : 'null'
    });

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_interviews')
      .delete()
      .eq('id', interviewId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ [DELETE] Database deletion failed:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete interview from database' },
        { status: 500 }
      );
    }

    // Note: We're not deleting the blob file from Vercel Blob storage
    // This is intentional to avoid potential issues with file references
    // The blob files will be cleaned up by Vercel's retention policies
    console.log('⚠️ [DELETE] Blob file not deleted from storage (intentional)');

    console.log('✅ [DELETE] Interview deleted successfully:', interviewId);

    return NextResponse.json({
      success: true,
      message: 'Interview deleted successfully',
      deletedInterview: {
        id: interview.id,
        filename: interview.filename
      }
    });

  } catch (error: any) {
    console.error('❌ [DELETE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 