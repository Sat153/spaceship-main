'use client'

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
    Users, UserPlus, Trash2, Mail, Phone, Building2, Calendar,
    Shield, ArrowLeft, Palette, Share2, Briefcase,
    DollarSign, Heart, Target, Settings2, User, Folder,
    ChevronRight, Pencil, X, Check, Plus
} from "lucide-react"
import { useDepartments } from "@/hooks/admin/useDepartments"
import { inviteTeamMember, deleteTeamMember, updateTeamMember } from "@/app/actions/admin-team"
import { createDepartment } from "@/app/actions/admin-departments"
import { useAdminTeamMembers } from "@/hooks/useSWR"

interface TeamMember {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    created_at: string
    department_name: string
    department_id?: string
    phone?: string
}

type View = 'departments' | 'members' | 'detail'

const DEPT_STYLES: Record<string, { icon: any; color: string; bg: string; border: string; badge: string; iconColor: string; folderBg: string }> = {
    'Creative Labs':      { icon: Palette,   color: '#60a5fa', bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300',   iconColor: 'text-blue-400',   folderBg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
    'PR & Social Media':  { icon: Share2,    color: '#c084fc', bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300', iconColor: 'text-purple-400', folderBg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20' },
    'Administration':     { icon: Building2, color: '#4ade80', bg: 'bg-green-500/10',  border: 'border-green-500/20',  badge: 'bg-green-500/20 text-green-300',  iconColor: 'text-green-400',  folderBg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20' },
    'Finance':            { icon: DollarSign,color: '#facc15', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300', iconColor: 'text-yellow-400', folderBg: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20' },
    'HR':                 { icon: Heart,     color: '#f472b6', bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   badge: 'bg-pink-500/20 text-pink-300',   iconColor: 'text-pink-400',   folderBg: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20' },
    'Leads and Managers': { icon: Target,    color: '#f87171', bg: 'bg-red-500/10',    border: 'border-red-500/20',    badge: 'bg-red-500/20 text-red-300',    iconColor: 'text-red-400',    folderBg: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' },
    'Operations':         { icon: Settings2, color: '#94a3b8', bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  badge: 'bg-slate-500/20 text-slate-300',  iconColor: 'text-slate-400',  folderBg: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20' },
    'Tech Team':          { icon: Settings2, color: '#34d399', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300', iconColor: 'text-emerald-400', folderBg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20' },
}

const DEFAULT_STYLE = { icon: Folder, color: '#94a3b8', bg: 'bg-gray-500/10', border: 'border-gray-500/20', badge: 'bg-gray-500/20 text-gray-300', iconColor: 'text-gray-400', folderBg: 'bg-gray-700/50 hover:bg-gray-700 border-gray-600' }

// Designation lookup — maps member first name to their real job title
const DESIGNATIONS: Record<string, string> = {
    'Rupin':     'Graphic Designer',
    'Deepanshu': 'Graphic Designer',
    'Robin':     'Video Editor',
    'Vishal':    'Video Editor',
    'Mohit':     'Video Editor',
    'Utkarsh':   'Social Media Manager',
    'Ishika':    'Social Media Manager',
    'Prashant':  'Founder',
    'HR':        'HR & Administration',
    'Satyam':    'AI Engineer',
}

function getDesignation(member: TeamMember): string {
    const key = (member.first_name || '').trim()
    return DESIGNATIONS[key] || (member.role === 'admin' ? 'Admin' : 'Team Member')
}

function getStyle(deptName: string) {
    return DEPT_STYLES[deptName] || DEFAULT_STYLE
}

function getInitials(first: string, last: string) {
    return `${(first || '?').charAt(0)}${(last || '').charAt(0)}`.toUpperCase()
}

export default function AdminTeamMembers() {
    const { members: teamMembers, isLoading: loading, refresh: refreshTeamMembers } = useAdminTeamMembers()
    const { departments } = useDepartments()

    const [view, setView] = useState<View>('departments')
    const [activeDept, setActiveDept] = useState<string>('')
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ first_name: '', last_name: '', email: '', department_id: '' })
    const [editLoading, setEditLoading] = useState(false)

    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [inviteData, setInviteData] = useState({ email: '', first_name: '', last_name: '', role: 'user', department_id: '', custom_message: '' })
    const [inviteLoading, setInviteLoading] = useState(false)

    const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false)
    const [newDeptName, setNewDeptName] = useState('')
    const [createDeptLoading, setCreateDeptLoading] = useState(false)
    const [createDeptError, setCreateDeptError] = useState('')

    // Group members by department
    const membersByDept = useMemo(() => {
        const map: Record<string, TeamMember[]> = {}
        teamMembers.forEach((m: TeamMember) => {
            const key = m.department_name || 'No Department'
            if (!map[key]) map[key] = []
            map[key].push(m)
        })
        return map
    }, [teamMembers])

    const deptNames = useMemo(() => {
        const fromMembers = Object.keys(membersByDept)
        const fromDepts = departments.map((d: any) => d.name)
        const all = Array.from(new Set([...fromDepts, ...fromMembers]))
        return all.filter(n => n !== 'No Department')
    }, [membersByDept, departments])

    const handleInvite = async () => {
        try {
            setInviteLoading(true)
            const result = await inviteTeamMember(inviteData)
            if (result.success) {
                alert('Invitation sent! The user will receive an email.')
                setIsInviteOpen(false)
                setInviteData({ email: '', first_name: '', last_name: '', role: 'user', department_id: '', custom_message: '' })
                refreshTeamMembers()
            } else {
                alert(`Failed: ${result.error}`)
            }
        } catch {
            alert('Failed to invite member')
        } finally {
            setInviteLoading(false)
        }
    }

    const handleCreateDept = async () => {
        if (!newDeptName.trim()) { setCreateDeptError('Name is required'); return }
        setCreateDeptLoading(true)
        setCreateDeptError('')
        const result = await createDepartment({ name: newDeptName.trim() })
        setCreateDeptLoading(false)
        if (result.success) {
            setIsCreateDeptOpen(false)
            setNewDeptName('')
            refreshTeamMembers()
        } else {
            setCreateDeptError(result.error || 'Failed to create department')
        }
    }

    const startEdit = (member: TeamMember) => {
        setEditData({
            first_name: member.first_name || '',
            last_name: member.last_name || '',
            email: member.email || '',
            department_id: member.department_id || '',
        })
        setIsEditing(true)
    }

    const handleSaveEdit = async () => {
        if (!selectedMember) return
        setEditLoading(true)
        const result = await updateTeamMember(selectedMember.id, editData)
        if (result.success) {
            setIsEditing(false)
            refreshTeamMembers()
            // Update local selectedMember so detail view reflects changes instantly
            setSelectedMember(prev => prev ? {
                ...prev,
                first_name: editData.first_name,
                last_name: editData.last_name,
                email: editData.email,
                department_id: editData.department_id,
                department_name: departments.find((d: any) => d.id === editData.department_id)?.name || prev.department_name,
            } : null)
        } else {
            alert(result.error || 'Failed to update')
        }
        setEditLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this team member? This cannot be undone.')) return
        const result = await deleteTeamMember(id)
        if (result.success) {
            setView('members')
            setSelectedMember(null)
            refreshTeamMembers()
        } else {
            alert(result.error || 'Failed to delete')
        }
    }

    // ─── View: Department Folders ────────────────────────────────────────────
    if (view === 'departments') {
        return (
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Team Members</h2>
                        <p className="text-gray-400 mt-1">Select a department to view its members</p>
                    </div>
                    <Button onClick={() => setIsInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptNames.map(deptName => {
                            const style = getStyle(deptName)
                            const DeptIcon = style.icon
                            const count = membersByDept[deptName]?.length || 0
                            return (
                                <button
                                    key={deptName}
                                    onClick={() => { setActiveDept(deptName); setView('members') }}
                                    className={`text-left p-5 rounded-xl border transition-all duration-200 ${style.folderBg} group`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${style.bg} border ${style.border}`}>
                                            <DeptIcon className={`h-6 w-6 ${style.iconColor}`} />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors mt-1" />
                                    </div>
                                    <h3 className="text-white font-semibold text-base mb-1">{deptName}</h3>
                                    <p className="text-gray-400 text-sm">
                                        {count} {count === 1 ? 'member' : 'members'}
                                    </p>
                                </button>
                            )
                        })}
                        {/* Add Department card */}
                        <button
                            onClick={() => { setNewDeptName(''); setCreateDeptError(''); setIsCreateDeptOpen(true) }}
                            className="text-left p-5 rounded-xl border border-dashed border-gray-600 hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-200 group flex flex-col items-center justify-center min-h-[120px]"
                        >
                            <div className="p-3 rounded-lg bg-gray-700 border border-gray-600 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 mb-3">
                                <Plus className="h-6 w-6 text-gray-400 group-hover:text-blue-400" />
                            </div>
                            <span className="text-gray-400 group-hover:text-blue-400 font-medium text-sm">New Department</span>
                        </button>
                    </div>
                )}

                <InviteDialog
                    open={isInviteOpen}
                    onOpenChange={setIsInviteOpen}
                    inviteData={inviteData}
                    setInviteData={setInviteData}
                    departments={departments}
                    onInvite={handleInvite}
                    loading={inviteLoading}
                />

                {/* Create Department Dialog */}
                <Dialog open={isCreateDeptOpen} onOpenChange={setIsCreateDeptOpen}>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white">
                        <DialogHeader>
                            <DialogTitle>New Department</DialogTitle>
                            <DialogDescription className="text-gray-400">Create a new department for your team.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Department Name</Label>
                                <Input
                                    value={newDeptName}
                                    onChange={(e: any) => setNewDeptName(e.target.value)}
                                    placeholder="e.g. Operations and Strategy"
                                    className="bg-gray-900 border-gray-600 text-white"
                                    onKeyDown={(e: any) => e.key === 'Enter' && handleCreateDept()}
                                />
                                {createDeptError && <p className="text-red-400 text-sm">{createDeptError}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDeptOpen(false)} className="text-white border-gray-600 bg-gray-800 hover:bg-gray-700">Cancel</Button>
                            <Button onClick={handleCreateDept} disabled={createDeptLoading || !newDeptName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {createDeptLoading ? 'Creating...' : 'Create Department'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    // ─── View: Members in Department ─────────────────────────────────────────
    if (view === 'members') {
        const style = getStyle(activeDept)
        const DeptIcon = style.icon
        const members: TeamMember[] = membersByDept[activeDept] || []

        return (
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setView('departments')} className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className={`p-2 rounded-lg ${style.bg} border ${style.border}`}>
                            <DeptIcon className={`h-5 w-5 ${style.iconColor}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{activeDept}</h2>
                            <p className="text-gray-400 text-sm">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                    </Button>
                </div>

                {members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className={`p-4 rounded-full ${style.bg} border ${style.border} mb-4`}>
                            <Users className={`h-8 w-8 ${style.iconColor}`} />
                        </div>
                        <p className="text-white font-medium">No members yet</p>
                        <p className="text-gray-400 text-sm mt-1">Invite someone to this department</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members.map(member => (
                            <button
                                key={member.id}
                                onClick={() => { setSelectedMember(member); setView('detail') }}
                                className={`text-left p-4 rounded-xl border ${style.bg} ${style.border} hover:brightness-125 transition-all duration-200 group`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${style.badge}`}>
                                        {getInitials(member.first_name, member.last_name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-semibold text-sm truncate">
                                            {member.first_name} {member.last_name}
                                        </p>
                                        <p className={`text-xs font-medium ${style.iconColor}`}>{getDesignation(member)}</p>
                                        <p className="text-gray-400 text-xs truncate mt-0.5">{member.email}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <InviteDialog
                    open={isInviteOpen}
                    onOpenChange={setIsInviteOpen}
                    inviteData={inviteData}
                    setInviteData={setInviteData}
                    departments={departments}
                    onInvite={handleInvite}
                    loading={inviteLoading}
                />
            </div>
        )
    }

    // ─── View: Member Detail ──────────────────────────────────────────────────
    if (view === 'detail' && selectedMember) {
        const style = getStyle(selectedMember.department_name || activeDept)
        const DeptIcon = style.icon

        return (
            <div className="p-6 max-w-2xl">
                {/* Back */}
                <button
                    onClick={() => { setView('members'); setSelectedMember(null); setIsEditing(false) }}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to {activeDept}
                </button>

                {/* Profile Card */}
                <div className={`rounded-2xl border ${style.border} ${style.bg} p-6 mb-4`}>
                    {/* Avatar + name + edit button */}
                    <div className="flex items-start gap-5 mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0 ${style.badge}`}>
                            {getInitials(
                                isEditing ? editData.first_name : selectedMember.first_name,
                                isEditing ? editData.last_name : selectedMember.last_name
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-white">
                                {selectedMember.first_name} {selectedMember.last_name}
                            </h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.badge} ${style.border}`}>
                                    {getDesignation(selectedMember)}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.badge} ${style.border} flex items-center gap-1`}>
                                    <DeptIcon className="h-3 w-3" />
                                    {selectedMember.department_name}
                                </span>
                            </div>
                        </div>
                        {/* Edit / Cancel toggle */}
                        {!isEditing ? (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(selectedMember)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 shrink-0">
                                <Pencil className="h-4 w-4 mr-1.5" /> Edit
                            </Button>
                        ) : (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 shrink-0">
                                <X className="h-4 w-4 mr-1.5" /> Cancel
                            </Button>
                        )}
                    </div>

                    {/* Details — read mode */}
                    {!isEditing && (
                        <div className="space-y-3">
                            <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedMember.email} />
                            <DetailRow icon={<Building2 className="h-4 w-4" />} label="Department" value={selectedMember.department_name} />
                            <DetailRow icon={<Shield className="h-4 w-4" />} label="Designation" value={getDesignation(selectedMember)} />
                            <DetailRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={new Date(selectedMember.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                        </div>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-xs">First Name</Label>
                                    <Input value={editData.first_name}
                                        onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))}
                                        className="bg-gray-800 border-gray-600 text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-xs">Last Name</Label>
                                    <Input value={editData.last_name}
                                        onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))}
                                        className="bg-gray-800 border-gray-600 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-gray-400 text-xs">Email</Label>
                                <Input type="email" value={editData.email}
                                    onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
                                    className="bg-gray-800 border-gray-600 text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-gray-400 text-xs">Department</Label>
                                <Select value={editData.department_id} onValueChange={v => setEditData(p => ({ ...p, department_id: v }))}>
                                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        {departments.map((d: any) => (
                                            <SelectItem key={d.id} value={d.id} className="text-white">{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSaveEdit} disabled={editLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                                <Check className="h-4 w-4 mr-2" />
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Delete */}
                {!isEditing && (
                    <Button
                        variant="outline"
                        onClick={() => handleDelete(selectedMember.id)}
                        className="text-red-400 border-red-600/50 hover:bg-red-600/20 hover:text-red-300"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                    </Button>
                )}
            </div>
        )
    }

    return null
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
            <div className="text-gray-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-white text-sm mt-0.5 truncate">{value}</p>
            </div>
        </div>
    )
}

function InviteDialog({ open, onOpenChange, inviteData, setInviteData, departments, onInvite, loading }: any) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Invite New Team Member</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        They will receive an email to set up their account.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input value={inviteData.first_name} onChange={(e: any) => setInviteData({ ...inviteData, first_name: e.target.value })} className="bg-gray-700 border-gray-600" />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input value={inviteData.last_name} onChange={(e: any) => setInviteData({ ...inviteData, last_name: e.target.value })} className="bg-gray-700 border-gray-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={inviteData.email} onChange={(e: any) => setInviteData({ ...inviteData, email: e.target.value })} className="bg-gray-700 border-gray-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={inviteData.role} onValueChange={(v: any) => setInviteData({ ...inviteData, role: v })}>
                                <SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-gray-700 border-gray-600">
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={inviteData.department_id} onValueChange={(v: any) => setInviteData({ ...inviteData, department_id: v })}>
                                <SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Select Department" /></SelectTrigger>
                                <SelectContent className="bg-gray-700 border-gray-600">
                                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Custom Message (Optional)</Label>
                        <Textarea value={inviteData.custom_message} onChange={(e: any) => setInviteData({ ...inviteData, custom_message: e.target.value })} className="bg-gray-700 border-gray-600 min-h-[80px]" placeholder="Personal note to include in the invite..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-white hover:bg-gray-700">Cancel</Button>
                    <Button onClick={onInvite} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
