'use client'

import { useState, useEffect } from 'react'
import { getRawPhotos, updateRawPhotoStatus, RawPhoto } from '@/app/actions/photo-workflow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExternalLink, Download, User, Building2, Calendar, ClipboardList, RefreshCw, ImageIcon, Video } from 'lucide-react'

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
    assigned:    { label: 'Assigned',    class: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    in_progress: { label: 'In Progress', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    completed:   { label: 'Completed',   class: 'bg-green-500/20 text-green-300 border-green-500/30' },
    rejected:    { label: 'Rejected',    class: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

function isVideo(url: string) {
    return /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(url)
}

function AssignmentRow({ photo, onStatusChange }: { photo: RawPhoto; onStatusChange: () => void }) {
    const [updating, setUpdating] = useState(false)
    const assignee = photo.assignee as any
    const department = photo.department as any
    const name = assignee
        ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
        : '—'
    const deptName = department?.name || '—'
    const style = STATUS_STYLES[photo.status] || STATUS_STYLES.assigned
    const fileIsVideo = isVideo(photo.image_url)
    const taskUrl = `/task/${photo.id}`

    const handleStatusChange = async (newStatus: string) => {
        setUpdating(true)
        await updateRawPhotoStatus(photo.id, newStatus as RawPhoto['status'])
        onStatusChange()
        setUpdating(false)
    }

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:border-gray-600 transition-colors">

            {/* Thumbnail */}
            <div className="flex-shrink-0 w-full md:w-28 h-20 rounded-lg overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
                {fileIsVideo ? (
                    <Video className="h-8 w-8 text-gray-500" />
                ) : (
                    <img
                        src={photo.image_url}
                        alt={photo.photo_id}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                        }}
                    />
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">{photo.photo_id}</span>
                    {fileIsVideo
                        ? <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Video</Badge>
                        : <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">Photo</Badge>
                    }
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-white">{name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {deptName}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        {new Date(photo.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row md:flex-col items-center md:items-end gap-2 flex-shrink-0">
                {/* Status selector */}
                <Select
                    value={photo.status}
                    onValueChange={handleStatusChange}
                    disabled={updating}
                >
                    <SelectTrigger className={`h-8 text-xs border px-2.5 w-36 ${style.class} bg-transparent`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="assigned"    className="text-blue-300 text-xs">Assigned</SelectItem>
                        <SelectItem value="in_progress" className="text-yellow-300 text-xs">In Progress</SelectItem>
                        <SelectItem value="completed"   className="text-green-300 text-xs">Completed</SelectItem>
                        <SelectItem value="rejected"    className="text-red-300 text-xs">Rejected</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-1.5">
                    {/* Open task page */}
                    <a href={taskUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700" title="Open task page">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </a>
                    {/* Download */}
                    <a href={photo.image_url} download target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700" title="Download file">
                            <Download className="h-3.5 w-3.5" />
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    )
}

const STATUS_FILTERS = ['all', 'assigned', 'in_progress', 'completed', 'rejected']

export default function AdminAssignments() {
    const [photos, setPhotos] = useState<RawPhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const load = async () => {
        setLoading(true)
        const data = await getRawPhotos()
        setPhotos(data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const filtered = filter === 'all' ? photos : photos.filter(p => p.status === filter)

    const counts = {
        all:         photos.length,
        assigned:    photos.filter(p => p.status === 'assigned').length,
        in_progress: photos.filter(p => p.status === 'in_progress').length,
        completed:   photos.filter(p => p.status === 'completed').length,
        rejected:    photos.filter(p => p.status === 'rejected').length,
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-blue-400" />
                        Assignments
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">All files shared with team members</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={load}
                    disabled={loading}
                    className="text-gray-400 hover:text-white"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {STATUS_FILTERS.map(s => {
                    const count = counts[s as keyof typeof counts]
                    const style = s === 'all' ? 'bg-gray-700/50 text-white border-gray-600' : STATUS_STYLES[s]?.class || ''
                    const label = s === 'all' ? 'All' : STATUS_STYLES[s]?.label || s
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`rounded-xl border p-3 text-left transition-all ${style} ${filter === s ? 'ring-2 ring-white/20' : 'opacity-70 hover:opacity-100'}`}
                        >
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs mt-0.5 opacity-80">{label}</p>
                        </button>
                    )
                })}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList className="h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No assignments found</p>
                    <p className="text-gray-600 text-sm mt-1">Use "Assign Photo" in the Asset Library to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(photo => (
                        <AssignmentRow
                            key={photo.id}
                            photo={photo}
                            onStatusChange={load}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
