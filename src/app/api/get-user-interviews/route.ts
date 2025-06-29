import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('📚 [DEBUG] Get user interviews API called');
    
    // Use the server-side Supabase client
    const supabase = await createServerClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('👤 [DEBUG] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message
    });
    
    if (userError || !user) {
      console.error('❌ [DEBUG] User authentication failed:', userError);
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ [DEBUG] User authenticated:', user.id);

    // Fetch user's interviews with explicit field selection including blob_url
    const { data: interviews, error: fetchError } = await supabase
      .from('user_interviews')
      .select(`
        id,
        filename,
        upload_date,
        status,
        company_size,
        role,
        industry,
        region,
        quotes_extracted,
        processing_time,
        unique_speakers,
        vectors_stored,
        tags,
        blob_url,
        content_hash,
        file_size
      `)
      .eq('user_id', user.id)
      .order('upload_date', { ascending: false });

    if (fetchError) {
      console.error('❌ [DEBUG] Failed to fetch interviews:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch interviews: ${fetchError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [DEBUG] Fetched interviews:', {
      count: interviews?.length || 0,
      interviews: interviews?.map(i => ({ 
        id: i.id, 
        filename: i.filename, 
        status: i.status,
        hasBlobUrl: !!i.blob_url,
        blobUrl: i.blob_url ? `${i.blob_url.substring(0, 50)}...` : 'null'
      }))
    });

    return NextResponse.json({
      success: true,
      interviews: interviews || [],
      count: interviews?.length || 0
    });

  } catch (error) {
    console.error('❌ [DEBUG] Get user interviews failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch interviews',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 