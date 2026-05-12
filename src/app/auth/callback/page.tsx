'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState('Initializing...')
    const hasProcessed = useRef(false)

    useEffect(() => {
        // Prevent double processing
        if (hasProcessed.current) return
        hasProcessed.current = true

        const handleCallback = async () => {
            try {
                // Get hash from URL
                const hash = window.location.hash

                if (!hash || hash.length < 2) {
                    console.log('No hash found, checking for existing session...')
                    setStatus('Checking authentication...')

                    // Wait for auth context to potentially update
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    const supabase = createBrowserClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    )

                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                        console.log('Session found, redirecting...')
                        window.location.href = '/admin'
                        return
                    }

                    setError('No authentication tokens found. Please request a new invite.')
                    return
                }

                // Parse the hash fragment to check token type
                const params = new URLSearchParams(hash.substring(1))
                const accessToken = params.get('access_token')
                const refreshToken = params.get('refresh_token')
                const tokenType = params.get('type')

                console.log('Token extraction:', {
                    hasAccess: !!accessToken,
                    hasRefresh: !!refreshToken,
                    type: tokenType
                })

                if (!accessToken || !refreshToken) {
                    setError('Invalid authentication tokens. Please request a new invite.')
                    return
                }

                setStatus('Processing authentication...')

                // Create Supabase client and set session WITHOUT awaiting the Promise
                // because it conflicts with the auth context's onAuthStateChange
                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )

                // Start setSession but don't await it - let auth context handle the state
                supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                }).then(({ data, error: sessionError }) => {
                    if (sessionError) {
                        console.error('Session error (non-blocking):', sessionError)
                    } else {
                        console.log('Session set successfully (async):', data?.user?.email)
                    }
                })

                setStatus('Setting up your account...')

                // Wait a moment for the session to be established
                await new Promise(resolve => setTimeout(resolve, 1500))

                // Clear the hash from URL
                window.history.replaceState(null, '', window.location.pathname)

                // Determine where to redirect
                const isInvitedUser = tokenType === 'invite'
                const isPasswordRecovery = tokenType === 'recovery'
                const redirectPath = isInvitedUser ? '/auth/set-password' : isPasswordRecovery ? '/auth/reset-password' : '/admin'

                console.log('Redirecting to:', redirectPath)
                setStatus('Redirecting...')

                // Use window.location for hard navigation
                window.location.href = redirectPath

            } catch (err) {
                console.error('Callback error:', err)
                setError('An unexpected error occurred. Please try again.')
            }
        }

        handleCallback()
    }, [])

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="mx-auto mb-4 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">!</span>
                    </div>
                    <h1 className="text-xl font-semibold text-white mb-4">Authentication Error</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.href = '/auth/login'}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" />
                <p className="text-gray-400">{status}</p>
                <p className="text-gray-500 text-sm mt-2">Please wait...</p>
            </div>
        </div>
    )
}
