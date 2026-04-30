'use client'

import { useState } from 'react'
import { processPhotoApproval } from '@/app/actions/photo-approval'
import { CheckCircle, XCircle, Loader2, MessageSquare } from 'lucide-react'

interface Props {
    token: string
    defaultAction?: 'approve' | 'reject'
    photo: {
        photo_id: string
        image_url: string
        assignee: { first_name: string | null; last_name: string | null } | null
        department: { name: string } | null
    }
}

export default function PhotoApprovalClient({ token, defaultAction, photo }: Props) {
    const [step, setStep] = useState<'review' | 'approve-note' | 'reject-note' | 'done' | 'error'>(
        defaultAction === 'approve' ? 'approve-note' :
        defaultAction === 'reject' ? 'reject-note' : 'review'
    )
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ action: 'approved' | 'rejected'; error?: string } | null>(null)

    const assigneeName = photo.assignee
        ? `${photo.assignee.first_name || ''} ${photo.assignee.last_name || ''}`.trim()
        : 'Team'

    const submit = async (action: 'approved' | 'rejected', rejectionNote?: string) => {
        setLoading(true)
        const res = await processPhotoApproval(token, action, rejectionNote)
        setLoading(false)
        if (res.success) {
            setResult({ action })
            setStep('done')
        } else {
            setResult({ action, error: res.error || 'Something went wrong' })
            setStep('error')
        }
    }

    if (step === 'done') {
        const approved = result?.action === 'approved'
        return (
            <div className="text-center space-y-4 py-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                    style={{
                        background: approved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                        boxShadow: approved ? '0 0 40px rgba(34,197,94,0.4)' : '0 0 40px rgba(239,68,68,0.4)',
                    }}>
                    {approved ? <CheckCircle className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{approved ? 'Photo Approved!' : 'Photo Rejected'}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)' }} className="text-sm">
                        {approved ? 'The team has been notified.' : 'The team will revise and resubmit.'}
                    </p>
                </div>
                <div className="inline-block px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                        background: approved ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${approved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: approved ? '#86efac' : '#fca5a5',
                    }}>
                    Decision recorded &middot; {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        )
    }

    if (step === 'error') {
        return (
            <div className="text-center space-y-3 py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Unable to process</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{result?.error}</p>
            </div>
        )
    }

    if (step === 'approve-note') {
        return (
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <MessageSquare className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Any feedback? <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optional)</span></h3>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Leave notes for the team before approving</p>
                    </div>
                </div>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Good work! Please ensure better lighting next time..."
                    rows={4}
                    className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-600 resize-none outline-none focus:ring-1 focus:ring-green-500/50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <div className="flex gap-3">
                    <button onClick={() => setStep('review')}
                        className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                        Back
                    </button>
                    <button onClick={() => submit('approved', note || undefined)} disabled={loading}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Confirm Approval
                    </button>
                </div>
            </div>
        )
    }

    if (step === 'reject-note') {
        return (
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <MessageSquare className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Reason for rejection</h3>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Your feedback helps the team improve</p>
                    </div>
                </div>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Poor lighting, please reshoot with better background..."
                    rows={4}
                    className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-600 resize-none outline-none focus:ring-1 focus:ring-red-500/50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <div className="flex gap-3">
                    <button onClick={() => setStep('review')}
                        className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                        Back
                    </button>
                    <button onClick={() => submit('rejected', note || undefined)} disabled={loading}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Confirm Rejection
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Photo */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <img src={photo.image_url} alt={photo.photo_id} className="w-full object-cover" style={{ maxHeight: 380 }} />
            </div>

            {/* Details */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Photo ID</p>
                    <p className="text-white font-bold font-mono">{photo.photo_id}</p>
                </div>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Processed By</p>
                    <p className="text-white font-semibold">{assigneeName}</p>
                </div>
                {photo.department?.name && (
                    <div className="px-5 py-4">
                        <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Department</p>
                        <p className="text-white">{photo.department.name}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep('approve-note')} disabled={loading}
                    className="py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.35)' }}>
                    <CheckCircle className="w-5 h-5" /> Approve
                </button>
                <button onClick={() => setStep('reject-note')} disabled={loading}
                    className="py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 24px rgba(239,68,68,0.35)' }}>
                    <XCircle className="w-5 h-5" /> Reject
                </button>
            </div>
        </div>
    )
}
