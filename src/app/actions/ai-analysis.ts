'use server'

import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

interface AIAnalysisResult {
    summary: string | null
    error: string | null
}

import { createAdminClient } from "@/lib/supabase/admin"

export async function generateClientSummary(clientData: any, forceRegenerate = false): Promise<AIAnalysisResult> {
    try {
        // 1. Check if summary exists and we're not forcing regeneration
        if (clientData.ai_summary && !forceRegenerate) {
            return {
                summary: clientData.ai_summary,
                error: null
            }
        }

        const groqKey = process.env.GROQ_API_KEY
        if (!groqKey || groqKey.startsWith('placeholder')) {
            return { summary: null, error: 'GROQ_API_KEY is not configured. Add a real key to .env.local.' }
        }

        const prompt = `
      Analyze the following client profile and provide a concise, professional summary (max 3-4 sentences).
      Focus on their industry, key characteristics, and potential engagement opportunities.
      
      Client Name: ${clientData.name}
      Type: ${clientData.client_type}
      Industry: ${clientData.industry || 'Not specified'}
      Description: ${clientData.client_brief || 'No brief provided'}
      Notes: ${clientData.internal_notes || 'No notes provided'}
      Tags: ${clientData.tags ? clientData.tags.join(', ') : 'None'}
    `

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert business analyst assistant. Provide professional, insightful summaries of client profiles.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 300,
        })

        const summary = completion.choices[0]?.message?.content || 'No summary generated.'

        // 2. Save the summary to the database
        const supabaseAdmin = createAdminClient()
        const { error: updateError } = await supabaseAdmin
            .from('clients')
            .update({ ai_summary: summary })
            .eq('id', clientData.id)

        if (updateError) {
            console.error('Failed to save AI summary to database:', updateError)
            // We still return the summary even if saving failed
        }

        return {
            summary,
            error: null
        }
    } catch (error: any) {
        console.error('Error generating AI summary:', error)
        return {
            summary: null,
            error: error?.message || 'Failed to generate summary. Please try again later.'
        }
    }
}
