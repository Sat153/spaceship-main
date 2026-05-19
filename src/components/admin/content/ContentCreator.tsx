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
    FileText, Clock, CheckCircle, XCircle, Edit2, Trash2, ExternalLink, ShieldCheck, Bell,
    BookMarked, Wheat, Heart, Building, Tag, Zap, Search
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
import { getMessageTemplates, MessageTemplate } from '@/app/actions/message-templates'


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
    const [viewingPost, setViewingPost] = useState<ContentPost | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [rejectingPost, setRejectingPost] = useState<ContentPost | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    const [rejectSaving, setRejectSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    // Messaging bank picker
    const [showBankPicker, setShowBankPicker] = useState<'create' | 'edit' | null>(null)
    const [bankTemplates, setBankTemplates] = useState<MessageTemplate[]>([])
    const [bankLoading, setBankLoading] = useState(false)
    const [bankSearch, setBankSearch] = useState('')
    const [bankCategory, setBankCategory] = useState('all')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [postsResult, clientsResult] = await Promise.all([
                getContentPosts(),
                getClientsForContent(),
            ])
            if (postsResult.data) setPosts(postsResult.data)
            setClients(clientsResult.data || [])
        } catch (error) {
            console.error('[ContentCreator] Error fetching data:', error)
        } finally {
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

    const handleReject = async () => {
        if (!rejectingPost || !rejectNotes.trim()) return
        setRejectSaving(true)
        const result = await rejectContentPost(rejectingPost.id, rejectNotes.trim())
        setRejectSaving(false)
        if (result.success) {
            setRejectingPost(null)
            setRejectNotes('')
            fetchData()
        }
    }

    const openEdit = (post: ContentPost) => {
        setEditingPost(post)
        setEditTitle(post.title || '')
        setEditBody(post.body)
    }

    const handleSaveEdit = async () => {
        if (!editingPost || !editBody.trim()) return
        setEditError(null)
        setSavingEdit(true)
        const result = await updateContentPost(editingPost.id, { title: editTitle || undefined, body: editBody.trim() })
        setSavingEdit(false)
        if (result.success) {
            setEditingPost(null)
            fetchData()
        } else {
            setEditError('Failed to save changes. Please try again.')
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
        const result = await deleteContentPost(id)
        if (result.success) {
            setPosts(posts.filter(p => p.id !== id))
        }
        setConfirmDeleteId(null)
    }

    const openBankPicker = async (target: 'create' | 'edit') => {
        setShowBankPicker(target)
        setBankSearch('')
        setBankCategory('all')
        if (bankTemplates.length === 0) {
            setBankLoading(true)
            const { data } = await getMessageTemplates()
            if (data) setBankTemplates(data)
            setBankLoading(false)
        }
    }

    const insertTemplate = (template: MessageTemplate) => {
        const text = [template.body_english, template.body_hindi].filter(Boolean).join('\n\n')
        if (showBankPicker === 'create') setBody(prev => prev ? prev + '\n\n' + text : text)
        if (showBankPicker === 'edit') setEditBody(prev => prev ? prev + '\n\n' + text : text)
        setShowBankPicker(null)
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
            <div className="p-4 md:p-6 border-b border-gray-800">
                <div className="flex items-center justify-between gap-3 flex-wrap">
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
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setViewingPost(post)}
                                                            className="text-gray-400 hover:text-white"
                                                            title="View full content"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
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
                                                                    onClick={() => { setRejectingPost(post); setRejectNotes('') }}
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
                                                            onClick={() => setConfirmDeleteId(post.id)}
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
                <DialogContent className="bg-gray-900 border-gray-700 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm text-gray-400">
                                    Content * {selectedPlatforms.length > 1 && <span className="text-purple-400">(Multi-platform posts will be labeled)</span>}
                                </label>
                                <button onClick={() => openBankPicker('create')} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                    <BookMarked className="h-3.5 w-3.5" />
                                    Insert from Bank
                                </button>
                            </div>
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
                <DialogContent className="bg-gray-900 border-gray-700 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-gray-400">Content *</label>
                                <button onClick={() => openBankPicker('edit')} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                    <BookMarked className="h-3.5 w-3.5" />
                                    Insert from Bank
                                </button>
                            </div>
                            <Textarea
                                value={editBody}
                                onChange={e => { setEditBody(e.target.value); setEditError(null) }}
                                placeholder="Post content..."
                                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[200px] resize-none"
                            />
                            {editError && <p className="text-red-400 text-xs mt-1">{editError}</p>}
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

            {/* Delete Confirm Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-red-500/10">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-white font-semibold">Delete Post?</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-5">This post will be permanently deleted and cannot be recovered.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectingPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-red-500/10">
                                <XCircle className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Reject Post</h3>
                                <p className="text-gray-500 text-xs">{rejectingPost.title || rejectingPost.body.slice(0, 50) + '…'}</p>
                            </div>
                        </div>
                        <textarea
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            placeholder="Reason for rejection (required)..."
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setRejectingPost(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleReject} disabled={!rejectNotes.trim() || rejectSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                                {rejectSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Reject Post
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messaging Bank Picker */}
            {showBankPicker && (() => {
                const BANK_CATS = [
                    { id: 'all', label: 'All', icon: BookMarked },
                    { id: 'kisan', label: 'किसान', icon: Wheat },
                    { id: 'women', label: 'महिला', icon: Heart },
                    { id: 'development', label: 'विकास', icon: Building },
                    { id: 'general', label: 'सामान्य', icon: Tag },
                    { id: 'crisis', label: 'आपातकाल', icon: Zap },
                ]
                const filtered = bankTemplates.filter(t => {
                    const matchCat = bankCategory === 'all' || t.category === bankCategory
                    const q = bankSearch.toLowerCase()
                    return matchCat && (!q || t.title.toLowerCase().includes(q) || t.body_english.toLowerCase().includes(q) || (t.body_hindi || '').includes(bankSearch))
                })
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                                <div className="flex items-center gap-2">
                                    <BookMarked className="h-5 w-5 text-amber-400" />
                                    <h3 className="text-white font-semibold">Insert from Messaging Bank</h3>
                                </div>
                                <button onClick={() => setShowBankPicker(null)} className="text-gray-400 hover:text-white">
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-3 border-b border-gray-700 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {BANK_CATS.map(c => {
                                        const Icon = c.icon
                                        return (
                                            <button key={c.id} onClick={() => setBankCategory(c.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${bankCategory === c.id ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                                                <Icon className="h-3 w-3" />{c.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-3 space-y-2">
                                {bankLoading ? (
                                    <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
                                ) : filtered.length === 0 ? (
                                    <p className="text-center text-gray-500 py-12 text-sm">No templates found</p>
                                ) : filtered.map(t => (
                                    <button key={t.id} onClick={() => insertTemplate(t)} className="w-full text-left bg-gray-800 hover:bg-gray-750 hover:border-amber-500 border border-gray-700 rounded-lg p-3 transition-all group">
                                        <p className="text-white text-sm font-medium mb-1 group-hover:text-amber-300">{t.title}</p>
                                        <p className="text-gray-400 text-xs line-clamp-2">{t.body_english}</p>
                                        {t.body_hindi && <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{t.body_hindi}</p>}
                                    </button>
                                ))}
                            </div>
                            <div className="p-3 border-t border-gray-700">
                                <p className="text-gray-500 text-xs text-center">Click a template to insert it into your post content</p>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* View Full Content Modal */}
            <Dialog open={!!viewingPost} onOpenChange={(open) => { if (!open) setViewingPost(null) }}>
                <DialogContent className="bg-gray-900 border-gray-700 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {viewingPost?.title || 'Full Content'}
                        </DialogTitle>
                    </DialogHeader>
                    {viewingPost && (
                        <div className="space-y-4 pt-1">
                            {/* Meta */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                    const cfg = STATUS_CONFIG[viewingPost.status]
                                    const Icon = cfg?.icon
                                    return (
                                        <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${cfg?.color}`}>
                                            {Icon && <Icon className="h-3 w-3" />}
                                            {cfg?.label}
                                        </span>
                                    )
                                })()}
                                <span className="text-xs text-gray-400">for {viewingPost.client_name}</span>
                                {viewingPost.platforms.map(platform => {
                                    const p = PLATFORMS.find(pl => pl.id === platform)
                                    return p ? (
                                        <span key={platform} className={`px-2 py-0.5 text-xs rounded ${p.color}`}>{p.label}</span>
                                    ) : null
                                })}
                            </div>
                            {/* Full body */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{viewingPost.body}</p>
                            </div>
                            {/* Review notes */}
                            {viewingPost.review_notes && (
                                <div className={`px-3 py-2 rounded-lg text-xs border ${viewingPost.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                    <span className="font-semibold">{viewingPost.status === 'rejected' ? 'Rejected' : 'Feedback'}: </span>
                                    {viewingPost.review_notes}
                                </div>
                            )}
                            {/* Footer */}
                            <p className="text-xs text-gray-500">
                                Created by {viewingPost.created_by_name || 'Unknown'} · {new Date(viewingPost.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
