import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CHECK_PROMPT = `You are a professional Hindi/English content proofreader for a government media agency.

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

const CORRECT_PROMPT = `You are a grammar and punctuation editor for a government media agency.

Your ONLY job is to fix the errors listed below in the post. Do NOT change the meaning, tone, style, or structure. Only fix spelling mistakes, punctuation, grammar, and capitalization errors.

Return ONLY the corrected post text. Nothing else — no explanation, no JSON, no quotes.`

async function autoCorrect(body: string, errors: string[]): Promise<string | null> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CORRECT_PROMPT },
        { role: 'user', content: `Errors found:\n${errors.join('\n')}\n\nOriginal post:\n${body}` },
      ],
      temperature: 0.1,
    })
    const corrected = completion.choices[0]?.message?.content?.trim()
    return corrected || null
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

  const results: { id: string; status: string; errors: number; corrected?: boolean }[] = []

  for (const post of posts) {
    try {
      const content = [post.title, post.body].filter(Boolean).join('\n\n')

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CHECK_PROMPT },
          { role: 'user', content: content },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw)
      const hasErrors = parsed.status === 'has_errors' && parsed.errors?.length > 0
      const notes: string | null = hasErrors ? parsed.errors.join('\n') : null

      if (hasErrors) {
        // Auto-correct and put in_review for human review
        const corrected = await autoCorrect(post.body, parsed.errors)
        await supabase
          .from('content_posts')
          .update({
            verification_status: 'in_review',
            verification_notes: notes,
            ...(corrected ? { ai_corrected_body: corrected } : {}),
          })
          .eq('id', post.id)

        results.push({ id: post.id, status: 'in_review', errors: parsed.errors.length, corrected: !!corrected })
      } else {
        await supabase
          .from('content_posts')
          .update({ verification_status: 'verified', verification_notes: null })
          .eq('id', post.id)

        results.push({ id: post.id, status: 'verified', errors: 0 })
      }
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
    autoCorreected: results.filter(r => r.corrected).length,
    results,
  })
}
