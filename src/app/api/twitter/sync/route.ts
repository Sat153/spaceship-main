import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacyredirect.com',
  'https://nitter.1d4.us',
  'https://nitter.cz',
  'https://nitter.net',
  'https://nitter.it',
  'https://nitter.nl',
  'https://nitter.mint.lgbt',
]

const SYNC_ACCOUNTS = [
  { username: 'DIPR_UK',      handle: 'dipr_uk',       label: 'DIPR Official'    },
  { username: 'pushkardhami', handle: 'pushkardhami',   label: 'CM Pushkar Dhami' },
  { username: 'bjp4uk',       handle: 'bjp4uk',         label: 'BJP Uttarakhand'  },
]

async function fetchNitterRSS(username: string): Promise<{ xml: string; instance: string } | null> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/${username}/rss`, {
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

function parseRSS(xml: string, instance: string, handle: string): ParsedTweet[] {
  const tweets: ParsedTweet[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

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
    const sourceUrl = `https://x.com/${handle}/status/${tweetId}`

    const rawDesc = extractTag(item, 'description')
    const text = rawDesc ? stripHtml(rawDesc) : stripHtml(extractTag(item, 'title').replace(/^[^:]+:\s*/, ''))
    if (!text || text.startsWith('RT @')) continue

    const mediaMatch = item.match(/media:content[^>]+url="([^"]+)"/i)
    const imgMatch = rawDesc.match(/<img[^>]+src="([^"]+)"/i)
    let rawImage = mediaMatch?.[1] ?? imgMatch?.[1] ?? null
    if (rawImage?.startsWith('/')) rawImage = `${instance}${rawImage}`
    const imageUrl = deproxyImage(rawImage)

    tweets.push({ tweetId, text, imageUrl, sourceUrl })
  }

  return tweets
}

export async function GET(req: NextRequest) {
  const accountFilter = req.nextUrl.searchParams.get('account')
  const accounts = accountFilter
    ? SYNC_ACCOUNTS.filter(a => a.handle === accountFilter)
    : SYNC_ACCOUNTS

  if (accounts.length === 0) {
    return NextResponse.json({ error: 'Unknown account' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const summary: Record<string, { synced: number; patched: number; found: number; instance?: string; error?: string }> = {}

  for (const account of accounts) {
    const result = await fetchNitterRSS(account.username)
    if (!result) {
      summary[account.handle] = { synced: 0, patched: 0, found: 0, error: 'Nitter unavailable — all instances failed' }
      continue
    }

    const tweets = parseRSS(result.xml, result.instance, account.handle)
    let synced = 0, patched = 0

    for (const tweet of tweets) {
      const title = tweet.text.split('\n')[0].slice(0, 120)

      const { data: existing } = await supabase
        .from('content_posts')
        .select('id')
        .eq('source_url', tweet.sourceUrl)
        .maybeSingle()

      if (existing) {
        if (tweet.imageUrl) {
          await supabase.from('content_posts')
            .update({ featured_image: tweet.imageUrl })
            .eq('id', existing.id)
          patched++
        }
        continue
      }

      const { error } = await supabase.from('content_posts').insert({
        title,
        body:                tweet.text,
        status:              'pending_review',
        platforms:           ['twitter'],
        source:              'twitter',
        source_url:          tweet.sourceUrl,
        featured_image:      tweet.imageUrl,
        verification_status: null,
      })

      if (!error) synced++
    }

    summary[account.handle] = { synced, patched, found: tweets.length, instance: result.instance }
  }

  const totalSynced = Object.values(summary).reduce((n, r) => n + r.synced, 0)

  return NextResponse.json({
    message: 'Twitter sync complete',
    synced: totalSynced,
    summary,
  })
}
