import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_ID      = process.env.FACEBOOK_PAGE_ID      || 'UttarakhandDIPR'
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN
const APP_ID       = process.env.FACEBOOK_APP_ID
const APP_SECRET   = process.env.FACEBOOK_APP_SECRET

export async function GET() {
  // Prefer User Access Token, fall back to App Access Token
  const accessToken = ACCESS_TOKEN || (APP_ID && APP_SECRET ? `${APP_ID}|${APP_SECRET}` : null)

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Facebook credentials not configured.' },
      { status: 503 }
    )
  }

  // Fetch latest 5 posts with attachments (photos)
  const fields = 'id,message,story,created_time,permalink_url,attachments{media,description,type}'
  const fbUrl  = `https://graph.facebook.com/v19.0/${PAGE_ID}/posts?fields=${fields}&limit=5&access_token=${accessToken}`

  let fbData: any
  try {
    const res = await fetch(fbUrl)
    fbData = await res.json()
    if (fbData.error) {
      return NextResponse.json({ error: fbData.error.message }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Facebook API call failed: ${err.message}` }, { status: 500 })
  }

  const posts: any[] = fbData.data ?? []
  if (posts.length === 0) {
    return NextResponse.json({ message: 'No posts found on the Facebook page', synced: 0 })
  }

  const supabase = createAdminClient()
  const results: { id: string; title: string; action: string }[] = []

  for (const post of posts) {
    const body = post.message || post.story || ''
    if (!body) continue

    const sourceUrl    = post.permalink_url || `https://www.facebook.com/${PAGE_ID}/posts/${post.id}`
    const attachment   = post.attachments?.data?.[0]
    const featuredImage= attachment?.media?.image?.src ?? null
    const title        = body.split('\n')[0].slice(0, 120) || 'Facebook Post'

    // Check if already imported (by source_url)
    const { data: existing } = await supabase
      .from('content_posts')
      .select('id')
      .eq('source_url', sourceUrl)
      .maybeSingle()

    if (existing) {
      results.push({ id: existing.id, title, action: 'skipped (already imported)' })
      continue
    }

    // Insert as a new content post
    const { data: inserted, error } = await supabase
      .from('content_posts')
      .insert({
        title,
        body,
        status:          'pending_review',
        platforms:       ['facebook'],
        source:          'facebook',
        source_url:      sourceUrl,
        featured_image:  featuredImage,
        verification_status: null,
      })
      .select('id')
      .single()

    if (error) {
      results.push({ id: '', title, action: `error: ${error.message}` })
    } else {
      results.push({ id: inserted.id, title, action: 'imported' })
    }
  }

  return NextResponse.json({
    message: 'Facebook sync complete',
    synced: results.filter(r => r.action === 'imported').length,
    results,
  })
}
