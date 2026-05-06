'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Trash2, Send, ArrowLeft, Loader2, Check, X,
    Image as ImageIcon, Video, FileQuestion, ChevronDown, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    getGridPlans, getGridPlanWithItems, createGridPlan, updateGridPlan,
    deleteGridPlan, upsertGridPlanItem, sendGridPlanForReview, getAllMediaAssets,
    GridPlan, GridPlanItem, GridPlanStatus, updateItemCaption,
} from '@/app/actions/grid-plans'
import { getClientsForContent } from '@/app/actions/content-posts'

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C', bg: 'rgba(225,48,108,0.08)', border: 'rgba(225,48,108,0.35)' },
    { id: 'facebook', label: 'Facebook', emoji: '📘', color: '#1877F2', bg: 'rgba(24,119,242,0.08)', border: 'rgba(24,119,242,0.35)' },
    { id: 'twitter', label: 'Twitter / X', emoji: '𝕏', color: '#e7e9ea', bg: 'rgba(231,233,234,0.05)', border: 'rgba(231,233,234,0.2)' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼', color: '#0077B5', bg: 'rgba(0,119,181,0.08)', border: 'rgba(0,119,181,0.35)' },
]

const STATUS_CONFIG: Record<GridPlanStatus, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    sent_for_review: { label: 'Sent for Review', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    approved: { label: 'Approved', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    changes_requested: { label: 'Changes Requested', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
}

const SLOTS_PER_PLATFORM = 3

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client { id: string; name: string }
interface MediaAsset { id: string; name: string; url: string | null; mime_type: string | null; client_id: string | null }

// ─── Asset Thumbnail ─────────────────────────────────────────────────────────

function AssetThumb({ url, name, mime }: { url: string | null; name: string; mime: string | null }) {
    const isVideo = mime?.startsWith('video/')
    const isImage = mime?.startsWith('image/')

    if (isImage && url) {
        return (
            <img
                src={url}
                alt={name}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
        )
    }
    if (isVideo) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Video className="h-6 w-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs truncate w-full text-center px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{name}</span>
            </div>
        )
    }
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <FileQuestion className="h-6 w-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="text-xs truncate w-full text-center px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{name}</span>
        </div>
    )
}

// ─── Slot Cell ───────────────────────────────────────────────────────────────

function SlotCell({
    item, position, onAdd, onRemove, onCaptionChange, platformColor,
}: {
    item: GridPlanItem | undefined
    position: number
    onAdd: () => void
    onRemove: () => void
    onCaptionChange: (val: string) => void
    platformColor: string
}) {
    const [showCaption, setShowCaption] = useState(false)
    const [caption, setCaption] = useState(item?.caption ?? '')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setCaption(item?.caption ?? '')
    }, [item?.caption])

    const saveCaption = async () => {
        if (!item) return
        setSaving(true)
        await updateItemCaption(item.id, caption)
        setSaving(false)
    }

    return (
        <div className="space-y-1.5">
            <div
                className="relative group rounded-lg overflow-hidden"
                style={{
                    aspectRatio: '1/1',
                    border: item ? `2px solid ${platformColor}` : '1.5px dashed rgba(255,255,255,0.12)',
                    background: item ? 'transparent' : 'rgba(255,255,255,0.02)',
                    minHeight: 80,
                }}
            >
                {item ? (
                    <>
                        <AssetThumb url={item.asset_url} name={item.asset_name ?? ''} mime={null} />
                        {/* Slot number badge */}
                        <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: platformColor, color: '#fff', fontSize: 10 }}>
                            {position}
                        </div>
                        {/* Hover actions */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                            style={{ background: 'rgba(0,0,0,0.55)' }}>
                            <button
                                onClick={() => setShowCaption(v => !v)}
                                className="p-1.5 rounded-lg text-xs text-white font-medium"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                                title="Add caption"
                            >Caption</button>
                            <button
                                onClick={onRemove}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,0.3)' }}
                                title="Remove"
                            ><X className="h-3 w-3 text-red-400" /></button>
                        </div>
                    </>
                ) : (
                    <button
                        onClick={onAdd}
                        className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors"
                    >
                        <Plus className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{position}</span>
                    </button>
                )}
            </div>
            {/* Caption editor */}
            {showCaption && item && (
                <div className="space-y-1">
                    <Textarea
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        placeholder="Caption..."
                        className="text-xs resize-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minHeight: 56 }}
                        rows={3}
                    />
                    <button
                        onClick={saveCaption}
                        disabled={saving}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Asset Picker Modal ───────────────────────────────────────────────────────

function AssetPickerModal({
    open, onClose, onSelect, clientId,
}: {
    open: boolean
    onClose: () => void
    onSelect: (asset: MediaAsset) => void
    clientId: string | null
}) {
    const [assets, setAssets] = useState<MediaAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (!open) return
        setLoading(true)
        getAllMediaAssets().then(res => {
            setAssets(res.data ?? [])
            setLoading(false)
        })
    }, [open])

    const filtered = assets.filter(a => {
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
        return matchSearch
    })

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <DialogHeader>
                    <DialogTitle className="text-white">Select Asset</DialogTitle>
                </DialogHeader>
                <Input
                    placeholder="Search assets…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No media found</p>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 pt-3">
                            {filtered.map(asset => (
                                <button
                                    key={asset.id}
                                    onClick={() => { onSelect(asset); onClose() }}
                                    className="group relative rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                                    style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    <AssetThumb url={asset.url} name={asset.name} mime={asset.mime_type} />
                                    <div className="absolute bottom-0 left-0 right-0 px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: 'rgba(0,0,0,0.7)' }}>
                                        <p className="text-xs text-white truncate">{asset.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Plan Editor ──────────────────────────────────────────────────────────────

function PlanEditor({
    planId, onBack, clients,
}: {
    planId: string
    onBack: () => void
    clients: Client[]
}) {
    const [plan, setPlan] = useState<GridPlan | null>(null)
    const [loading, setLoading] = useState(true)
    const [title, setTitle] = useState('')
    const [clientId, setClientId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerTarget, setPickerTarget] = useState<{ platform: string; position: number } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await getGridPlanWithItems(planId)
        if (data) {
            setPlan(data)
            setTitle(data.title)
            setClientId(data.client_id)
        }
        setLoading(false)
    }, [planId])

    useEffect(() => { load() }, [load])

    const saveHeader = async () => {
        if (!title.trim()) return
        setSaving(true)
        await updateGridPlan(planId, { title: title.trim(), client_id: clientId })
        setSaving(false)
    }

    const openPicker = (platform: string, position: number) => {
        setPickerTarget({ platform, position })
        setPickerOpen(true)
    }

    const handleAssetSelect = async (asset: MediaAsset) => {
        if (!pickerTarget) return
        await upsertGridPlanItem(planId, pickerTarget.platform, pickerTarget.position, {
            id: asset.id,
            url: asset.url,
            name: asset.name,
        })
        load()
    }

    const handleRemove = async (platform: string, position: number) => {
        await upsertGridPlanItem(planId, platform, position, null)
        load()
    }

    const handleSendForReview = async () => {
        setError(null)
        setSending(true)
        const res = await sendGridPlanForReview(planId)
        if (res.error) {
            setError(res.error)
        } else {
            setSent(true)
            load()
            setTimeout(() => setSent(false), 4000)
        }
        setSending(false)
    }

    const getItem = (platform: string, position: number): GridPlanItem | undefined =>
        plan?.items?.find(i => i.platform === platform && i.position === position)

    const totalAssets = plan?.items?.length ?? 0

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
    )

    const statusCfg = plan ? STATUS_CONFIG[plan.status] : null

    return (
        <div className="space-y-6">
            {/* Header bar */}
            <div className="flex items-center gap-4 flex-wrap">
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onBlur={saveHeader}
                        className="bg-transparent text-lg font-semibold text-white outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 transition-colors min-w-0 flex-1"
                        placeholder="Plan title…"
                    />
                    {statusCfg && (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                            style={{ color: statusCfg.color, background: statusCfg.bg }}>
                            {statusCfg.label}
                        </span>
                    )}
                </div>
                {/* Client selector */}
                <div className="relative">
                    <select
                        value={clientId ?? ''}
                        onChange={e => { setClientId(e.target.value || null); setTimeout(saveHeader, 100) }}
                        className="appearance-none text-sm rounded-lg px-3 py-1.5 pr-7 outline-none cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: clientId ? 'white' : 'rgba(255,255,255,0.4)' }}
                    >
                        <option value="">Select client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                    {sent && (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                            <Check className="h-4 w-4" /> Sent!
                        </span>
                    )}
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <Button
                        onClick={handleSendForReview}
                        disabled={sending || totalAssets === 0 || plan?.status === 'sent_for_review'}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send for Review
                    </Button>
                </div>
            </div>

            {/* Platform grid */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {PLATFORMS.map(platform => (
                    <div key={platform.id} className="rounded-xl p-4 space-y-3"
                        style={{ background: platform.bg, border: `1.5px solid ${platform.border}` }}>
                        {/* Platform header */}
                        <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{platform.emoji}</span>
                            <span className="text-sm font-semibold" style={{ color: platform.color }}>{platform.label}</span>
                            <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {plan?.items?.filter(i => i.platform === platform.id).length ?? 0}/{SLOTS_PER_PLATFORM}
                            </span>
                        </div>
                        {/* Slots */}
                        <div className="space-y-2">
                            {Array.from({ length: SLOTS_PER_PLATFORM }, (_, i) => i + 1).map(pos => (
                                <SlotCell
                                    key={pos}
                                    item={getItem(platform.id, pos)}
                                    position={pos}
                                    platformColor={platform.color}
                                    onAdd={() => openPicker(platform.id, pos)}
                                    onRemove={() => handleRemove(platform.id, pos)}
                                    onCaptionChange={() => {}}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {totalAssets === 0 && (
                <p className="text-center text-sm py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Click the <strong>+</strong> in any slot to assign assets from the library
                </p>
            )}

            {/* Asset picker */}
            <AssetPickerModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleAssetSelect}
                clientId={clientId}
            />
        </div>
    )
}

// ─── Plans List ───────────────────────────────────────────────────────────────

function PlansList({
    plans, loading, onOpen, onNew, onDelete,
}: {
    plans: GridPlan[]
    loading: boolean
    onOpen: (id: string) => void
    onNew: () => void
    onDelete: (id: string) => void
}) {
    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Grid Plans</h2>
                <Button onClick={onNew} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white">
                    <Plus className="h-4 w-4" /> New Plan
                </Button>
            </div>

            {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <ImageIcon className="h-12 w-12" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No grid plans yet</p>
                    <Button onClick={onNew} variant="outline" size="sm" className="gap-1.5 border-white/10 text-white/60 hover:text-white">
                        <Plus className="h-4 w-4" /> Create first plan
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map(plan => {
                        const cfg = STATUS_CONFIG[plan.status]
                        return (
                            <div
                                key={plan.id}
                                className="group rounded-xl p-4 space-y-3 cursor-pointer hover:ring-1 hover:ring-white/15 transition-all"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                onClick={() => onOpen(plan.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-white text-sm leading-snug">{plan.title}</p>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDelete(plan.id) }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                        style={{ color: cfg.color, background: cfg.bg }}>
                                        {cfg.label}
                                    </span>
                                    {plan.client_name && (
                                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan.client_name}</span>
                                    )}
                                </div>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    {new Date(plan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {plan.created_by_name && ` · ${plan.created_by_name}`}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── New Plan Modal ───────────────────────────────────────────────────────────

function NewPlanModal({
    open, onClose, clients, onCreate,
}: {
    open: boolean
    onClose: () => void
    clients: Client[]
    onCreate: (id: string) => void
}) {
    const [title, setTitle] = useState('')
    const [clientId, setClientId] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!title.trim()) return
        setCreating(true)
        setError(null)
        const res = await createGridPlan(title.trim(), clientId || null)
        if (res.error || !res.data) {
            setError(res.error ?? 'Failed to create plan')
        } else {
            setTitle('')
            setClientId('')
            onClose()
            onCreate(res.data.id)
        }
        setCreating(false)
    }

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-md"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <DialogHeader>
                    <DialogTitle className="text-white">New Grid Plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Plan Title</label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Week 1 Social Content"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Client (optional)</label>
                        <div className="relative">
                            <select
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                                className="w-full appearance-none text-sm rounded-lg px-3 py-2 pr-7 outline-none"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: clientId ? 'white' : 'rgba(255,255,255,0.4)' }}
                            >
                                <option value="">No client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
                        <Button onClick={handleCreate} disabled={!title.trim() || creating} className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create Plan
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function GridPlanner() {
    const [plans, setPlans] = useState<GridPlan[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loadingPlans, setLoadingPlans] = useState(true)
    const [openPlanId, setOpenPlanId] = useState<string | null>(null)
    const [showNewModal, setShowNewModal] = useState(false)

    const loadPlans = useCallback(async () => {
        setLoadingPlans(true)
        const [plansRes, clientsRes] = await Promise.all([
            getGridPlans(),
            getClientsForContent(),
        ])
        setPlans(plansRes.data ?? [])
        setClients(clientsRes.data ?? [])
        setLoadingPlans(false)
    }, [])

    useEffect(() => { loadPlans() }, [loadPlans])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this grid plan?')) return
        await deleteGridPlan(id)
        setPlans(prev => prev.filter(p => p.id !== id))
    }

    if (openPlanId) {
        return (
            <PlanEditor
                planId={openPlanId}
                onBack={() => { setOpenPlanId(null); loadPlans() }}
                clients={clients}
            />
        )
    }

    return (
        <>
            <PlansList
                plans={plans}
                loading={loadingPlans}
                onOpen={setOpenPlanId}
                onNew={() => setShowNewModal(true)}
                onDelete={handleDelete}
            />
            <NewPlanModal
                open={showNewModal}
                onClose={() => setShowNewModal(false)}
                clients={clients}
                onCreate={id => { setShowNewModal(false); setOpenPlanId(id) }}
            />
        </>
    )
}
