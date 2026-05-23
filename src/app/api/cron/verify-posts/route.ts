import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CHECK_SYSTEM = `You are a professional Hindi/English content proofreader for a government media agency.

Check the following post content for:
1. Spelling mistakes (in both Hindi and English if present)
2. Punctuation errors (wrong use of । , . ! ?)
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
- For Hindi text: check for correct use of पूर्ण विराम (।), missing spaces, and common Devanagari spelling errors`

const CORRECT_SYSTEM = `You are a grammar and punctuation editor for a government media agency.

Your ONLY job is to fix the errors listed below in the post. Do NOT change the meaning, tone, style, or structure. Only fix spelling mistakes, punctuation, grammar, and capitalization errors.

For Hindi text: use correct पूर्ण विराम (।), fix spacing issues, correct Devanagari spelling.

Return ONLY the corrected post text. Nothing else — no explanation, no JSON, no quotes.`

async function checkWithClaude(content: string): Promise<{ status: string; errors: string[] }> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      { role: 'user', content: `${CHECK_SYSTEM}\n\nContent to check:\n${content}` },
    ],
  })
  const raw = (msg.content[0] as any).text?.trim() ?? '{}'
  const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(jsonText)
}

async function checkWithGroq(content: string): Promise<{ status: string; errors: string[] }> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CHECK_SYSTEM },
      { role: 'user', content: content },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw)
}

async function correctWithClaude(body: string, errors: string[]): Promise<string | null> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: `${CORRECT_SYSTEM}\n\nErrors found:\n${errors.join('\n')}\n\nOriginal post:\n${body}` },
    ],
  })
  return (msg.content[0] as any).text?.trim() || null
}

async function correctWithGroq(body: string, errors: string[]): Promise<string | null> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CORRECT_SYSTEM },
      { role: 'user', content: `Errors found:\n${errors.join('\n')}\n\nOriginal post:\n${body}` },
    ],
    temperature: 0.1,
  })
  return completion.choices[0]?.message?.content?.trim() || null
}

async function checkContent(content: string): Promise<{ status: string; errors: string[]; engine: string }> {
  try {
    const result = await checkWithClaude(content)
    return { ...result, engine: 'claude' }
  } catch {
    const result = await checkWithGroq(content)
    return { ...result, engine: 'groq' }
  }
}

async function correctContent(body: string, errors: string[]): Promise<{ text: string | null; engine: string }> {
  try {
    const text = await correctWithClaude(body, errors)
    return { text, engine: 'claude' }
  } catch {
    const text = await correctWithGroq(body, errors)
    return { text, engine: 'groq' }
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

  const results: any[] = []

  for (const post of posts) {
    try {
      const content = [post.title, post.body].filter(Boolean).join('\n\n')
      const { status, errors, engine: checkEngine } = await checkContent(content)
      const hasErrors = status === 'has_errors' && errors?.length > 0
      const notes: string | null = hasErrors ? errors.join('\n') : null

      if (hasErrors) {
        const { text: corrected, engine: correctEngine } = await correctContent(post.body, errors)
        await supabase
          .from('content_posts')
          .update({
            verification_status: 'in_review',
            verification_notes: notes,
            ...(corrected ? { ai_corrected_body: corrected } : {}),
          })
          .eq('id', post.id)

        results.push({ id: post.id, status: 'in_review', errors: errors.length, corrected: !!corrected, engines: `${checkEngine}+${correctEngine}` })
      } else {
        await supabase
          .from('content_posts')
          .update({ verification_status: 'verified', verification_notes: null })
          .eq('id', post.id)

        results.push({ id: post.id, status: 'verified', errors: 0, engine: checkEngine })
      }
    } catch (err: any) {
      const errMsg = err?.message ?? String(err)
      await supabase
        .from('content_posts')
        .update({ verification_status: 'in_review', verification_notes: `Error: ${errMsg}` })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'in_review', errors: -1, error: errMsg })
    }
  }

  return NextResponse.json({
    message: 'Verification complete',
    processed: results.length,
    autoCorrected: results.filter(r => r.corrected).length,
    results,
  })
}
