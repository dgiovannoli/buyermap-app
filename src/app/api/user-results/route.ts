import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

// --- If not present, create this table in Supabase:
// CREATE TABLE user_results (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid NOT NULL,
//   results jsonb NOT NULL,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now(),
//   UNIQUE(user_id)
// );

export async function GET(request: NextRequest) {
  const supabase = await createServerClient(request);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('user_results')
    .select('results, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, results: data?.results || null, updated_at: data?.updated_at });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient(request);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }
  const body = await request.json();
  const { results } = body;
  if (!results) {
    return NextResponse.json({ error: 'Missing results data' }, { status: 400 });
  }
  // Upsert results for this user
  const { error } = await supabase
    .from('user_results')
    .upsert({ user_id: user.id, results, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 