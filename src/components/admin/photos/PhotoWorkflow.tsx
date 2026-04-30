'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Loader2, ImageIcon, Building2, User, Upload, X, Plus, CheckCircle2, AlertCircle, Bell
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    getRawPhotos, getDepartmentsAndProfiles, assignRawPhoto,
    updateRawPhotoStatus, createRawPhoto,
    RawPhoto, Department, Profile
} from '@/app/actions/photo-workflow'
import { sendPhotoApprovalRequest } from '@/app/actions/photo-approval'

const STATUS_CONFIG = {
    assigned:    { label: 'Assigned',    cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    in_progress: { label: 'In Progress', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    completed:   { label: 'Completed',   cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
    rejected:    { label: 'Rejected',    cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ departments, profiles, onClose, onUploaded }: {
    departments: Department[]
    profiles: Profile[]
    onClose: () => void
    onUploaded: () => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [deptId, setDeptId] = useState('')
    const [personId, setPersonId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const filteredProfiles = deptId
        ? profiles.filter(p => p.department_id === deptId)
        : profiles

    const handleFile = (f: File) => {
        setFile(f)
        setPreview(URL.createObjectURL(f))
        setError(null)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f && f.type.startsWith('image/')) handleFile(f)
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setError(null)

        try {
            const ext = file.name.split('.').pop()
            const path = `raw-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

            const { error: storageErr } = await supabase.storage
                .from('team-assets')
                .upload(path, file, { upsert: false })

            if (storageErr) throw new Error(storageErr.message)

            const { data: urlData } = supabase.storage
                .from('team-assets')
                .getPublicUrl(path)

            const { error: dbErr } = await createRawPhoto(
                urlData.publicUrl,
                personId || null,
                deptId || null
            )

            if (dbErr) throw new Error(dbErr)

            setDone(true)
            setTimeout(() => {
                onUploaded()
                onClose()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-400" />
                        Upload Raw Photo
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Drop zone */}
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            preview ? 'border-blue-500/50' : 'border-gray-700 hover:border-gray-500'
                        }`}
                    >
                        {preview ? (
                            <div className="relative">
                                <img src={preview} alt="preview" className="w-full h-52 object-cover rounded-xl" />
                                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <p className="text-white text-sm">Click to change</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <ImageIcon className="h-10 w-10 mb-3" />
                                <p className="text-sm font-medium text-gray-400">Drop image here or click to browse</p>
                                <p className="text-xs mt-1">PNG, JPG, WEBP supported</p>
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                    </div>

                    {/* Assignment */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign To</p>

                        {/* Department */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" /> Department
                            </label>
                            <Select value={deptId || 'none'} onValueChange={v => { setDeptId(v === 'none' ? '' : v); setPersonId('') }}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-10">
                                    <SelectValue placeholder="Select department (optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="none" className="text-gray-400">No department</SelectItem>
                                    {departments.map(d => (
                                        <SelectItem key={d.id} value={d.id} className="text-white">{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Person */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" /> Person
                            </label>
                            <Select value={personId || 'none'} onValueChange={v => {
                                const val = v === 'none' ? '' : v
                                setPersonId(val)
                                if (val) {
                                    const person = profiles.find(p => p.id === val)
                                    if (person?.department_id && !deptId) setDeptId(person.department_id)
                                }
                            }}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-10">
                                    <SelectValue placeholder="Select person (optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="none" className="text-gray-400">Unassigned</SelectItem>
                                    {filteredProfiles.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="text-white">
                                            {p.first_name} {p.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {deptId && filteredProfiles.length === 0 && (
                                <p className="text-xs text-gray-500">No members in this department</p>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="flex-1 text-gray-400 hover:text-white border border-gray-700">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading || done}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {done ? (
                                <><CheckCircle2 className="h-4 w-4 mr-2" /> Uploaded!</>
                            ) : uploading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                                <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Inline assign dropdowns on each card ──────────────────────────────────────
function AssignDropdown({ photo, departments, profiles, onAssigned }: {
    photo: RawPhoto
    departments: Department[]
    profiles: Profile[]
    onAssigned: () => void
}) {
    const [deptId, setDeptId] = useState(photo.department_id || '')
    const [personId, setPersonId] = useState(photo.assignee_id || '')
    const [saving, setSaving] = useState(false)

    const filteredProfiles = deptId ? profiles.filter(p => p.department_id === deptId) : profiles

    const save = async (newPersonId: string, newDeptId: string) => {
        setSaving(true)
        await assignRawPhoto(photo.id, newPersonId || null, newDeptId || null)
        setSaving(false)
        onAssigned()
    }

    const handleDept = (v: string) => {
        const val = v === 'none' ? '' : v
        setDeptId(val)
        setPersonId('')
        save('', val)
    }

    const handlePerson = (v: string) => {
        const val = v === 'none' ? '' : v
        setPersonId(val)
        const person = profiles.find(p => p.id === val)
        const dept = deptId || person?.department_id || ''
        if (person?.department_id && !deptId) setDeptId(person.department_id)
        save(val, dept)
    }

    return (
        <div className="flex gap-2 mt-3 flex-wrap items-center">
            {saving && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
            <Select value={deptId || 'none'} onValueChange={handleDept}>
                <SelectTrigger className="h-7 w-40 bg-gray-700 border-gray-600 text-white text-xs">
                    <Building2 className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="none" className="text-gray-400 text-xs">No dept</SelectItem>
                    {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-white text-xs">{d.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={personId || 'none'} onValueChange={handlePerson}>
                <SelectTrigger className="h-7 w-40 bg-gray-700 border-gray-600 text-white text-xs">
                    <User className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="none" className="text-gray-400 text-xs">Unassigned</SelectItem>
                    {filteredProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white text-xs">
                            {p.first_name} {p.last_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PhotoWorkflow() {
    const [photos, setPhotos] = useState<RawPhoto[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('all')
    const [showUpload, setShowUpload] = useState(false)
    const [sendingApproval, setSendingApproval] = useState<string | null>(null)

    const fetchAll = async () => {
        const [photosData, { departments: depts, profiles: profs }] = await Promise.all([
            getRawPhotos(),
            getDepartmentsAndProfiles(),
        ])
        setPhotos(photosData)
        setDepartments(depts)
        setProfiles(profs)
        setLoading(false)
    }

    useEffect(() => { fetchAll() }, [])

    const handleStatusChange = async (photoId: string, status: RawPhoto['status']) => {
        await updateRawPhotoStatus(photoId, status)
        fetchAll()
    }

    const handleSendForApproval = async (photoId: string) => {
        setSendingApproval(photoId)
        const result = await sendPhotoApprovalRequest(photoId)
        setSendingApproval(null)
        if (result.success) {
            alert('Sent! Akhilesh Ji will receive an email with the photo for approval.')
        } else {
            alert(`Failed: ${result.error}`)
        }
    }

    const filtered = filterStatus === 'all' ? photos : photos.filter(p => p.status === filterStatus)

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
    )

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Photo Workflow</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Upload and assign raw photos to departments or team members</p>
                    </div>
                    <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Plus className="h-4 w-4" /> Upload Photo
                    </Button>
                </div>

                {/* Status filters */}
                <div className="flex gap-2 flex-wrap">
                    {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {s === 'all'
                                ? `All (${photos.length})`
                                : `${STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label} (${photos.filter(p => p.status === s).length})`
                            }
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-6">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <ImageIcon className="h-12 w-12 text-gray-600 mb-4" />
                        <p className="text-white font-medium mb-1">No photos here</p>
                        <p className="text-gray-500 text-sm mb-4">Upload a photo to get started</p>
                        <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Plus className="h-4 w-4" /> Upload Photo
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(photo => {
                            const statusCfg = STATUS_CONFIG[photo.status]
                            return (
                                <Card key={photo.id} className="bg-gray-800 border-gray-700">
                                    <CardContent className="p-0">
                                        {/* Image */}
                                        <div className="relative">
                                            <img
                                                src={photo.image_url}
                                                alt={photo.photo_id}
                                                className="w-full h-48 object-cover rounded-t-lg"
                                            />
                                            <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded border ${statusCfg.cls}`}>
                                                {statusCfg.label}
                                            </span>
                                            <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-black/60 text-gray-300 font-mono">
                                                {photo.photo_id}
                                            </span>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            {/* Current assignment badges */}
                                            <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                                                {(photo.department as any)?.name && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        {(photo.department as any).name}
                                                    </span>
                                                )}
                                                {(photo.assignee as any)?.first_name && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                        {(photo.assignee as any).first_name} {(photo.assignee as any).last_name}
                                                    </span>
                                                )}
                                                {!(photo.department as any)?.name && !(photo.assignee as any)?.first_name && (
                                                    <span className="text-xs text-gray-600">Not assigned</span>
                                                )}
                                            </div>

                                            {/* Send for Approval button — only on completed photos */}
                                            {photo.status === 'completed' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSendForApproval(photo.id)}
                                                    disabled={sendingApproval === photo.id}
                                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 mb-2"
                                                >
                                                    {sendingApproval === photo.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Bell className="h-3.5 w-3.5" />}
                                                    Send for Approval
                                                </Button>
                                            )}

                                            {/* Assignment dropdowns */}
                                            <AssignDropdown
                                                photo={photo}
                                                departments={departments}
                                                profiles={profiles}
                                                onAssigned={fetchAll}
                                            />

                                            {/* Status */}
                                            <Select
                                                value={photo.status}
                                                onValueChange={v => handleStatusChange(photo.id, v as RawPhoto['status'])}
                                            >
                                                <SelectTrigger className="h-8 w-full bg-gray-700 border-gray-600 text-white text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-800 border-gray-700">
                                                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                                        <SelectItem key={val} value={val} className="text-white text-xs">{cfg.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Upload modal */}
            {showUpload && (
                <UploadModal
                    departments={departments}
                    profiles={profiles}
                    onClose={() => setShowUpload(false)}
                    onUploaded={fetchAll}
                />
            )}
        </div>
    )
}
