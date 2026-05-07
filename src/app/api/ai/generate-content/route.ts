import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// Platform-specific guidelines
const PLATFORM_GUIDELINES: Record<string, string> = {
    twitter: `Twitter/X Guidelines:
- Maximum 280 characters
- Use 1-3 relevant hashtags
- Be concise, punchy, and direct
- Use threads for longer content
- Engage with trending topics when relevant`,

    instagram: `Instagram Guidelines:
- Visual-first platform, describe the image/video concept
- Use 5-15 relevant hashtags
- Include a compelling caption
- Use line breaks for readability
- Add a call-to-action (like, comment, share)`,

    facebook: `Facebook Guidelines:
- Can be longer form (up to 500 chars recommended)
- Encourage engagement through questions
- Use emojis sparingly but effectively
- Link to website/articles when relevant`,

    linkedin: `LinkedIn Guidelines:
- Professional and thought-leadership focused
- Can be longer form (up to 1300 chars)
- Use bullet points for readability
- Include industry insights
- End with a question to drive engagement`,

    youtube: `YouTube Guidelines:
- Focus on video title and description
- Include relevant keywords for SEO
- Add timestamps if describing long-form content
- Include call-to-action (subscribe, like, comment)`
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { clientId, prompt, platforms } = body

        if (!clientId || !prompt) {
            return NextResponse.json({ error: 'clientId and prompt are required' }, { status: 400 })
        }

        // Fetch client info for context
        const { data: client } = await supabase
            .from('clients')
            .select('name, display_name, ai_summary, internal_notes, social_twitter, social_instagram, social_linkedin, client_type, manifesto_priorities')
            .eq('id', clientId)
            .single()

        // Fetch client demographics (for politician clients)
        const { data: demographics } = await supabase
            .from('client_demographics')
            .select('*')
            .eq('client_id', clientId)
            .single()

        // Fetch client's verified intelligence (news + Twitter posts)
        const { data: intelligence } = await supabase
            .from('client_intelligence')
            .select('source_type, title, content, source_name')
            .eq('client_id', clientId)
            .eq('is_verified', true)
            .order('published_at', { ascending: false })
            .limit(15)

        // Separate Twitter posts and news for different context
        const twitterPosts = intelligence?.filter(i => i.source_type === 'twitter') || []
        const newsItems = intelligence?.filter(i => i.source_type === 'news' || i.source_type === 'youtube') || []

        // Build writing style context from Twitter posts
        let writingStyleContext = ''
        if (twitterPosts.length > 0) {
            const samplePosts = twitterPosts.slice(0, 5).map(p => `- "${p.content || p.title}"`).join('\n')
            writingStyleContext = `
## Client's Writing Style (from their recent posts):
${samplePosts}

IMPORTANT: Mimic this writing style - the tone, vocabulary, and structure they use. The post should sound like THEY wrote it, not a generic social media manager.`
        }

        // Build recent news context
        let newsContext = ''
        if (newsItems.length > 0) {
            const recentNews = newsItems.slice(0, 5).map(n => `- ${n.title}`).join('\n')
            newsContext = `
## Recent News/Updates about ${client?.name || 'the client'}:
${recentNews}`
        }

        // Build platform-specific guidelines
        const selectedPlatforms = platforms || []
        let platformGuidelines = ''
        if (selectedPlatforms.length > 0) {
            platformGuidelines = selectedPlatforms
                .map((p: string) => PLATFORM_GUIDELINES[p.toLowerCase()])
                .filter(Boolean)
                .join('\n\n')
        }

        // Build demographic context for politicians
        let demographicsContext = ''
        if (demographics) {
            const parts = []
            if (demographics.state) parts.push(`State: ${demographics.state}`)
            if (demographics.constituency_name) parts.push(`Constituency: ${demographics.constituency_name}`)
            if (demographics.total_population) parts.push(`Population: ${demographics.total_population.toLocaleString()}`)
            if (demographics.urban_percentage && demographics.rural_percentage) {
                parts.push(`Urban/Rural: ${demographics.urban_percentage}% / ${demographics.rural_percentage}%`)
            }
            if (demographics.male_percentage && demographics.female_percentage) {
                parts.push(`Gender: ${demographics.male_percentage}% male / ${demographics.female_percentage}% female`)
            }
            if (demographics.literacy_rate) parts.push(`Literacy: ${demographics.literacy_rate}%`)
            if (demographics.primary_languages?.length) parts.push(`Languages: ${demographics.primary_languages.join(', ')}`)
            if (demographics.top_issues?.length) parts.push(`Key Issues: ${demographics.top_issues.join(', ')}`)
            if (demographics.major_festivals?.length) parts.push(`Major Festivals: ${demographics.major_festivals.join(', ')}`)
            if (demographics.cultural_notes) parts.push(`Cultural Notes: ${demographics.cultural_notes}`)

            if (parts.length > 0) {
                demographicsContext = `
## Constituency Demographics & Context:
${parts.map(p => `- ${p}`).join('\n')}

Use this demographic data to make content more relevant and localized. Reference issues, languages, and cultural events relevant to the constituency.`
            }
        }

        // Build manifesto priorities context
        let manifestoContext = ''
        const manifestoPriorities = client?.manifesto_priorities as Array<{ theme: string, weight: number }> || []
        if (manifestoPriorities.length > 0) {
            const sortedPriorities = [...manifestoPriorities].sort((a, b) => b.weight - a.weight)
            const priorityList = sortedPriorities.map(p => `- ${p.theme}: ${p.weight}%`).join('\n')
            manifestoContext = `
## Manifesto Priorities (ordered by importance):
${priorityList}

IMPORTANT: Emphasize themes based on their weight. Higher weighted themes should be more prominent in messaging. The highest priority theme (${sortedPriorities[0]?.theme}) should be the default focus unless the prompt specifies otherwise.`
        }

        // Build comprehensive client context
        const clientContext = client ? `
## Client Profile:
- Name: ${client.name}${client.display_name ? ` (${client.display_name})` : ''}
- Type: ${client.client_type || 'general'}
- Handles: ${[client.social_twitter, client.social_instagram, client.social_linkedin].filter(Boolean).join(', ') || 'N/A'}
${client.ai_summary ? `- Background: ${client.ai_summary.substring(0, 800)}` : ''}
${client.internal_notes ? `- Notes: ${client.internal_notes.substring(0, 300)}` : ''}` : ''

        // Build explicit platform list for output
        const platformLabels = selectedPlatforms.map((p: string) => {
            const platform = PLATFORM_GUIDELINES[p.toLowerCase()]
            return platform ? p.charAt(0).toUpperCase() + p.slice(1) : p
        })

        const systemPrompt = `You are a ghostwriter creating social media content for ${client?.name || 'a client'}. Your job is to create posts that sound EXACTLY like the client wrote them personally - authentic, genuine, and in their voice.

${clientContext}
${demographicsContext}
${manifestoContext}
${writingStyleContext}
${newsContext}

## IMPORTANT: You must create content for EXACTLY these platforms and NO OTHERS: ${platformLabels.join(', ')}

${platformGuidelines}

## Critical Instructions:
1. MATCH THE CLIENT'S VOICE - If you have examples of their posts, mimic their exact tone, vocabulary, and style
2. BE AUTHENTIC - The post should feel personal, not corporate or generic
3. BE SPECIFIC - Reference real topics, events, or themes relevant to the client
4. USE DEMOGRAPHIC CONTEXT - If constituency data is provided, make content locally relevant
5. FOLLOW MANIFESTO PRIORITIES - Emphasize themes based on their weights
6. NO META-COMMENTARY - Output ONLY the post content, no explanations
7. Create content for ONLY the platforms listed above (${platformLabels.join(', ')}). Do NOT add extra platforms.
8. ${selectedPlatforms.length > 1 ? `Format with labels for each platform:

${selectedPlatforms.map((p: string) => `**${p.charAt(0).toUpperCase() + p.slice(1)}:**
[post content for ${p}]`).join('\n\n')}` : 'Output just the post content directly without platform labels.'}

Now create a post based on this request:`

        // Generate content — Gemini primary, Groq fallback
        let generatedContent = ''

        if (process.env.GOOGLE_API_KEY) {
            try {
                const result = await geminiModel.generateContent(systemPrompt + '\n\n' + prompt)
                generatedContent = result.response.text().trim()
            } catch (geminiErr: any) {
                console.warn('[Content Gen] Gemini failed, falling back to Groq:', geminiErr.message)
                const completion = await groq.chat.completions.create({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 800,
                    temperature: 0.7,
                })
                generatedContent = completion.choices[0]?.message?.content?.trim() || ''
            }
        } else {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.7,
            })
            generatedContent = completion.choices[0]?.message?.content?.trim() || ''
        }

        return NextResponse.json({
            success: true,
            content: generatedContent,
            title: null,
            context: {
                twitterPostsUsed: twitterPosts.length,
                newsItemsUsed: newsItems.length,
                platforms: selectedPlatforms
            }
        })

    } catch (error) {
        console.error('Error generating content:', error)
        return NextResponse.json(
            { error: 'Failed to generate content' },
            { status: 500 }
        )
    }
}

