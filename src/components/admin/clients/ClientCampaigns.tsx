'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCampaigns, createCampaign, deleteCampaign, updateCampaignStatus, getCampaignFolders, Campaign } from '@/app/actions/campaigns'
import { getAssets, uploadFile, deleteAsset, Asset } from '@/app/actions/assets'
import { AssetGrid } from '@/components/admin/assets/AssetGrid'
import { AssetUploader } from '@/components/admin/assets/AssetUploader'
import { Plus, ArrowLeft, Trash2, Image, Video, FileText, Loader2, FolderOpen, MoreVertical, CheckCircle, PauseCircle, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CAMPAIGN_TYPES = ['general', 'protest', 'awareness', 'social_media', 'election', 'press', 'event']

const TYPE_COLORS: Record<string, string> = {
    protest: 'rgba(239,68,68,0.15)',
    awareness: 'rgba(59,130,246,0.15)',
    social_media: 'rgba(139,92,246,0.15)',
    election: 'rgba(245,158,11,0.15)',
    press: 'rgba(16,185,129,0.15)',
    event: 'rgba(236,72,153,0.15)',
    general: 'rgba(107,114,128,0.15)',
}

const STATUS_STYLES: Record<string, { label: string; color: string; dot: string }> = {
    active: { label: 'Active', color: '#34d399', dot: '#34d399' },
    paused: { label: 'Paused', color: '#f59e0b', dot: '#f59e0b' },
    completed: { label: 'Completed', color: '#60a5fa', dot: '#60a5fa' },
    archived: { label: 'Archived', color: '#6b7280', dot: '#6b7280' },
}

// ── Media viewer inside a campaign ──────────────────────────────────────────
function CampaignMedia({ folderId, clientId, label }: { folderId: string; clientId: string; label: string }) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showUpload, setShowUpload] = useState(false)
    const [currentFolder, setCurrentFolder] = useState(folderId)
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: folderId, name: label }])

    const load = useCallback(async () => {
        setLoading(true)
        const res = await getAssets(undefined, currentFolder, clientId)
        setAssets(res.data || [])
        setLoading(false)
    }, [currentFolder, clientId])

    useEffect(() => { load() }, [load])

    const handleNavigate = (id: string) => {
        const folder = assets.find(a => a.id === id)
        if (folder) {
            setCurrentFolder(id)
            setBreadcrumbs(prev => [...prev, { id, name: folder.name }])
        }
    }

    const handleBack = () => {
        if (breadcrumbs.length <= 1) return
        const prev = breadcrumbs[breadcrumbs.length - 2]
        setBreadcrumbs(b => b.slice(0, -1))
        setCurrentFolder(prev.id)
    }

    const handleUpload = async (files: File[]) => {
        setUploading(true)
        for (const file of files) {
            const fd = new FormData()
            fd.append('file', file)
            await uploadFile(fd, currentFolder, clientId)
        }
        setUploading(false)
        setShowUpload(false)
        load()
    }

    const handleDelete = async (id: string) => {
        await deleteAsset(id)
        load()
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {breadcrumbs.map((b, i) => (
                        <span key={b.id} className="flex items-center gap-1">
                            {i > 0 && <span>/</span>}
                            <button
                                onClick={() => {
                                    setBreadcrumbs(prev => prev.slice(0, i + 1))
                                    setCurrentFolder(b.id)
                                }}
                                className={i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-white'}
                            >{b.name}</button>
                        </span>
                    ))}
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
                >
                    <Plus className="w-4 h-4" /> Upload
                </button>
            </div>

            {showUpload && (
                <div className="mb-4">
                    <AssetUploader onUpload={handleUpload} onClose={() => setShowUpload(false)} />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center flex-1 py-12">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
                    <FolderOpen className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No files yet — upload to get started</p>
                </div>
            ) : (
                <AssetGrid assets={assets} onNavigate={handleNavigate} onDelete={handleDelete} viewMode="grid" />
            )}
        </div>
    )
}

// ── Campaign detail (3 tabs: Images / Videos / Content) ─────────────────────
function CampaignDetail({ campaign, clientId, onBack }: { campaign: Campaign; clientId: string; onBack: () => void }) {
    const [tab, setTab] = useState<'Images' | 'Videos' | 'Content'>('Images')
    const [folders, setFolders] = useState<{ images: string | null; videos: string | null; content: string | null }>({ images: null, videos: null, content: null })
    const [loadingFolders, setLoadingFolders] = useState(true)

    useEffect(() => {
        if (!campaign.folder_id) return
        getCampaignFolders(campaign.folder_id).then(f => {
            setFolders(f)
            setLoadingFolders(false)
        })
    }, [campaign.folder_id])

    const tabs: { key: 'Images' | 'Videos' | 'Content'; icon: any; folderId: string | null }[] = [
        { key: 'Images', icon: Image, folderId: folders.images },
        { key: 'Videos', icon: Video, folderId: folders.videos },
        { key: 'Content', icon: FileText, folderId: folders.content },
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div>
                    <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                    <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{campaign.type} campaign</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_STYLES[campaign.status]?.dot || '#6b7280' }} />
                    <span className="text-xs" style={{ color: STATUS_STYLES[campaign.status]?.color || '#6b7280' }}>
                        {STATUS_STYLES[campaign.status]?.label || campaign.status}
                    </span>
                </div>
            </div>

            {/* Media tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {tabs.map(t => {
                    const Icon = t.icon
                    const active = tab === t.key
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                                color: active ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                                border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                            }}
                        >
                            <Icon className="w-4 h-4" /> {t.key}
                        </button>
                    )
                })}
            </div>

            {/* Media content */}
            <div className="flex-1 overflow-y-auto">
                {loadingFolders ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                ) : (
                    (() => {
                        const activeTab = tabs.find(t => t.key === tab)
                        if (!activeTab?.folderId) return (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Folder not set up yet</p>
                            </div>
                        )
                        return <CampaignMedia folderId={activeTab.folderId} clientId={clientId} label={tab} />
                    })()
                )}
            </div>
        </div>
    )
}

// ── Campaign list ────────────────────────────────────────────────────────────
export default function ClientCampaigns({ clientId }: { clientId: string }) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

    const [creating, setCreating] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState('general')
    const [newDesc, setNewDesc] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await getCampaigns(clientId)
        setCampaigns(data || [])
        setLoading(false)
    }, [clientId])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const { data, error } = await createCampaign(clientId, newName.trim(), newType, newDesc.trim() || undefined)
        setCreating(false)
        if (error) { alert(error); return }
        setShowCreate(false)
        setNewName(''); setNewType('general'); setNewDesc('')
        load()
        if (data) setSelectedCampaign(data)
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Delete this campaign?')) return
        await deleteCampaign(id)
        load()
    }

    const handleStatusChange = async (id: string, status: string, e: React.MouseEvent) => {
        e.stopPropagation()
        await updateCampaignStatus(id, status)
        load()
    }

    if (selectedCampaign) {
        return (
            <div className="h-full p-6 overflow-y-auto">
                <CampaignDetail
                    campaign={selectedCampaign}
                    clientId={clientId}
                    onBack={() => { setSelectedCampaign(null); load() }}
                />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-white">Campaigns</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
                >
                    <Plus className="w-4 h-4" /> New Campaign
                </button>
            </div>

            {/* Campaign cards */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <FolderOpen className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.12)' }} />
                    <div className="text-center">
                        <p className="text-sm font-medium text-white mb-1">No campaigns yet</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Create your first campaign to organise media</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="text-sm text-blue-400 hover:text-blue-300 underline">Create campaign</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {campaigns.map(c => {
                        const st = STATUS_STYLES[c.status] || STATUS_STYLES.active
                        return (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCampaign(c)}
                                className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01] group relative"
                                style={{ background: TYPE_COLORS[c.type] || TYPE_COLORS.general, border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                {/* Status + menu */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                                        <span className="text-xs" style={{ color: st.color }}>{st.label}</span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <button className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10">
                                                <MoreVertical className="w-4 h-4 text-white/60" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-gray-900 border-gray-700">
                                            {['active', 'paused', 'completed', 'archived'].filter(s => s !== c.status).map(s => (
                                                <DropdownMenuItem key={s} className="text-white hover:bg-gray-800 capitalize cursor-pointer"
                                                    onClick={e => handleStatusChange(c.id, s, e as any)}>
                                                    Mark as {s}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuItem className="text-red-400 hover:bg-gray-800 cursor-pointer"
                                                onClick={e => handleDelete(c.id, e as any)}>
                                                Delete campaign
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h4 className="text-base font-bold text-white mb-1">{c.name}</h4>
                                {c.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{c.description}</p>}

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                                        {c.type.replace('_', ' ')}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        <Image className="w-3 h-3" /> <Video className="w-3 h-3" /> <FileText className="w-3 h-3" />
                                        <span className="ml-1">3 folders</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create campaign dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">New Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Campaign Name *</label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Protest Campaign 2026"
                                className="bg-gray-800 border-gray-700 text-white"
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Type</label>
                            <div className="flex flex-wrap gap-2">
                                {CAMPAIGN_TYPES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewType(t)}
                                        className="px-3 py-1 rounded-full text-xs capitalize transition-all"
                                        style={{
                                            background: newType === t ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                            border: newType === t ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                            color: newType === t ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                                        }}
                                    >{t.replace('_', ' ')}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Description <span className="text-gray-600">(optional)</span></label>
                            <Input
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Brief description..."
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancel</Button>
                        <Button onClick={handleCreate} disabled={!newName.trim() || creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : 'Create Campaign'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
