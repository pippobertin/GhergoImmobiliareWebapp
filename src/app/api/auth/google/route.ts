import { NextResponse } from 'next/server'
import { createOAuth2Client, getAuthUrl, ALL_SCOPES } from '@/lib/google-auth'

export async function GET() {
  try {
    console.log('🔐 Initiating Google OAuth flow')

    const oauth2Client = createOAuth2Client()
    const authUrl = getAuthUrl(oauth2Client, ALL_SCOPES)

    console.log('🔗 Generated auth URL:', authUrl)

    return NextResponse.json({
      authUrl,
      message: 'Redirect to this URL to authenticate'
    })

  } catch (error) {
    console.error('❌ OAuth initiation error:', error)
    return NextResponse.json({
      error: 'Failed to initiate OAuth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}