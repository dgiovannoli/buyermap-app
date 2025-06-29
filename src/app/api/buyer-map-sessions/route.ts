import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';
import { Database } from '../../../types/supabase';

type BuyerMapSession = Database['public']['Tables']['buyer_map_sessions']['Row'];
type BuyerMapSessionInsert = Database['public']['Tables']['buyer_map_sessions']['Insert'];
type BuyerMapSessionUpdate = Database['public']['Tables']['buyer_map_sessions']['Update'];

// GET /api/buyer-map-sessions - List all sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isComplete = searchParams.get('is_complete');

    // Build query
    let query = supabase
      .from('buyer_map_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filter for completion status if specified
    if (isComplete !== null) {
      query = query.eq('is_complete', isComplete === 'true');
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in GET /api/buyer-map-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/buyer-map-sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_name, description, deck_filename, deck_blob_url } = body;

    if (!session_name) {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
    }

    const sessionData: BuyerMapSessionInsert = {
      user_id: user.id,
      session_name,
      description,
      deck_filename,
      deck_blob_url,
      current_step: 1,
      is_complete: false,
      validated_count: 0,
      partially_validated_count: 0,
      pending_count: 0,
      total_assumptions: 0
    };

    const { data: session, error } = await supabase
      .from('buyer_map_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/buyer-map-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/buyer-map-sessions - Update a session
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('buyer_map_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update the session
    const { data: session, error } = await supabase
      .from('buyer_map_sessions')
      .update({
        ...updateData,
        last_activity: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error in PUT /api/buyer-map-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/buyer-map-sessions - Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('buyer_map_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete the session (cascade will handle related records)
    const { error } = await supabase
      .from('buyer_map_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/buyer-map-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 