import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are a professional Hindi/English content proofreader for a government media agency.

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
- Transliterated English words in Hindi script (like फॉरेस्ट, पुलिस) are acceptable`

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

  const results: { id: string; status: string; errors: number }[] = []

  for (const post of posts) {
    try {
      const content = [post.title, post.body].filter(Boolean).join('\n\n')

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: content },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw)

      const status: 'verified' | 'has_errors' = parsed.status === 'has_errors' ? 'has_errors' : 'verified'
      const notes: string | null = parsed.errors?.length > 0 ? parsed.errors.join('\n') : null

      await supabase
        .from('content_posts')
        .update({ verification_status: status, verification_notes: notes })
        .eq('id', post.id)

      results.push({ id: post.id, status, errors: parsed.errors?.length ?? 0 })
    } catch (err: any) {
      const errMsg = err?.message ?? String(err)
      await supabase
        .from('content_posts')
        .update({ verification_status: 'in_review', verification_notes: `Error: ${errMsg}` })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'in_review', errors: -1, error: errMsg } as any)
    }
  }

  return NextResponse.json({
    message: 'Verification complete',
    processed: results.length,
    results,
  })
}
