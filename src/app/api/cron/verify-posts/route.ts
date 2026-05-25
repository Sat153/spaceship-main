import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CHECK_SYSTEM_GROQ = `You are a strict Hindi/English proofreader for a government media agency. You have deep knowledge of Hindi grammar and Devanagari script.

CRITICAL INSTRUCTION: Before reporting ANY error, VERIFY it actually exists in the text. Do NOT hallucinate errors. Only report errors you can quote the exact wrong text from.

WHAT NOT TO FLAG (these are all acceptable):
- Hashtags like #BJP4UK, #Uttarakhand, #CM etc. — hashtags NEVER need पूर्ण विराम (।) after them. This is standard social media formatting. Do NOT flag hashtags for missing punctuation.
- Em dash (—) used for stylistic pause or emphasis — this is acceptable in Hindi social media content. Do NOT flag it as a grammatical error.
- Transliterated English words in Hindi script (फॉरेस्ट, पुलिस, कैबिनेट, ट्रैक्टर, मुख्यमंत्री) — acceptable, do NOT flag.
- A sentence that already ends with "।" — do NOT flag it for missing or incorrect punctuation. Read carefully before flagging.
- Stylistic preferences (comma vs dash, word order variations) — these are NOT errors, do NOT flag them.

ONLY FLAG THESE REAL ERRORS:
1. English full stop (.) used AT THE END of a Hindi sentence instead of पूर्ण विराम (।) — ONLY if you literally see "." ending a Hindi sentence, not "।"
2. Space before पूर्ण विराम: "शब्द ।" — ONLY if you see an actual space before "।"
3. Clear matra errors: की/कि, में/मैं, है/हैं — ONLY if the wrong form is clearly used in context
4. Obvious verb-subject disagreement (e.g., plural verb with singular subject)
5. Same word repeated back-to-back accidentally, e.g. "है है" or "को को" — do NOT flag a sentence that appears once as a duplicate. Repeated sentences across different paragraphs are intentional emphasis, not errors.

RULES:
- If you are not 100% certain an error exists with proof from the text, do NOT include it.
- It is far better to return "verified" than to return false positives.
- Each error must include the exact wrong text quoted from the post.

Respond ONLY with valid JSON:
{
  "status": "verified" | "has_errors",
  "errors": ["exact wrong text: '...' — explanation of error"]
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

        // If corrector returns identical text, the errors were false positives — mark verified
        const isIdentical = corrected && corrected.trim() === post.body?.trim()
        if (isIdentical) {
          await supabase
            .from('content_posts')
            .update({ verification_status: 'verified', verification_notes: null })
            .eq('id', post.id)
          results.push({ id: post.id, status: 'verified (false positive)', errors: 0, engine: checkEngine })
        } else {
          await supabase
            .from('content_posts')
            .update({
              verification_status: 'in_review',
              verification_notes: notes,
              ...(corrected ? { ai_corrected_body: corrected } : {}),
            })
            .eq('id', post.id)
          results.push({ id: post.id, status: 'in_review', errors: errors.length, corrected: !!corrected, engines: `${checkEngine}+${correctEngine}` })
        }
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
