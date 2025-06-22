import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Get the beta password from environment variables
    const betaPassword = process.env.BETA_ACCESS_PASSWORD
    
    if (!betaPassword) {
      console.error('BETA_ACCESS_PASSWORD not set in environment variables')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Simple password comparison
    const isValid = password === betaPassword
    
    return NextResponse.json({ success: isValid })
    
  } catch (error) {
    console.error('Error verifying beta password:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 