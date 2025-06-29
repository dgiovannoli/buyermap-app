import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Test auth API called');
    
    // Use the server-side Supabase client
    const supabase = await createServerClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('👤 [TEST] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message
    });
    
    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: userError?.message || 'No user found',
        debug: {
          hasUser: false,
          userId: null,
          userEmail: null
        }
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      debug: {
        hasUser: true,
        userId: user.id,
        userEmail: user.email
      }
    });

  } catch (error) {
    console.error('❌ [TEST] Test auth failed:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          hasUser: false,
          userId: null,
          userEmail: null
        }
      },
      { status: 500 }
    );
  }
} 