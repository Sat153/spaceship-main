'use client'

import { useState, useEffect } from 'react'
import {
    RefreshCw,
    ExternalLink,
    Calendar,
    Heart,
    MessageCircle,
    Repeat2,
    Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    getClientIntelligence,
    fetchTwitterDataForClient,
    type ClientIntelligence,
} from '@/app/actions/client-intelligence'

interface ClientTwitterFeedProps {
    clientId: string
    clientName: string
    twitterHandle?: string
    onHandleSave?: (handle: string) => Promise<void>
}

export default function ClientTwitterFeed({ clientId, clientName, twitterHandle, onHandleSave }: ClientTwitterFeedProps) {
    const [tweets, setTweets] = useState<ClientIntelligence[]>([])
    const [loading, setLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [fetchMessage, setFetchMessage] = useState<string | null>(null)
    const [handleInput, setHandleInput] = useState('')
    const [isSavingHandle, setIsSavingHandle] = useState(false)

    const fetchTweets = async () => {
        setLoading(true)
        const result = await getClientIntelligence(clientId)
        if (result.data) {
            // Filter only Twitter entries
            const twitterEntries = result.data.filter(item => item.source_type === 'twitter')
            setTweets(twitterEntries)
        }
        setLoading(false)
    }

    useEffect(() => {
        setFetchMessage(null)
        fetchTweets()
    }, [clientId])

    const handleFetchTwitter = async () => {
        if (!twitterHandle) {
            setFetchMessage('❌ No Twitter handle configured. Add it in client settings.')
            return
        }

        setIsFetching(true)
        setFetchMessage(null)

        const result = await fetchTwitterDataForClient(clientId, twitterHandle)

        if (result.error) {
            setFetchMessage(`❌ ${result.error}`)
        } else if (result.message) {
            setFetchMessage(`✅ ${result.message}`)
            await fetchTweets()
        }

        setIsFetching(false)
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getMetrics = (item: ClientIntelligence) => {
        const metrics = item.metadata?.metrics
        if (!metrics) return null
        return {
            likes: metrics.like_count || 0,
            retweets: metrics.retweet_count || 0,
            replies: metrics.reply_count || 0
        }
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 rounded-lg border border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">𝕏</span>
                        <h3 className="text-lg font-semibold text-white">Twitter / X Feed</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFetchTwitter}
                            className="text-white border-white/20 hover:bg-gray-800"
                            disabled={isFetching}
                            title="Fetches profile + last 5 tweets (limit: 100 reads/mo)"
                        >
                            {isFetching ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <span className="mr-1">𝕏</span>
                            )}
                            {isFetching ? 'Fetching...' : 'Fetch Latest'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchTweets}
                            className="text-gray-400 hover:text-white"
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
                {twitterHandle && (
                    <p className="text-sm text-gray-400 mt-1">
                        @{twitterHandle.replace('@', '')} • Tweets are auto-verified
                    </p>
                )}
                {!twitterHandle && onHandleSave && (
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            placeholder="Enter Twitter handle (e.g. ganesh_joshi)"
                            value={handleInput}
                            onChange={(e) => setHandleInput(e.target.value.replace('@', ''))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && handleInput.trim()) {
                                    setIsSavingHandle(true)
                                    onHandleSave(handleInput.trim()).finally(() => setIsSavingHandle(false))
                                }
                            }}
                            className="bg-gray-800 border-gray-600 text-white text-sm h-8"
                        />
                        <Button
                            size="sm"
                            className="h-8 bg-blue-600 hover:bg-blue-700 shrink-0"
                            disabled={!handleInput.trim() || isSavingHandle}
                            onClick={async () => {
                                if (!handleInput.trim()) return
                                setIsSavingHandle(true)
                                await onHandleSave(handleInput.trim())
                                setIsSavingHandle(false)
                            }}
                        >
                            <Save className="h-3 w-3 mr-1" />
                            {isSavingHandle ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                )}
                {!twitterHandle && !onHandleSave && (
                    <p className="text-sm text-yellow-400 mt-1">
                        ⚠️ No Twitter handle configured for this client
                    </p>
                )}
                {fetchMessage && (
                    <p className={`text-sm mt-2 ${fetchMessage.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>
                        {fetchMessage}
                    </p>
                )}
            </div>

            {/* Tweet List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                    </div>
                ) : tweets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <span className="text-4xl mb-2">𝕏</span>
                        <p className="text-sm">No tweets fetched yet</p>
                        <p className="text-xs">Click "Fetch Latest" to get tweets</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {tweets.map((item) => {
                            const metrics = getMetrics(item)
                            const isProfile = item.title.startsWith('👤')

                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 hover:bg-gray-800/50 transition-colors ${isProfile ? 'bg-blue-900/10 border-l-4 border-blue-500' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Title */}
                                            <h4 className="text-white font-medium text-sm">
                                                {item.title}
                                            </h4>

                                            {/* Content */}
                                            {item.content && (
                                                <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                                                    {item.content}
                                                </p>
                                            )}

                                            {/* Meta info */}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                {item.published_at && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(item.published_at)}
                                                    </span>
                                                )}
                                                {metrics && !isProfile && (
                                                    <>
                                                        <span className="flex items-center gap-1">
                                                            <Heart className="h-3 w-3" />
                                                            {metrics.likes}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Repeat2 className="h-3 w-3" />
                                                            {metrics.retweets}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MessageCircle className="h-3 w-3" />
                                                            {metrics.replies}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {item.source_url && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(item.source_url, '_blank')}
                                                className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
