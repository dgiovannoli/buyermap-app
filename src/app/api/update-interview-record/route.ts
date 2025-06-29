import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';
import { Database } from '../../../types/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [DEBUG] Update interview record API called');

    const { 
      filename, 
      quotesExtracted, 
      processingTime, 
      uniqueSpeakers, 
      vectorsStored,
      status = 'completed',
      analysisResults
    } = await request.json();
    
    console.log('🔄 [DEBUG] Update data:', {
      filename,
      quotesExtracted,
      processingTime,
      uniqueSpeakersCount: uniqueSpeakers?.length || 0,
      vectorsStored,
      status,
      hasAnalysisResults: !!analysisResults
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

    // First, check for duplicate records and clean them up
    const { data: existingRecords, error: fetchError } = await supabase
      .from('user_interviews')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ [DEBUG] Failed to fetch existing records:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch existing records: ${fetchError.message}` },
        { status: 500 }
      );
    }

    console.log(`🔍 [DEBUG] Found ${existingRecords.length} records for filename: ${filename}`);

    if (existingRecords.length > 1) {
      console.log('🧹 [DEBUG] Cleaning up duplicate records...');
      
      // Keep the most recent record (first in the array since we ordered by created_at desc)
      const recordToKeep = existingRecords[0];
      const recordsToDelete = existingRecords.slice(1);
      
      // Delete the duplicate records
      const { error: deleteError } = await supabase
        .from('user_interviews')
        .delete()
        .in('id', recordsToDelete.map(r => r.id));
      
      if (deleteError) {
        console.error('❌ [DEBUG] Failed to delete duplicate records:', deleteError);
        return NextResponse.json(
          { error: `Failed to delete duplicate records: ${deleteError.message}` },
          { status: 500 }
        );
      }
      
      console.log(`✅ [DEBUG] Deleted ${recordsToDelete.length} duplicate records`);
    }

    // Update the remaining record (or create one if none exists)
    const updateData: any = {
      status,
      quotes_extracted: quotesExtracted || 0,
      processing_time: processingTime || 0,
      unique_speakers: uniqueSpeakers || [],
      vectors_stored: vectorsStored || 0,
      updated_at: new Date().toISOString()
    };
    
    // Add analysis results if provided (requires analysis_results column in database)
    if (analysisResults) {
      updateData.analysis_results = analysisResults;
      console.log('💾 [DEBUG] Storing analysis results in database');
    }
    
    // Check if record exists first, then update or insert
    const { data: existingRecord, error: checkError } = await supabase
      .from('user_interviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .single();

    let interview;
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if record doesn't exist
      console.error('❌ [DEBUG] Failed to check existing record:', checkError);
      return NextResponse.json(
        { error: `Failed to check existing record: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (existingRecord) {
      // Record exists, update it
      const { data: updatedRecord, error: updateError } = await supabase
        .from('user_interviews')
        .update(updateData)
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [DEBUG] Database update failed:', updateError);
        return NextResponse.json(
          { error: `Failed to update interview record: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      interview = updatedRecord;
    } else {
      // Record doesn't exist, insert it
      const { data: newRecord, error: insertError } = await supabase
        .from('user_interviews')
        .insert({
          user_id: user.id,
          filename: filename,
          ...updateData
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [DEBUG] Database insert failed:', insertError);
        return NextResponse.json(
          { error: `Failed to insert interview record: ${insertError.message}` },
          { status: 500 }
        );
      }
      
      interview = newRecord;
    }

    // Defensive: check interview object
    if (!interview || !('id' in interview)) {
      return NextResponse.json({ error: 'Interview record not returned' }, { status: 500 });
    }

    console.log('✅ [DEBUG] Interview record updated successfully:', interview.id);

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      message: 'Interview record updated successfully'
    });

  } catch (error) {
    console.error('❌ [DEBUG] Update interview record failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update interview record',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 