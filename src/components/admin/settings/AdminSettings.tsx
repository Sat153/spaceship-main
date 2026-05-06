'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Bell, Building2, Loader2, Check, Pencil, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    getMyProfile, updateMyProfile,
    getSystemSettings, upsertSystemSetting,
    getDepartmentsWithCount, createDepartment, updateDepartment, deleteDepartment,
} from '@/app/actions/settings'

type SettingsTab = 'profile' | 'approval' | 'departments'

// ─── Shared ────────────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{description}</p>}
            </div>
            {children}
        </div>
    )
}

function SaveBanner({ saved }: { saved: boolean }) {
    if (!saved) return null
    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-400"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Check className="h-4 w-4" /> Saved successfully
        </div>
    )
}

// ─── Profile Tab ────────────────────────────────────────────────────────────

function ProfileSection() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getMyProfile().then(({ data }) => {
            if (data) {
                setFirstName(data.first_name || '')
                setLastName(data.last_name || '')
                setEmail(data.email || '')
            }
            setLoading(false)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const res = await updateMyProfile({ first_name: firstName, last_name: lastName, email })
        if (res.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } else {
            setError(res.error)
        }
        setSaving(false)
    }

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>

    return (
        <SectionCard title="My Profile" description="Update your display name and email address.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">First Name</label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Last Name</label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-gray-400">Email Address</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white" />
                </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-3 pt-1">
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                </Button>
                <SaveBanner saved={saved} />
            </div>
        </SectionCard>
    )
}

// ─── Approval Settings Tab ──────────────────────────────────────────────────

function ApprovalSection() {
    const [whatsappNumber, setWhatsappNumber] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getSystemSettings().then(({ data }) => {
            setWhatsappNumber(data['akhilesh_whatsapp'] || '')
            setLoading(false)
        })
    }, [])

    const handleSave = async () => {
        if (!whatsappNumber.trim()) return
        setSaving(true)
        setError(null)
        const res = await upsertSystemSetting('akhilesh_whatsapp', whatsappNumber.trim())
        if (res.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } else {
            setError(res.error)
        }
        setSaving(false)
    }

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>

    return (
        <SectionCard
            title="Approval Workflow"
            description="WhatsApp number to notify when a content post is pending Akhilesh Ji's approval."
        >
            <div className="space-y-1 max-w-md">
                <label className="text-xs text-gray-400">Akhilesh Ji&apos;s WhatsApp Number</label>
                <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Include country code — e.g. +916377353765
                </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-3 pt-1">
                <Button onClick={handleSave} disabled={saving || !whatsappNumber.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save'}
                </Button>
                <SaveBanner saved={saved} />
            </div>
        </SectionCard>
    )
}

// ─── Department Management Tab ──────────────────────────────────────────────

interface Dept { id: string; name: string; description?: string | null; member_count: number }

function DepartmentsSection() {
    const [departments, setDepartments] = useState<Dept[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // New dept form
    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [creating, setCreating] = useState(false)

    // Edit inline
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const reload = async () => {
        setLoading(true)
        const { data } = await getDepartmentsWithCount()
        setDepartments((data as Dept[]) || [])
        setLoading(false)
    }

    useEffect(() => { reload() }, [])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        setError(null)
        const res = await createDepartment(newName, newDesc)
        if (res.success) {
            setShowNew(false)
            setNewName('')
            setNewDesc('')
            await reload()
        } else {
            setError(res.error)
        }
        setCreating(false)
    }

    const startEdit = (dept: Dept) => {
        setEditingId(dept.id)
        setEditName(dept.name)
        setEditDesc(dept.description || '')
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return
        setUpdatingId(id)
        setError(null)
        const res = await updateDepartment(id, editName, editDesc)
        if (res.success) {
            setEditingId(null)
            await reload()
        } else {
            setError(res.error)
        }
        setUpdatingId(null)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return
        setDeletingId(id)
        setError(null)
        const res = await deleteDepartment(id)
        if (res.success) {
            await reload()
        } else {
            setError(res.error)
        }
        setDeletingId(null)
    }

    return (
        <SectionCard title="Department Management" description="Create, rename, or remove departments. You cannot delete a department that still has members.">
            {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
            ) : (
                <div className="space-y-2">
                    {departments.map(dept => (
                        <div key={dept.id}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                <Building2 className="h-4 w-4 text-white" />
                            </div>

                            {editingId === dept.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <Input value={editName} onChange={e => setEditName(e.target.value)}
                                        className="bg-gray-800 border-gray-600 text-white h-8 text-sm flex-1" />
                                    <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                        placeholder="Description (optional)"
                                        className="bg-gray-800 border-gray-600 text-white h-8 text-sm flex-1" />
                                    <Button size="sm" onClick={() => handleUpdate(dept.id)} disabled={updatingId === dept.id}
                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3">
                                        {updatingId === dept.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}
                                        className="h-8 text-gray-400 hover:text-white px-2">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{dept.name}</p>
                                        {dept.description && (
                                            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{dept.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                        style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        {dept.member_count} member{dept.member_count !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button size="icon" variant="ghost" onClick={() => startEdit(dept)}
                                            className="h-7 w-7 text-gray-400 hover:text-white">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(dept.id, dept.name)}
                                            disabled={deletingId === dept.id || dept.member_count > 0}
                                            className="h-7 w-7 text-gray-400 hover:text-red-400 disabled:opacity-30">
                                            {deletingId === dept.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {/* New Department Form */}
                    {showNew ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.05)', border: '1px dashed rgba(99,102,241,0.3)' }}>
                            <Input value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="Department name *"
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                className="bg-gray-800 border-gray-600 text-white h-8 text-sm flex-1"
                                autoFocus />
                            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="bg-gray-800 border-gray-600 text-white h-8 text-sm flex-1" />
                            <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}
                                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white px-3">
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewName(''); setNewDesc('') }}
                                className="h-8 text-gray-400 hover:text-white px-2">
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <button onClick={() => setShowNew(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm transition-colors"
                            style={{ background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}>
                            <Plus className="h-4 w-4" /> Add Department
                        </button>
                    )}
                </div>
            )}
        </SectionCard>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'approval', label: 'Approval Settings', icon: Bell },
    { id: 'departments', label: 'Departments', icon: Building2 },
]

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    Settings
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Manage your profile, approval workflow, and department structure.
                </p>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 p-1 rounded-xl w-fit"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const active = activeTab === tab.id
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                                color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                                border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                            }}>
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'profile' && <ProfileSection />}
            {activeTab === 'approval' && <ApprovalSection />}
            {activeTab === 'departments' && <DepartmentsSection />}
        </div>
    )
}
