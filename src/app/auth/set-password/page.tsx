'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, CheckCircle, UserPlus } from "lucide-react"
import Logo from "@/components/Logo"
import { supabase } from "@/lib/supabase"
import { mapErrorToUserMessage, validatePassword } from "@/lib/errors"

export default function SetPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [validSession, setValidSession] = useState<boolean | null>(null)
    const [userName, setUserName] = useState("")

    const router = useRouter()

    useEffect(() => {
        // Check if we have a valid session from the invite
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                setValidSession(true)
                // Get user name from metadata
                const firstName = session.user.user_metadata?.first_name || ''
                const lastName = session.user.user_metadata?.last_name || ''
                setUserName(`${firstName} ${lastName}`.trim() || session.user.email || 'User')
            } else {
                setValidSession(false)
            }
        }

        checkSession()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        // Validate password
        const passwordError = validatePassword(password)
        if (passwordError) {
            setError(passwordError)
            setLoading(false)
            return
        }

        // Check password confirmation
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                const userError = mapErrorToUserMessage(updateError)
                setError(userError.message)
            } else {
                setSuccess(true)
                // Redirect based on role
                const role = (await supabase.auth.getUser()).data.user?.user_metadata?.role
                setTimeout(() => {
                    router.push(role === 'client' ? '/client' : '/admin')
                }, 2000)
            }
        } catch (error) {
            const userError = mapErrorToUserMessage(error)
            setError(userError.message)
        } finally {
            setLoading(false)
        }
    }

    // Show loading while checking session validity
    if (validSession === null) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" />
                    <p className="text-gray-400">Setting up your account...</p>
                </div>
            </div>
        )
    }

    // Show error if session is invalid
    if (validSession === false) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Logo size="lg" />
                    </div>

                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader className="text-center">
                            <CardTitle className="text-white">Invalid Invite Link</CardTitle>
                            <CardDescription className="text-gray-400">
                                This invite link is invalid or has expired.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-gray-400 mb-4">
                                Please contact your administrator to receive a new invite.
                            </p>
                            <Button
                                onClick={() => router.push('/auth/login')}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Go to Login
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Show success message
    if (success) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Logo size="lg" />
                    </div>

                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle className="text-white">Welcome Aboard! 🎉</CardTitle>
                            <CardDescription className="text-gray-400">
                                Your account is ready. Redirecting to dashboard...
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" />
                </div>

                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-white">Welcome, {userName}!</CardTitle>
                        <CardDescription className="text-gray-400">
                            You've been invited to join the team. Set your password to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white pr-10"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Min 12 characters with uppercase, lowercase, numbers, and special characters.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white pr-10"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Setting up account...
                                    </>
                                ) : (
                                    "Complete Setup"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
