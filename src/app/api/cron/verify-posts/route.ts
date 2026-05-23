import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CHECK_SYSTEM_GROQ = `You are a strict Hindi/English proofreader for a government media agency. You have deep knowledge of Hindi grammar and Devanagari script.

Check the content for ALL of the following:

HINDI-SPECIFIC RULES:
- पूर्ण विराम (।) must be used at sentence endings, NOT English full stop (.)
- No space before पूर्ण विराम (।) — "शब्द ।" is WRONG, "शब्द।" is correct
- Correct matra usage: की/कि, में/मैं, है/हैं, ने/में confusion
- Correct conjuncts and half-letters in Devanagari
- Verb-subject agreement: singular/plural, gender agreement
- No unnecessary repetition of words
- Correct use of ने, को, से, पर, में (case markers)
- Anusvara (ं) vs Anunasika (ँ) correct usage

ENGLISH-SPECIFIC RULES (if English text present):
- Correct capitalization of proper nouns
- No missing articles (a, an, the)
- Subject-verb agreement

GENERAL:
- No extra spaces between words
- No duplicate punctuation (!!, ..)
- Numbers written consistently

Respond ONLY with valid JSON:
{
  "status": "verified" | "has_errors",
  "errors": ["specific error description with location"]
}

- Transliterated English words in Hindi script (फॉरेस्ट, पुलिस, कैबिनेट) are acceptable — do NOT flag these`

const CORRECT_SYSTEM_GROQ = `You are an expert Hindi/English editor for a government media agency.

Fix ONLY the specific errors listed. Rules:
- Replace English full stops (.) with पूर्ण विराम (।) at Hindi sentence endings
- Remove space before पूर्ण विराम: "शब्द ।" → "शब्द।"
- Fix matra errors: की/कि, में/मैं, है/हैं
- Fix verb-subject agreement
- Do NOT change any words, facts, names, numbers, or sentence structure
- Do NOT add or remove sentences
- Do NOT change the meaning or tone

Return ONLY the corrected text. No explanation, no quotes, no JSON.`

async function checkWithGroq(content: string): Promise<{ status: string; errors: string[] }> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CHECK_SYSTEM_GROQ },
      { role: 'user', content: content },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw)
}

async function correctWithGroq(body: string, errors: string[]): Promise<string | null> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CORRECT_SYSTEM_GROQ },
      { role: 'user', content: `Errors to fix:\n${errors.join('\n')}\n\nOriginal post:\n${body}` },
    ],
    temperature: 0.1,
  })
  return completion.choices[0]?.message?.content?.trim() || null
}

async function checkContent(content: string): Promise<{ status: string; errors: string[]; engine: string }> {
  const result = await checkWithGroq(content)
  return { ...result, engine: 'groq' }
}

async function correctContent(body: string, errors: string[]): Promise<{ text: string | null; engine: string }> {
  const text = await correctWithGroq(body, errors)
  return { text, engine: 'groq' }
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
