'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    ArrowRight, Loader2, FileText, CheckCircle,
    XCircle, Eye, UserCheck, RotateCcw, Send, Trash2, MessageSquare, X, Bell
} from 'lucide-react'
import {
    getContentPosts, submitForReview, approveContentPost,
    rejectContentPost, deleteContentPost, ContentPost
} from '@/app/actions/content-posts'
import { sendApprovalRequest } from '@/app/actions/approval'

// Map existing DB statuses to pipeline stage display names
const STAGE_MAP: Record<ContentPost['status'], { stage: string; label: string; bg: string; icon: any }> = {
    draft:          { stage: 'raw',             label: 'Raw',             bg: 'bg-gray-600',   icon: FileText },
    pending_review: { stage: 'internal_review', label: 'Internal Review', bg: 'bg-yellow-600', icon: Eye },
    approved:       { stage: 'approval',        label: 'Approval',        bg: 'bg-orange-600', icon: UserCheck },
    published:      { stage: 'posted',          label: 'Posted',          bg: 'bg-green-600',  icon: CheckCircle },
    rejected:       { stage: 'rejected',        label: 'Rejected',        bg: 'bg-red-600',    icon: XCircle },
}

const PIPELINE = [
    { stage: 'raw',             label: 'Raw',             bg: 'bg-gray-600' },
    { stage: 'in_editing',      label: 'In Editing',      bg: 'bg-blue-600' },
    { stage: 'internal_review', label: 'Internal Review', bg: 'bg-yellow-600' },
    { stage: 'approval',        label: 'Approval',        bg: 'bg-orange-600' },
    { stage: 'posted',          label: 'Posted',          bg: 'bg-green-600' },
]

const PLATFORMS: Record<string, string> = {
    twitter: '𝕏 Twitter', instagram: '📷 Instagram',
    facebook: '📘 Facebook', linkedin: '💼 LinkedIn', youtube: '▶️ YouTube',
}

export default function AnySegen() {
    const [posts, setPosts] = useState<ContentPost[]>([])
    const [loading, setLoading] = useState(true)
    const [activeStage, setActiveStage] = useState('all')
    const [feedbackModal, setFeedbackModal] = useState<{ postId: string; title: string | null } | null>(null)
    const [feedbackText, setFeedbackText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [sendingApproval, setSendingApproval] = useState<string | null>(null)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        setLoading(true)
        const result = await getContentPosts()
        if (result.data) setPosts(result.data)
        setLoading(false)
    }

    const getStage = (status: ContentPost['status']) => STAGE_MAP[status]?.stage || 'raw'

    const countByStage = (stage: string) => posts.filter(p => getStage(p.status) === stage).length

    const filteredPosts = activeStage === 'all'
        ? posts
        : posts.filter(p => getStage(p.status) === activeStage)

    const handleAdvance = async (post: ContentPost) => {
        if (post.status === 'draft') await submitForReview(post.id)
        else if (post.status === 'pending_review') await approveContentPost(post.id)
        fetchData()
    }

    const openFeedback = (post: ContentPost) => {
        setFeedbackText('')
        setFeedbackModal({ postId: post.id, title: post.title })
    }

    const handleFeedbackSubmit = async () => {
        if (!feedbackModal || !feedbackText.trim()) return
        setSubmitting(true)
        await rejectContentPost(feedbackModal.postId, feedbackText.trim())
        setFeedbackModal(null)
        setFeedbackText('')
        setSubmitting(false)
        fetchData()
    }

    const handleSendForApproval = async (post: ContentPost) => {
        if (!confirm(`Send "${post.title}" to Akhilesh Ji for final approval?`)) return
        setSendingApproval(post.id)
        const result = await sendApprovalRequest(post.id)
        setSendingApproval(null)
        if (result.success) {
            alert('Sent! Akhilesh Ji will receive an email with Approve/Reject buttons.')
            fetchData()
        } else {
            alert(`Failed: ${result.error}`)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this post?')) {
            await deleteContentPost(id)
            setPosts(posts.filter(p => p.id !== id))
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-white">Ganesh Joshi</h1>
                    <p className="text-gray-400 mt-1">Content pipeline tracker</p>
                </div>

                {/* Pipeline nav */}
                <div className="flex items-center gap-1 flex-wrap">
                    {PIPELINE.map((p, i) => (
                        <div key={p.stage} className="flex items-center gap-1">
                            <button
                                onClick={() => setActiveStage(p.stage)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                                    activeStage === p.stage ? `${p.bg} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {p.label}
                                {countByStage(p.stage) > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeStage === p.stage ? 'bg-white/20' : 'bg-gray-700'}`}>
                                        {countByStage(p.stage)}
                                    </span>
                                )}
                            </button>
                            {i < PIPELINE.length - 1 && <ArrowRight className="h-3 w-3 text-gray-600" />}
                        </div>
                    ))}
                    <span className="text-gray-700 mx-1">|</span>
                    <button
                        onClick={() => setActiveStage('rejected')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            activeStage === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        Rejected
                        {countByStage('rejected') > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeStage === 'rejected' ? 'bg-white/20' : 'bg-gray-700'}`}>
                                {countByStage('rejected')}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveStage('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeStage === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        All ({posts.length})
                    </button>
                </div>
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-auto p-6">
                {filteredPosts.length === 0 ? (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                            <p className="text-white font-medium mb-1">No posts in this stage</p>
                            <p className="text-gray-400 text-sm">Create posts from the Content tab</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {filteredPosts.map(post => {
                            const stageCfg = STAGE_MAP[post.status]
                            const StageIcon = stageCfg.icon

                            return (
                                <Card key={post.id} className="bg-gray-800 border-gray-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                {/* Stage badge + client */}
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${stageCfg.bg} text-white`}>
                                                        <StageIcon className="h-3 w-3" />
                                                        {stageCfg.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{post.client_name}</span>
                                                </div>

                                                {post.title && (
                                                    <h3 className="text-white font-medium mb-1 truncate">{post.title}</h3>
                                                )}
                                                <p className="text-gray-300 text-sm line-clamp-2">{post.body}</p>

                                                {/* Platforms */}
                                                {post.platforms.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {post.platforms.map(pid => PLATFORMS[pid] ? (
                                                            <span key={pid} className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                                                                {PLATFORMS[pid]}
                                                            </span>
                                                        ) : null)}
                                                    </div>
                                                )}

                                                {/* Rejection note */}
                                                {post.review_notes && post.status === 'rejected' && (
                                                    <div className="mt-2 px-2 py-1.5 bg-red-500/10 rounded text-xs text-red-300 border border-red-500/20">
                                                        <span className="font-medium">Rejected: </span>{post.review_notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(post.status === 'draft' || post.status === 'pending_review') && (
                                                    <Button size="sm" variant="ghost"
                                                        onClick={() => handleAdvance(post)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title={post.status === 'draft' ? 'Submit for Review' : 'Approve'}>
                                                        {post.status === 'draft'
                                                            ? <Send className="h-3.5 w-3.5" />
                                                            : <CheckCircle className="h-3.5 w-3.5" />}
                                                    </Button>
                                                )}
                                                {(post.status === 'draft' || post.status === 'pending_review') && (
                                                    <Button size="sm" variant="ghost"
                                                        onClick={() => openFeedback(post)}
                                                        className="text-red-400 hover:text-red-300"
                                                        title="Reject with Feedback">
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {post.status === 'approved' && (
                                                    <Button size="sm" variant="ghost"
                                                        onClick={() => handleSendForApproval(post)}
                                                        disabled={sendingApproval === post.id}
                                                        className="text-orange-400 hover:text-orange-300"
                                                        title="Send to Akhilesh Ji for final approval">
                                                        {sendingApproval === post.id
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <Bell className="h-3.5 w-3.5" />}
                                                    </Button>
                                                )}
                                                {post.status === 'rejected' && (
                                                    <Button size="sm" variant="ghost"
                                                        onClick={() => submitForReview(post.id).then(fetchData)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Re-submit">
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => handleDelete(post.id)}
                                                    className="text-gray-500 hover:text-red-400">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Feedback Modal */}
            {feedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-yellow-400" />
                                Revision Feedback
                            </h3>
                            <button onClick={() => setFeedbackModal(null)} className="text-gray-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {feedbackModal.title && (
                            <p className="text-gray-400 text-sm mb-4 truncate">
                                Post: <span className="text-gray-200">{feedbackModal.title}</span>
                            </p>
                        )}

                        <Textarea
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            placeholder="Write your feedback... (e.g. 'You should change the caption to be more engaging' or 'Please update the image and shorten the text')"
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 min-h-[120px] resize-none mb-4"
                            autoFocus
                        />

                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={() => setFeedbackModal(null)} className="text-gray-400 hover:text-white">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleFeedbackSubmit}
                                disabled={!feedbackText.trim() || submitting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                                Send Feedback & Reject
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
