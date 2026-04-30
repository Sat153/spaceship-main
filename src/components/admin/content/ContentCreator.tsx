'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    PenTool, Sparkles, CalendarDays, Send, Loader2, Plus,
    FileText, Clock, CheckCircle, XCircle, Edit2, Trash2, ExternalLink, ShieldCheck, Bell
} from 'lucide-react'
import {
    getContentPosts,
    createContentPost,
    updateContentPost,
    deleteContentPost,
    submitForReview,
    approveContentPost,
    rejectContentPost,
    getClientsForContent,
    ContentPost
} from '@/app/actions/content-posts'
import { sendApprovalRequest } from '@/app/actions/approval'


interface Client {
    id: string
    name: string
}

const PLATFORMS = [
    { id: 'twitter', label: '𝕏 Twitter', color: 'bg-gray-600' },
    { id: 'instagram', label: '📷 Instagram', color: 'bg-pink-600' },
    { id: 'facebook', label: '📘 Facebook', color: 'bg-blue-600' },
    { id: 'linkedin', label: '💼 LinkedIn', color: 'bg-blue-700' },
    { id: 'youtube', label: '▶️ YouTube', color: 'bg-red-600' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
    pending_review: { label: 'Pending Review', color: 'bg-yellow-500', icon: Clock },
    awaiting_approval: { label: 'Awaiting Approval', color: 'bg-purple-500', icon: ShieldCheck },
    approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
    published: { label: 'Published', color: 'bg-blue-500', icon: Send },
}

export default function ContentCreator() {
    const [posts, setPosts] = useState<ContentPost[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [activeTab, setActiveTab] = useState('all')

    // Create form state
    const [selectedClient, setSelectedClient] = useState('')
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [scheduledFor, setScheduledFor] = useState('')
    const [isScheduled, setIsScheduled] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [creating, setCreating] = useState(false)
    const [sendingApproval, setSendingApproval] = useState<string | null>(null)
    const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editBody, setEditBody] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        console.log('[ContentCreator] Starting fetchData...')
        setLoading(true)

        try {
            // Fetch posts using server action
            console.log('[ContentCreator] Fetching posts...')
            const postsResult = await getContentPosts()
            console.log('[ContentCreator] Posts fetched:', postsResult.data?.length || 0)
            if (postsResult.data) {
                setPosts(postsResult.data)
            }

            // Fetch clients using server action (not browser client)
            console.log('[ContentCreator] Fetching clients...')
            const clientsResult = await getClientsForContent()
            console.log('[ContentCreator] Clients fetched:', clientsResult.data?.length || 0)
            setClients(clientsResult.data || [])

            console.log('[ContentCreator] All fetches complete!')
        } catch (error) {
            console.error('[ContentCreator] Error fetching data:', error)
        } finally {
            console.log('[ContentCreator] Setting loading to false')
            setLoading(false)
        }
    }

    const handleCreatePost = async () => {
        if (!selectedClient || !body.trim()) return

        setCreating(true)
        try {
            const result = await createContentPost({
                client_id: selectedClient,
                title: title || undefined,
                body: body.trim(),
                platforms: selectedPlatforms,
                scheduled_for: scheduledFor || undefined,
                is_scheduled: isScheduled,
                ai_generated: aiPrompt.length > 0,
                prompt_used: aiPrompt || undefined,
            })

            if (result.data) {
                setPosts([result.data, ...posts])
                resetForm()
                setShowCreateModal(false)
            }
        } catch (error) {
            console.error('Error creating post:', error)
        }
        setCreating(false)
    }

    const handleGenerateWithAI = async () => {
        if (!selectedClient || !aiPrompt.trim()) return

        setIsGenerating(true)
        try {
            // Call AI generation endpoint
            const response = await fetch('/api/ai/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClient,
                    prompt: aiPrompt,
                    platforms: selectedPlatforms,
                })
            })

            if (response.ok) {
                const data = await response.json()
                setBody(data.content || '')
                if (data.title) setTitle(data.title)
            }
        } catch (error) {
            console.error('Error generating content:', error)
        }
        setIsGenerating(false)
    }

    const handleSubmitForReview = async (id: string) => {
        const result = await submitForReview(id)
        if (result.success) {
            fetchData()
        }
    }

    const handleApprove = async (id: string) => {
        const result = await approveContentPost(id)
        if (result.success) {
            fetchData()
        }
    }

    const handleReject = async (id: string) => {
        const notes = prompt('Rejection reason:')
        if (notes) {
            const result = await rejectContentPost(id, notes)
            if (result.success) {
                fetchData()
            }
        }
    }

    const openEdit = (post: ContentPost) => {
        setEditingPost(post)
        setEditTitle(post.title || '')
        setEditBody(post.body)
    }

    const handleSaveEdit = async () => {
        if (!editingPost || !editBody.trim()) return
        setSavingEdit(true)
        const result = await updateContentPost(editingPost.id, { title: editTitle || undefined, body: editBody.trim() })
        setSavingEdit(false)
        if (result.success) {
            setEditingPost(null)
            fetchData()
        } else {
            alert('Failed to save changes')
        }
    }

    const handleSendForApproval = async (id: string) => {
        setSendingApproval(id)
        const result = await sendApprovalRequest(id)
        setSendingApproval(null)
        if (result.success) {
            fetchData()
        } else {
            alert(result.error || 'Failed to send approval request')
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this post?')) {
            const result = await deleteContentPost(id)
            if (result.success) {
                setPosts(posts.filter(p => p.id !== id))
            }
        }
    }

    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        )
    }

    const resetForm = () => {
        setSelectedClient('')
        setTitle('')
        setBody('')
        setSelectedPlatforms([])
        setScheduledFor('')
        setIsScheduled(false)
        setAiPrompt('')
    }

    const filteredPosts = posts.filter(post => {
        if (activeTab === 'all') return true
        return post.status === activeTab
    })

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Not scheduled'
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <PenTool className="h-6 w-6" />
                            Content Creation
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Create, schedule, and manage social media content
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Post
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-gray-800 border-gray-700 mb-4">
                        <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
                            All ({posts.length})
                        </TabsTrigger>
                        <TabsTrigger value="draft" className="data-[state=active]:bg-gray-600">
                            Drafts ({posts.filter(p => p.status === 'draft').length})
                        </TabsTrigger>
                        <TabsTrigger value="pending_review" className="data-[state=active]:bg-yellow-600">
                            Pending ({posts.filter(p => p.status === 'pending_review').length})
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="data-[state=active]:bg-green-600">
                            Approved ({posts.filter(p => p.status === 'approved').length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-0">
                        {filteredPosts.length === 0 ? (
                            <Card className="bg-gray-800 border-gray-700">
                                <CardContent className="text-center py-12">
                                    <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
                                    <p className="text-gray-400">Create your first content post to get started</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {filteredPosts.map(post => {
                                    const statusConfig = STATUS_CONFIG[post.status]
                                    const StatusIcon = statusConfig.icon

                                    return (
                                        <Card key={post.id} className="bg-gray-800 border-gray-700">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${statusConfig.color}`}>
                                                                <StatusIcon className="h-3 w-3" />
                                                                {statusConfig.label}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                for {post.client_name}
                                                            </span>
                                                        </div>

                                                        {post.title && (
                                                            <h3 className="text-white font-medium mb-1">{post.title}</h3>
                                                        )}
                                                        <p className="text-gray-300 text-sm line-clamp-2">{post.body}</p>

                                                        {post.review_notes && (
                                                            <div className={`mt-2 px-3 py-2 rounded-lg text-xs border ${post.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                                                <span className="font-semibold">{post.status === 'rejected' ? 'Rejected' : 'Feedback'}: </span>{post.review_notes}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2 mt-3">
                                                            {post.platforms.map(platform => {
                                                                const p = PLATFORMS.find(pl => pl.id === platform)
                                                                return p ? (
                                                                    <span key={platform} className={`px-2 py-0.5 text-xs rounded ${p.color}`}>
                                                                        {p.label}
                                                                    </span>
                                                                ) : null
                                                            })}
                                                        </div>

                                                        {post.is_scheduled && (
                                                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                                                <CalendarDays className="h-3 w-3" />
                                                                Scheduled: {formatDate(post.scheduled_for)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {(post.status === 'draft' || post.status === 'pending_review') && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openEdit(post)}
                                                                className="text-gray-400 hover:text-white"
                                                                title="Edit content"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {post.status === 'draft' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleSubmitForReview(post.id)}
                                                                className="text-yellow-400 hover:text-yellow-300"
                                                                title="Submit for internal review"
                                                            >
                                                                <Send className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {post.status === 'pending_review' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleSendForApproval(post.id)}
                                                                    disabled={sendingApproval === post.id}
                                                                    className="text-purple-400 hover:text-purple-300"
                                                                    title="Send to Akhilesh Ji for final approval"
                                                                >
                                                                    {sendingApproval === post.id
                                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                        : <ShieldCheck className="h-4 w-4" />
                                                                    }
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleApprove(post.id)}
                                                                    className="text-green-400 hover:text-green-300"
                                                                    title="Approve internally"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleReject(post.id)}
                                                                    className="text-red-400 hover:text-red-300"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {post.status === 'approved' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleSendForApproval(post.id)}
                                                                disabled={sendingApproval === post.id}
                                                                className="text-orange-400 hover:text-orange-300"
                                                                title="Send to Akhilesh Ji for final approval"
                                                            >
                                                                {sendingApproval === post.id
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Bell className="h-4 w-4" />
                                                                }
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(post.id)}
                                                            className="text-gray-400 hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create Post Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <PenTool className="h-5 w-5" />
                            Create Content Post
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Client Selection */}
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Client *</label>
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
                            >
                                <option value="">Select a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Platforms - MOVED BEFORE AI GENERATION */}
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">
                                Target Platforms * <span className="text-gray-500">(Select which platforms to generate content for)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PLATFORMS.map(platform => (
                                    <button
                                        key={platform.id}
                                        onClick={() => togglePlatform(platform.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedPlatforms.includes(platform.id)
                                            ? `${platform.color} text-white`
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        {platform.label}
                                    </button>
                                ))}
                            </div>
                            {selectedPlatforms.length === 0 && (
                                <p className="text-xs text-yellow-500 mt-1">⚠️ Select at least one platform to generate tailored content</p>
                            )}
                        </div>

                        {/* AI Generation */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader className="py-3">
                                <CardTitle className="text-white text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-400" />
                                    AI Content Generation
                                </CardTitle>
                                <CardDescription className="text-gray-400 text-xs">
                                    AI will generate {selectedPlatforms.length > 1 ? 'separate posts for each selected platform' : 'a post'} tailored to {selectedPlatforms.length > 0 ? selectedPlatforms.map(p => PLATFORMS.find(pl => pl.id === p)?.label).join(', ') : 'your selected platforms'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="py-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={selectedPlatforms.length > 0
                                            ? `e.g., "Post about recent achievement..."`
                                            : "First select platforms above..."
                                        }
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        className="bg-gray-900 border-gray-600 text-white"
                                        disabled={selectedPlatforms.length === 0}
                                    />
                                    <Button
                                        onClick={handleGenerateWithAI}
                                        disabled={isGenerating || !selectedClient || !aiPrompt || selectedPlatforms.length === 0}
                                        className="bg-purple-600 hover:bg-purple-700"
                                        title={selectedPlatforms.length === 0 ? "Select platforms first" : "Generate content"}
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Title */}
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Title (optional)</label>
                            <Input
                                placeholder="Post title..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Content * {selectedPlatforms.length > 1 && <span className="text-purple-400">(Multi-platform posts will be labeled)</span>}
                            </label>
                            <Textarea
                                placeholder={selectedPlatforms.length > 1
                                    ? "Generated content will include separate posts for each platform..."
                                    : "Write your post content..."
                                }
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white min-h-[150px] font-mono text-sm"
                            />
                        </div>

                        {/* Schedule */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-400">
                                <input
                                    type="checkbox"
                                    checked={isScheduled}
                                    onChange={(e) => setIsScheduled(e.target.checked)}
                                    className="rounded bg-gray-800 border-gray-700"
                                />
                                Schedule for later
                            </label>
                            {isScheduled && (
                                <Input
                                    type="datetime-local"
                                    value={scheduledFor}
                                    onChange={(e) => setScheduledFor(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white w-auto"
                                />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                            <Button
                                variant="outline"
                                onClick={() => { resetForm(); setShowCreateModal(false) }}
                                className="border-gray-600 text-gray-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreatePost}
                                disabled={creating || !selectedClient || !body.trim() || selectedPlatforms.length === 0}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {creating ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Create Post
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Post Modal */}
            <Dialog open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null) }}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Edit2 className="h-5 w-5 text-blue-400" />
                            Edit Post
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="Post title (optional)"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Content *</label>
                            <Textarea
                                value={editBody}
                                onChange={e => setEditBody(e.target.value)}
                                placeholder="Post content..."
                                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[200px] resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setEditingPost(null)} className="text-gray-400">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editBody.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
