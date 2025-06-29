import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get the current user from the request
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          userId = user.id;
        }
      } catch (error) {
        console.error('❌ [DELETE] Auth error:', error);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, get the interview to check ownership and get blob URL
    const { data: interview, error: fetchError } = await supabase
      .from('interview_records')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', userId)
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
      .from('interview_records')
      .delete()
      .eq('id', interviewId)
      .eq('user_id', userId);

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