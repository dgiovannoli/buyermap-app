import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'SLACK_WEBHOOK_URL not configured' },
        { status: 500 }
      )
    }
    
    // Send test notification
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🧪 *BuyerMap Webhook Test*\n✅ Webhook endpoint is working!\n🕐 Test time: ${new Date().toLocaleString()}`
      }),
    })
    
    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent to Slack!' 
      })
    } else {
      return NextResponse.json(
        { error: `Slack API error: ${response.status}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    )
  }
} 