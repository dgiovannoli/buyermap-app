import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';
import { Database } from '../../../types/supabase';
import { handle_file_upload, saveInterviewWithTracking } from '../../../lib/database-server';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 [DEBUG] Save interview record API called');

    const { filename, contentHash, fileSize, blobUrl, fileContent } = await request.json();
    
    console.log('💾 [DEBUG] Request data:', {
      filename,
      contentHash: contentHash?.substring(0, 16) + '...',
      fileSize,
      blobUrl: blobUrl?.substring(0, 50) + '...', // Truncate for logging
      hasFileContent: !!fileContent
    });

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

    // Use enhanced file upload handler for duplicate detection
    if (fileContent) {
      console.log('🔍 [FILE_TRACKING] Checking for duplicates using enhanced handler...');
      
      const fileInfo = { name: filename, size: fileSize, type: 'application/octet-stream' };
      const uploadResult = await handle_file_upload(fileInfo, fileContent, user.id, {
        allowOverwrite: false,
        checkGlobalDuplicates: false
      });
      
      console.log('🔍 [FILE_TRACKING] Upload check result:', {
        isDuplicate: uploadResult.isDuplicate,
        isConflict: uploadResult.isConflict,
        action: uploadResult.action
      });
      
      if (uploadResult.isDuplicate) {
        console.log('🔄 [FILE_TRACKING] Duplicate detected, returning existing file info');
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          existingFile: uploadResult.existingFile,
          message: 'File already exists, using existing record',
          action: 'use-existing'
        });
      }
      
      if (uploadResult.isConflict) {
        console.log('⚠️ [FILE_TRACKING] Filename conflict detected');
        return NextResponse.json({
          success: false,
          isConflict: true,
          existingFile: uploadResult.existingFile,
          message: 'Filename already exists, please rename or overwrite'
        }, { status: 409 });
      }
      
      // If no blob URL provided, this is just a duplicate check - don't save
      if (!blobUrl) {
        console.log('🔍 [FILE_TRACKING] Duplicate check only - no blob URL provided');
        return NextResponse.json({
          success: true,
          isDuplicate: false,
          isConflict: false,
          contentHash: uploadResult.contentHash,
          message: 'No duplicates found, ready for upload'
        });
      }
      
      // Use the content hash from the enhanced handler
      const finalContentHash = uploadResult.contentHash;
      
      // Save interview with enhanced tracking
      const interview = await saveInterviewWithTracking({
        filename,
        content_hash: finalContentHash,
        file_size: fileSize,
        blob_url: blobUrl,
        user_id: user.id,
        upload_date: new Date().toISOString(),
        status: 'processing',
        quotes_extracted: 0,
        processing_time: 0,
        unique_speakers: [],
        vectors_stored: 0,
      });

      console.log('✅ [FILE_TRACKING] Interview saved with enhanced tracking:', interview.id);

      return NextResponse.json({
        success: true,
        interviewId: interview.id,
        contentHash: finalContentHash,
        message: 'Interview record saved successfully with enhanced tracking'
      });
    } else {
      // Fallback to original method if no file content provided
      console.log('⚠️ [FILE_TRACKING] No file content provided, using fallback method');
      
      const now = new Date().toISOString();
      const insertObj: Database['public']['Tables']['user_interviews']['Insert'] = {
        user_id: user.id,
        filename,
        upload_date: now,
        status: 'completed',
        quotes_extracted: 0,
        processing_time: 0,
        unique_speakers: [],
        vectors_stored: 0,
      };
      if (contentHash) insertObj.content_hash = contentHash;
      if (fileSize) insertObj.file_size = fileSize;
      if (blobUrl) insertObj.blob_url = blobUrl;

      const { data: interview, error: insertError } = await supabase
        .from('user_interviews')
        .insert([insertObj as any])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [DEBUG] Database insert failed:', insertError);
        return NextResponse.json(
          { error: `Failed to save interview record: ${insertError.message}` },
          { status: 500 }
        );
      }

      if (!interview || !('id' in interview)) {
        return NextResponse.json({ error: 'Interview record not returned' }, { status: 500 });
      }

      console.log('✅ [DEBUG] Interview record saved successfully (fallback):', interview.id);

      return NextResponse.json({
        success: true,
        interviewId: interview.id,
        message: 'Interview record saved successfully (fallback method)'
      });
    }

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