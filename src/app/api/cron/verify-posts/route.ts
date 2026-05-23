import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

const TEXT_PROMPT = `You are a professional Hindi/English content proofreader for a government media agency.

Check the following post content for:
1. Spelling mistakes (in both Hindi and English if present)
2. Punctuation errors
3. Grammar issues

Respond ONLY with valid JSON in this exact format:
{
  "status": "verified" | "has_errors",
  "errors": ["error 1", "error 2"]
}

- Use "verified" if the content is clean with no issues
- Use "has_errors" if you found any spelling, punctuation, or grammar mistakes
- List each specific error found in the "errors" array (empty array if verified)
- Be strict but fair — minor stylistic choices are NOT errors
- Transliterated English words in Hindi script (like फॉरेस्ट, पुलिस) are acceptable

Content to check:
`

const IMAGE_TEXT_PROMPT = `You are a professional content quality checker for a government media agency.

Analyze the attached image AND the text below. Check for:
1. Spelling mistakes in the text (Hindi and English)
2. Punctuation errors
3. Grammar issues
4. Photo quality — is the image clear and not blurry?
5. Photo appropriateness — is it suitable for official government media?

Respond ONLY with valid JSON in this exact format:
{
  "status": "verified" | "has_errors",
  "errors": ["error 1", "error 2"]
}

- Use "verified" if both text and photo are clean
- Use "has_errors" if any text OR photo issue found
- For photo issues prefix with "Photo: " (e.g. "Photo: Image is blurry")
- Transliterated English words in Hindi script are acceptable
- Be strict but fair

Text to check:
`

async function fetchImageForGemini(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://twitter.com/',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    // Skip images larger than 3MB to avoid Gemini payload limits
    if (buffer.byteLength > 3 * 1024 * 1024) return null
    return {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: res.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
    }
  } catch {
    return null
  }
}

export async function GET() {
  const supabase = createAdminClient()

  const { data: posts, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title, body, status, featured_image')
    .not('status', 'eq', 'draft')
    .is('verification_status', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: 'No unverified posts found', processed: 0 })
  }

  const results: { id: string; status: string; errors: number; imageChecked: boolean }[] = []

  for (const post of posts) {
    try {
      const content = [post.title, post.body].filter(Boolean).join('\n\n')

      // Try to fetch image for vision check
      let imgPart: { inlineData: { data: string; mimeType: string } } | null = null
      if (post.featured_image) {
        const img = await fetchImageForGemini(post.featured_image)
        if (img) imgPart = { inlineData: img }
      }

      const parts: any[] = imgPart
        ? [imgPart, { text: IMAGE_TEXT_PROMPT + content }]
        : [{ text: TEXT_PROMPT + content }]

      const result = await model.generateContent(parts)
      const raw = result.response.text().trim()
      const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
      const parsed = JSON.parse(jsonText)

      const status: 'verified' | 'has_errors' = parsed.status === 'has_errors' ? 'has_errors' : 'verified'
      const notes: string | null = parsed.errors?.length > 0 ? parsed.errors.join('\n') : null

      await supabase
        .from('content_posts')
        .update({ verification_status: status, verification_notes: notes })
        .eq('id', post.id)

      results.push({ id: post.id, status, errors: parsed.errors?.length ?? 0, imageChecked: !!imgPart })
    } catch {
      await supabase
        .from('content_posts')
        .update({ verification_status: 'in_review', verification_notes: 'Auto-verification failed — please review manually.' })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'in_review', errors: -1, imageChecked: false })
    }
  }

  return NextResponse.json({
    message: 'Verification complete',
    processed: results.length,
    withImageCheck: results.filter(r => r.imageChecked).length,
    results,
  })
}
