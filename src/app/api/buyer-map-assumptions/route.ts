import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';
import { Database } from '../../../types/supabase';

type BuyerMapAssumption = Database['public']['Tables']['buyer_map_assumptions']['Row'];
type BuyerMapAssumptionInsert = Database['public']['Tables']['buyer_map_assumptions']['Insert'];

// GET /api/buyer-map-assumptions - Get assumptions for a session
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get assumptions with quotes
    const { data: assumptions, error } = await supabase
      .from('buyer_map_assumptions')
      .select(`
        *,
        buyer_map_quotes(*)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching assumptions:', error);
      return NextResponse.json({ error: 'Failed to fetch assumptions' }, { status: 500 });
    }

    return NextResponse.json({ assumptions });
  } catch (error) {
    console.error('Error in GET /api/buyer-map-assumptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/buyer-map-assumptions - Create assumptions for a session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, assumptions } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!assumptions || !Array.isArray(assumptions)) {
      return NextResponse.json({ error: 'Assumptions array is required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('buyer_map_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Prepare assumptions data
    const assumptionsData: BuyerMapAssumptionInsert[] = assumptions.map((assumption: any) => ({
      session_id,
      user_id: user.id,
      icp_attribute: assumption.icpAttribute || assumption.icp_attribute || '',
      icp_theme: assumption.icpTheme || assumption.icp_theme || '',
      v1_assumption: assumption.v1Assumption || assumption.v1_assumption || '',
      why_assumption: assumption.whyAssumption || assumption.why_assumption,
      evidence_from_deck: assumption.evidenceFromDeck || assumption.evidence_from_deck,
      reality_from_interviews: assumption.realityFromInterviews || assumption.reality_from_interviews,
      reality: assumption.reality,
      comparison_outcome: assumption.comparisonOutcome || assumption.comparison_outcome || 'pending',
      ways_to_adjust_messaging: assumption.waysToAdjustMessaging || assumption.ways_to_adjust_messaging,
      confidence_score: assumption.confidenceScore || assumption.confidence_score || 0,
      confidence_explanation: assumption.confidenceExplanation || assumption.confidence_explanation || '',
      confidence_breakdown: assumption.confidenceBreakdown || assumption.confidence_breakdown,
      validation_status: assumption.validationStatus || assumption.validation_status || 'pending',
      display_outcome: assumption.displayOutcome || assumption.display_outcome,
      display_reality: assumption.displayReality || assumption.display_reality,
      display_confidence: assumption.displayConfidence || assumption.display_confidence,
      quotes_count: assumption.quotes?.length || 0,
      has_interview_data: !!(assumption.quotes && assumption.quotes.length > 0)
    }));

    // Insert assumptions
    const { data: insertedAssumptions, error } = await supabase
      .from('buyer_map_assumptions')
      .insert(assumptionsData)
      .select();

    if (error) {
      console.error('Error creating assumptions:', error);
      return NextResponse.json({ error: 'Failed to create assumptions' }, { status: 500 });
    }

    // Update session with assumption count
    await supabase
      .from('buyer_map_sessions')
      .update({ 
        total_assumptions: assumptions.length,
        last_activity: new Date().toISOString()
      })
      .eq('id', session_id);

    return NextResponse.json({ assumptions: insertedAssumptions }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/buyer-map-assumptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/buyer-map-assumptions - Update assumptions
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, assumptions } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!assumptions || !Array.isArray(assumptions)) {
      return NextResponse.json({ error: 'Assumptions array is required' }, { status: 400 });
    }

    // Update each assumption
    const updatedAssumptions = [];
    for (const assumption of assumptions) {
      if (!assumption.id) continue;

      const { data: updatedAssumption, error } = await supabase
        .from('buyer_map_assumptions')
        .update({
          icp_attribute: assumption.icpAttribute || assumption.icp_attribute,
          icp_theme: assumption.icpTheme || assumption.icp_theme,
          v1_assumption: assumption.v1Assumption || assumption.v1_assumption,
          why_assumption: assumption.whyAssumption || assumption.why_assumption,
          evidence_from_deck: assumption.evidenceFromDeck || assumption.evidence_from_deck,
          reality_from_interviews: assumption.realityFromInterviews || assumption.reality_from_interviews,
          reality: assumption.reality,
          comparison_outcome: assumption.comparisonOutcome || assumption.comparison_outcome,
          ways_to_adjust_messaging: assumption.waysToAdjustMessaging || assumption.ways_to_adjust_messaging,
          confidence_score: assumption.confidenceScore || assumption.confidence_score,
          confidence_explanation: assumption.confidenceExplanation || assumption.confidence_explanation,
          confidence_breakdown: assumption.confidenceBreakdown || assumption.confidence_breakdown,
          validation_status: assumption.validationStatus || assumption.validation_status,
          display_outcome: assumption.displayOutcome || assumption.display_outcome,
          display_reality: assumption.displayReality || assumption.display_reality,
          display_confidence: assumption.displayConfidence || assumption.display_confidence,
          quotes_count: assumption.quotes?.length || 0,
          has_interview_data: !!(assumption.quotes && assumption.quotes.length > 0)
        })
        .eq('id', assumption.id)
        .eq('user_id', user.id)
        .eq('session_id', session_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assumption:', error);
        continue;
      }

      updatedAssumptions.push(updatedAssumption);
    }

    // Update session last activity
    await supabase
      .from('buyer_map_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session_id);

    return NextResponse.json({ assumptions: updatedAssumptions });
  } catch (error) {
    console.error('Error in PUT /api/buyer-map-assumptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 