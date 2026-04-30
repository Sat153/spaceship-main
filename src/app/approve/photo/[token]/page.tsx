import { getPhotoApprovalPageData } from '@/app/actions/photo-approval'
import PhotoApprovalClient from './PhotoApprovalClient'
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Props {
    params: Promise<{ token: string }>
    searchParams: Promise<{ action?: string }>
}

export default async function PhotoApprovalPage({ params, searchParams }: Props) {
    const { token } = await params
    const { action } = await searchParams
    const { data, error } = await getPhotoApprovalPageData(token)

    const defaultAction = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : undefined

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#07070d' }}>
            <div className="fixed inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(29,78,216,0.08) 0%, transparent 60%)',
            }} />

            <div className="w-full max-w-md relative z-10">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                            boxShadow: '0 0 20px rgba(29,78,216,0.4)',
                        }}>
                            <span className="text-white text-xs font-bold">AS</span>
                        </div>
                        <span className="text-white font-semibold text-sm tracking-wide">ANYA SEGEN CRM</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Photo Approval</h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Review and approve the processed photo
                    </p>
                </div>

                <div className="rounded-2xl p-6" style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                }}>
                    {/* Error */}
                    {(error || !data) && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Link Invalid</h2>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{error || 'This link is invalid or has expired.'}</p>
                        </div>
                    )}

                    {/* Already used */}
                    {data && data.used_at && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{
                                background: data.action_taken === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${data.action_taken === 'approved' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}>
                                {data.action_taken === 'approved'
                                    ? <CheckCircle className="w-8 h-8 text-green-400" />
                                    : <XCircle className="w-8 h-8 text-red-400" />}
                            </div>
                            <h2 className="text-lg font-bold text-white">Already {data.action_taken}</h2>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                This photo was {data.action_taken} on{' '}
                                {new Date(data.used_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                            {data.rejection_note && (
                                <div className="mt-2 p-3 rounded-xl text-sm text-red-300 text-left" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <strong>Feedback:</strong> {data.rejection_note}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expired */}
                    {data && !data.used_at && new Date(data.expires_at) < new Date() && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                                <Clock className="w-8 h-8 text-amber-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Link Expired</h2>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Please ask the team to send a new link.</p>
                        </div>
                    )}

                    {/* Active */}
                    {data && !data.used_at && new Date(data.expires_at) >= new Date() && data.photo && (
                        <PhotoApprovalClient
                            token={token}
                            defaultAction={defaultAction}
                            photo={{
                                photo_id: (data.photo as any).photo_id,
                                image_url: (data.photo as any).image_url,
                                assignee: (data.photo as any).assignee,
                                department: (data.photo as any).department,
                            }}
                        />
                    )}
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Anya Segen CRM &middot; Secure one-time approval link
                </p>
            </div>
        </div>
    )
}
