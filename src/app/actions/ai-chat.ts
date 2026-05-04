'use server'

import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from 'groq-sdk'
import { getIntelligenceSummaryForAI } from './client-intelligence'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

// Initialize Groq (fallback)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
})

export interface ChatMessage {
    id?: string
    role: 'user' | 'model'
    content: string
    created_at?: string
}

// ============ PERSISTENCE FUNCTIONS ============

export async function loadChatHistory(clientId: string): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
    console.log('🔍 ACTION: loadChatHistory')
    try {
        const supabase = createClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data, error } = await supabase
            .from('client_chat_messages')
            .select('id, role, content, created_at')
            .eq('client_id', clientId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error loading chat history:', error)
            return { success: false, error: error.message }
        }

        return { success: true, messages: data || [] }
    } catch (error) {
        console.error('Error in loadChatHistory:', error)
        return { success: false, error: 'Failed to load chat history' }
    }
}

export async function saveChatMessage(
    clientId: string,
    message: ChatMessage
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const supabase = createClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data, error } = await supabase
            .from('client_chat_messages')
            .insert({
                client_id: clientId,
                user_id: user.id,
                role: message.role,
                content: message.content
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error saving chat message:', error)
            return { success: false, error: error.message }
        }

        return { success: true, id: data?.id }
    } catch (error) {
        console.error('Error in saveChatMessage:', error)
        return { success: false, error: 'Failed to save message' }
    }
}

export async function clearChatHistory(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { error } = await supabase
            .from('client_chat_messages')
            .delete()
            .eq('client_id', clientId)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error clearing chat history:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in clearChatHistory:', error)
        return { success: false, error: 'Failed to clear chat history' }
    }
}

// ============ AI CHAT FUNCTION ============

async function chatWithGroq(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const groqMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.content
        }))
    ]

    const completion = await groq.chat.completions.create({
        messages: groqMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024,
    })

    return completion.choices[0]?.message?.content || 'No response generated'
}

export async function chatWithClient(clientId: string, messages: ChatMessage[]) {
    try {
        // 1. Fetch Client Context
        const supabase = createAdminClient()
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single()

        if (clientError || !client) {
            return { error: 'Client not found' }
        }

        // 2. Fetch Recent Activity (Context)
        const { data: activities } = await supabase
            .from('client_activities')
            .select('activity_type, description, created_at')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(10)

        // 3. Fetch Client Intelligence (news, social posts, etc.)
        const intelligenceSummary = await getIntelligenceSummaryForAI(clientId)

        // 4. Construct System Prompt with Intelligence
        const systemPrompt = `
You are an AI assistant for the client "${client.name}".
Your goal is to help the account manager understand and manage this client.

**Client Context:**
- **Type:** ${client.client_type}
- **Industry:** ${client.industry || 'N/A'}
- **Status:** ${client.status}
- **Budget:** ${client.annual_budget_range || 'N/A'}
- **Tags:** ${client.tags ? client.tags.join(', ') : 'None'}
- **Notes:** ${client.internal_notes || 'No notes'}
- **Brief:** ${client.client_brief || 'No brief'}

**Social Media Profiles:**
- Instagram: ${client.social_instagram || 'N/A'}
- Twitter/X: ${client.social_twitter || 'N/A'}
- YouTube: ${client.social_youtube || 'N/A'}
- LinkedIn: ${client.social_linkedin || 'N/A'}
- Facebook: ${client.social_facebook || 'N/A'}
- TikTok: ${client.social_tiktok || 'N/A'}

**Recent Activity (Last 10 events):**
${activities?.map(a => `- [${new Date(a.created_at).toLocaleDateString()}] ${a.activity_type}: ${a.description}`).join('\n') || 'No recent activity.'}
${intelligenceSummary}
**Instructions:**
- Answer questions based on the context above, including news and intelligence.
- When discussing client communication style, refer to the news/intelligence data.
- Be concise and professional.
- If you don't know something, say "I don't have that information in the client records."
- Format your response in Markdown.
`

        // Try Gemini first, fallback to Groq if quota exceeded
        let response: string = ''

        if (process.env.GOOGLE_API_KEY) {
            try {
                // 4. Start Gemini Chat Session
                const chat = geminiModel.startChat({
                    history: [
                        {
                            role: 'user',
                            parts: [{ text: systemPrompt + "\n\n(Acknowledge context and wait for user query)" }],
                        },
                        {
                            role: 'model',
                            parts: [{ text: `Understood. I have context for ${client.name}. How can I assist you?` }],
                        },
                        ...messages.slice(0, -1).map(msg => ({ // Add previous history
                            role: msg.role,
                            parts: [{ text: msg.content }]
                        }))
                    ]
                })

                // 5. Send User Message
                const lastMessage = messages[messages.length - 1]
                const result = await chat.sendMessage(lastMessage.content)
                response = result.response.text()

            } catch (geminiError: any) {
                console.warn('Gemini API failed, falling back to Groq:', geminiError.message)

                // Fallback to Groq
                if (process.env.GROQ_API_KEY) {
                    response = await chatWithGroq(systemPrompt, messages)
                } else {
                    return { success: false, error: 'Both Gemini and Groq API keys are not available or quota exceeded' }
                }
            }
        } else if (process.env.GROQ_API_KEY) {
            // Use Groq directly if no Gemini key
            response = await chatWithGroq(systemPrompt, messages)
        } else {
            return { error: 'No AI API keys configured. Please set GOOGLE_API_KEY or GROQ_API_KEY in .env' }
        }

        return { success: true, response }

    } catch (error) {
        console.error('Chat Error:', error)
        return { success: false, error: 'Failed to generate response' }
    }
}
