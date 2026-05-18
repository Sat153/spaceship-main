'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPendingApprovals, approveContentPost, rejectContentPost, ContentPost } from '@/app/actions/content-posts'
import { CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Loader2, Instagram, Twitter, Facebook, Linkedin, AlertCircle } from 'lucide-react'

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  twitter: <Twitter className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AkhileshApproval() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionPost, setActionPost] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string; action: 'approved' | 'rejected' }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getPendingApprovals()
    setPosts(result.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string) => {
    setActionPost(id)
    await approveContentPost(id)
    setDone(d => [...d, { id, action: 'approved' }])
    setPosts(p => p.filter(x => x.id !== id))
    setActionPost(null)
  }

  const handleReject = async (id: string) => {
    if (!rejectNotes.trim()) return
    setActionPost(id)
    await rejectContentPost(id, rejectNotes)
    setDone(d => [...d, { id, action: 'rejected' }])
    setPosts(p => p.filter(x => x.id !== id))
    setShowRejectInput(null)
    setRejectNotes('')
    setActionPost(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Pending Approvals</h2>
          <p className="text-gray-400 text-sm mt-0.5">Content posts waiting for your review</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Done toasts */}
      {done.length > 0 && (
        <div className="space-y-2">
          {done.slice(-3).map(d => (
            <div key={d.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${d.action === 'approved' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {d.action === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              Post {d.action} successfully.
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800">
          <CheckCircle2 className="mx-auto w-14 h-14 text-green-500/30 mb-4" />
          <p className="text-white font-medium mb-1">All caught up!</p>
          <p className="text-gray-500 text-sm">No content is waiting for your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending count badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{posts.length} post{posts.length > 1 ? 's' : ''} pending</span>
            </div>
          </div>

          {posts.map(post => {
            const isExpanded = expandedId === post.id
            const isActing = actionPost === post.id
            const isRejecting = showRejectInput === post.id
            const clientName = (post as any).clients?.name || 'Unknown Client'

            return (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-all hover:border-gray-700">
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Client + date */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">{clientName}</span>
                        <span className="text-gray-600 text-xs">{formatDate(post.created_at)}</span>
                      </div>
                      <h3 className="text-white font-semibold text-base">{post.title || 'Untitled Post'}</h3>

                      {/* Platforms */}
                      {post.platforms && post.platforms.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {post.platforms.map(p => (
                            <span key={p} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs border border-gray-700">
                              {PLATFORM_ICONS[p.toLowerCase()] || null}
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Preview text (always visible) */}
                  <p className={`text-gray-400 text-sm mt-3 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {post.body}
                  </p>

                  {/* Media thumbnails */}
                  {isExpanded && post.media_urls && post.media_urls.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {post.media_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-700 hover:border-blue-500 transition-all" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div className="px-5 pb-5">
                  {isRejecting ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Please describe what changes are needed:
                      </div>
                      <textarea
                        autoFocus
                        value={rejectNotes}
                        onChange={e => setRejectNotes(e.target.value)}
                        placeholder="e.g. Change the headline, remove the second paragraph..."
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(post.id)}
                          disabled={isActing || !rejectNotes.trim()}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-all"
                        >
                          {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Send for Revision
                        </button>
                        <button
                          onClick={() => { setShowRejectInput(null); setRejectNotes('') }}
                          className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(post.id)}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-all"
                      >
                        {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectInput(post.id)}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 text-red-400 text-sm font-medium transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Request Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
