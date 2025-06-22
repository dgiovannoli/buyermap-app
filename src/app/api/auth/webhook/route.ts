import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Handle new user signups from Supabase auth.users table
    if (payload.type === 'INSERT' && payload.table === 'users') {
      await handleNewUserSignup(payload.record)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleNewUserSignup(user: any) {
  console.log('🎉 New user signed up:', user.email)
  
  // Send Slack notification
  await sendSlackNotification({
    text: `🎉 *New BuyerMap Beta User!*\n📧 Email: ${user.email}\n🕐 Signed up: ${new Date(user.created_at).toLocaleString()}\n🆔 User ID: \`${user.id}\``
  })
}

async function sendSlackNotification({ text }: { text: string }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.log('⚠️ SLACK_WEBHOOK_URL not configured')
    return
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    
    if (response.ok) {
      console.log('✅ Slack notification sent')
    } else {
      console.error('❌ Slack notification failed:', response.status)
    }
  } catch (error) {
    console.error('❌ Slack notification error:', error)
  }
} 