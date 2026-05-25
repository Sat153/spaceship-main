import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CHECK_SYSTEM_GROQ = `You are a strict Hindi/English proofreader for a government media agency. You have deep knowledge of Hindi grammar and Devanagari script.

CRITICAL INSTRUCTION: Before reporting ANY error, VERIFY it actually exists in the text. Do NOT hallucinate errors. Only report errors you can quote directly from the text.

Check the content for the following:

HINDI PUNCTUATION — verify carefully before flagging:
- English full stop (.) used INSTEAD of पूर्ण विराम (।) at sentence end — ONLY flag if you can see an actual "." at the end of a Hindi sentence. If the sentence already ends with "।", do NOT flag it.
- Space before पूर्ण विराम: "शब्द ।" is wrong — ONLY flag if you actually see a space before "।"
- Do NOT flag "।" as missing if it is already present in the text.

HINDI GRAMMAR — verify carefully:
- Matra errors: की/कि, में/मैं, है/हैं — ONLY flag if a clearly wrong form is used
- Verb-subject agreement: singular/plural, gender agreement
- Unnecessary word repetition
- Wrong case markers: ने, को, से, पर, में

ENGLISH (if present):
- Capitalization of proper nouns
- Subject-verb agreement

GENERAL:
- Extra spaces between words
- Duplicate punctuation (!!, ..)

IMPORTANT RULES:
- Em dash (—) usage in Hindi is stylistically acceptable. Do NOT flag it as an error unless it causes genuine grammatical confusion.
- Transliterated English words in Hindi script (फॉरेस्ट, पुलिस, कैबिनेट, ट्रैक्टर) are acceptable — do NOT flag these.
- If you are not 100% certain an error exists, do NOT include it.
- It is better to return "verified" with no errors than to return false positives.

Respond ONLY with valid JSON:
{
  "status": "verified" | "has_errors",
  "errors": ["quote the exact wrong text, then explain the error"]
}`

const CORRECT_SYSTEM_GROQ = `You are an expert Hindi/English editor for a government media agency.

Fix ONLY the specific errors listed. Rules:
- Replace English full stops (.) with पूर्ण विराम (।) at Hindi sentence endings
- Remove space before पूर्ण विराम: "शब्द ।" → "शब्द।"
- Fix matra errors: की/कि, में/मैं, है/हैं
- Fix verb-subject agreement
- Do NOT change any words, facts, names, numbers, or sentence structure
- Do NOT add or remove sentences
- Do NOT change the meaning or tone

CRITICAL: Return the corrected text EXACTLY ONCE. Do NOT repeat it. Do NOT add any heading, label, explanation, or separator. Output the corrected post one single time and stop.`

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

// Remove repeated blocks that LLaMA sometimes produces
function deduplicateOutput(text: string): string {
  const trimmed = text.trim()
  // Try splitting by double newline and check if blocks repeat
  const blocks = trimmed.split(/\n{2,}/)
  if (blocks.length >= 2) {
    const half = Math.floor(blocks.length / 2)
    const firstHalf = blocks.slice(0, half).join('\n\n').trim()
    const secondHalf = blocks.slice(half).join('\n\n').trim()
    if (firstHalf === secondHalf) return firstHalf
  }
  // Try exact half-string repeat
  const mid = Math.floor(trimmed.length / 2)
  if (trimmed.slice(0, mid).trim() === trimmed.slice(mid).trim()) {
    return trimmed.slice(0, mid).trim()
  }
  return trimmed
}

async function correctWithGroq(body: string, errors: string[]): Promise<string | null> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CORRECT_SYSTEM_GROQ },
      { role: 'user', content: `Errors to fix:\n${errors.join('\n')}\n\nOriginal post:\n${body}` },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  })
  const raw = completion.choices[0]?.message?.content?.trim() || null
  return raw ? deduplicateOutput(raw) : null
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
