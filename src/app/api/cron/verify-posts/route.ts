import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

const VERIFICATION_PROMPT = `You are a professional Hindi/English content proofreader for a government media agency.

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

Content to check:
`

export async function GET() {
  const supabase = createAdminClient()

  // Fetch all posts that haven't been verified yet
  const { data: posts, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title, body, status')
    .not('status', 'eq', 'draft')
    .is('verification_status', null)
    .order('created_at', { ascending: false })
    .limit(20) // process up to 20 per run to stay within Gemini limits

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: 'No unverified posts found', processed: 0 })
  }

  const results: { id: string; status: string; errors: number }[] = []

  for (const post of posts) {
    try {
      const content = [post.title, post.body].filter(Boolean).join('\n\n')
      const prompt = VERIFICATION_PROMPT + content

      const result = await model.generateContent(prompt)
      const raw = result.response.text().trim()

      // Strip markdown code fences if Gemini wraps it
      const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
      const parsed = JSON.parse(jsonText)

      const status: 'verified' | 'has_errors' = parsed.status === 'has_errors' ? 'has_errors' : 'verified'
      const notes: string | null = parsed.errors?.length > 0 ? parsed.errors.join('\n') : null

      await supabase
        .from('content_posts')
        .update({ verification_status: status, verification_notes: notes })
        .eq('id', post.id)

      results.push({ id: post.id, status, errors: parsed.errors?.length ?? 0 })
    } catch (err: any) {
      // Mark as in_review if Gemini fails so it surfaces for manual check
      await supabase
        .from('content_posts')
        .update({ verification_status: 'in_review', verification_notes: 'Auto-verification failed — please review manually.' })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'in_review', errors: -1 })
    }
  }

  return NextResponse.json({ message: 'Verification complete', processed: results.length, results })
}
