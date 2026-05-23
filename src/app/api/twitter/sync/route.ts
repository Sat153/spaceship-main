import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TWITTER_USERNAME = 'dipr_uk'
const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacyredirect.com',
  'https://nitter.1d4.us',
  'https://nitter.cz',
]

async function fetchNitterRSS(): Promise<{ xml: string; instance: string } | null> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/${TWITTER_USERNAME}/rss`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS/1.0)' },
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const xml = await res.text()
        if (xml.includes('<item>')) return { xml, instance }
      }
    } catch { /* try next */ }
  }
  return null
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
  return m?.[1]?.trim() ?? ''
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Convert Nitter-proxied image URLs back to original pbs.twimg.com CDN URLs
function deproxyImage(url: string | null): string | null {
  if (!url) return null
  const picIdx = url.indexOf('/pic/')
  if (picIdx === -1) return url

  const encodedPath = url.slice(picIdx + 5)
  try {
    const decoded = decodeURIComponent(encodedPath)
    if (decoded.startsWith('https://') || decoded.startsWith('http://')) return decoded
    return `https://pbs.twimg.com/${decoded}`
  } catch {
    return url
  }
}

interface ParsedTweet {
  tweetId: string
  text: string
  imageUrl: string | null
  sourceUrl: string
}

function parseRSS(xml: string, instance: string): ParsedTweet[] {
  const tweets: ParsedTweet[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    // guid may be a bare numeric ID or a full URL — handle both
    const guid = extractTag(item, 'guid')
    const link = extractTag(item, 'link')

    let tweetId: string | null = null
    if (guid && /^\d+$/.test(guid.trim())) {
      tweetId = guid.trim()
    } else {
      const m = (guid || link).match(/\/status\/(\d+)/)
      if (m) tweetId = m[1]
    }
    if (!tweetId) continue
    const sourceUrl = `https://x.com/${TWITTER_USERNAME}/status/${tweetId}`

    // Get tweet text from description (strip HTML) then fall back to title
    const rawDesc = extractTag(item, 'description')
    const text = rawDesc ? stripHtml(rawDesc) : stripHtml(extractTag(item, 'title').replace(/^[^:]+:\s*/, ''))

    if (!text || text.startsWith('RT @')) continue

    // Image: try media:content url attr, then img src inside description
    const mediaMatch = item.match(/media:content[^>]+url="([^"]+)"/i)
    const imgMatch = rawDesc.match(/<img[^>]+src="([^"]+)"/i)
    let rawImage = mediaMatch?.[1] ?? imgMatch?.[1] ?? null
    if (rawImage?.startsWith('/')) rawImage = `${instance}${rawImage}`

    const imageUrl = deproxyImage(rawImage)

    tweets.push({ tweetId, text, imageUrl, sourceUrl })
  }

  return tweets
}

export async function GET() {
  const result = await fetchNitterRSS()

  if (!result) {
    return NextResponse.json(
      { error: 'Could not reach any Nitter instance. Try again later.' },
      { status: 503 }
    )
  }

  const tweets = parseRSS(result.xml, result.instance)

  if (tweets.length === 0) {
    return NextResponse.json({ message: 'No tweets found in RSS feed', synced: 0 })
  }

  const supabase = createAdminClient()
  const results: { id: string; title: string; action: string }[] = []

  for (const tweet of tweets) {
    const title = tweet.text.split('\n')[0].slice(0, 120)

    const { data: existing } = await supabase
      .from('content_posts')
      .select('id')
      .eq('source_url', tweet.sourceUrl)
      .maybeSingle()

    if (existing) {
      // Also patch the featured_image in case it was stored as a Nitter proxy URL
      if (tweet.imageUrl) {
        await supabase
          .from('content_posts')
          .update({ featured_image: tweet.imageUrl })
          .eq('id', existing.id)
      }
      results.push({ id: existing.id, title, action: 'skipped (already imported)' })
      continue
    }

    const { data: inserted, error } = await supabase
      .from('content_posts')
      .insert({
        title,
        body:                tweet.text,
        status:              'pending_review',
        platforms:           ['twitter'],
        source:              'twitter',
        source_url:          tweet.sourceUrl,
        featured_image:      tweet.imageUrl,
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
    message: 'Twitter sync complete (via Nitter RSS)',
    synced: results.filter(r => r.action === 'imported').length,
    patched: results.filter(r => r.action === 'skipped (already imported)').length,
    results,
  })
}
