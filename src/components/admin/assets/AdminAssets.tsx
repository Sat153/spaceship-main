'use client'

import { useState, useEffect } from "react"
import { Asset, getAssets, createFolder, uploadFile, deleteAsset, createDoc, updateDoc } from "@/app/actions/assets"
import { AssetGrid } from "./AssetGrid"
import { AssetUploader } from "./AssetUploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronRight, FolderPlus, Upload, Grid, List as ListIcon, Home, Loader2, ArrowLeft, HardDrive, ScrollText } from "lucide-react"
import { CyberHeader } from "@/components/ui/cyber-header"
import { cn } from "@/lib/utils"

interface Breadcrumb {
    id: string | null
    name: string
}

export default function AdminAssets() {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Navigation State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Home' }])

    // UI State
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [newEventName, setNewEventName] = useState('')
    const [newEventDate, setNewEventDate] = useState('')
    const [creatingFolder, setCreatingFolder] = useState(false)

    // Doc state
    const [isDocOpen, setIsDocOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState<Asset | null>(null)
    const [docTitle, setDocTitle] = useState('')
    const [docContent, setDocContent] = useState('')
    const [savingDoc, setSavingDoc] = useState(false)

    const loadAssets = async (folderId: string | null) => {
        setLoading(true)
        try {
            const result = await getAssets(undefined, folderId)
            if (result && result.success && result.data) {
                setAssets(result.data)
            } else {
                console.error(result?.error || 'getAssets returned undefined')
                setAssets([])
            }
        } catch (error) {
            console.error(error)
            setAssets([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAssets(currentFolderId)
    }, [currentFolderId])

    const handleNavigate = (folderId: string) => {
        const folder = assets.find(a => a.id === folderId)
        if (folder) {
            setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
            setCurrentFolderId(folder.id)
        }
    }

    const handleBreadcrumbClick = (index: number) => {
        const target = breadcrumbs[index]
        setBreadcrumbs(prev => prev.slice(0, index + 1))
        setCurrentFolderId(target.id)
    }

    const handleUp = () => {
        if (breadcrumbs.length > 1) {
            handleBreadcrumbClick(breadcrumbs.length - 2)
        }
    }

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return
        setCreatingFolder(true)
        try {
            const result = await createFolder(newFolderName, currentFolderId, undefined, newEventName || undefined, newEventDate || undefined)
            if (result.success) {
                setIsCreateFolderOpen(false)
                setNewFolderName('')
                setNewEventName('')
                setNewEventDate('')
                loadAssets(currentFolderId)
            } else {
                alert(result.error)
            }
        } finally {
            setCreatingFolder(false)
        }
    }

    const handleFileUpload = async (files: File[]) => {
        for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            await uploadFile(formData, currentFolderId)
        }
        setIsUploadOpen(false)
        loadAssets(currentFolderId)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return
        const result = await deleteAsset(id)
        if (result.success) {
            loadAssets(currentFolderId)
        } else {
            alert("Failed to delete")
        }
    }

    const openNewDoc = () => {
        setEditingDoc(null)
        setDocTitle('')
        setDocContent('')
        setIsDocOpen(true)
    }

    const openExistingDoc = (asset: Asset) => {
        setEditingDoc(asset)
        setDocTitle(asset.name)
        setDocContent(asset.content || '')
        setIsDocOpen(true)
    }

    const handleSaveDoc = async () => {
        if (!docTitle.trim()) return
        setSavingDoc(true)
        try {
            let result
            if (editingDoc) {
                result = await updateDoc(editingDoc.id, docTitle, docContent)
            } else {
                result = await createDoc(docTitle, docContent, currentFolderId)
            }
            if (result.success) {
                setIsDocOpen(false)
                loadAssets(currentFolderId)
            } else {
                alert(result.error || 'Failed to save document')
            }
        } finally {
            setSavingDoc(false)
        }
    }

    return (
        <div className="space-y-5 h-full flex flex-col">

            <CyberHeader
                title="Asset Library"
                subtitle="Manage files, folders and client assets"
                accent="#f97316"
                badge="ASSET LIBRARY"
                icon={<HardDrive className="h-6 w-6 text-white" />}
                stats={[{ label: 'ITEMS', value: assets.length, color: '#fdba74' }]}
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-800/60 p-3 rounded-xl border border-gray-700/80">

                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 text-sm overflow-x-auto no-scrollbar">
                    {breadcrumbs.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={handleUp} className="h-7 w-7 mr-1 text-gray-400 hover:text-white flex-shrink-0">
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id || 'root'} className="flex items-center gap-1">
                            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={cn(
                                    "px-2 py-1 rounded-md transition-colors whitespace-nowrap",
                                    index === breadcrumbs.length - 1
                                        ? "text-white font-semibold bg-gray-700"
                                        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                                )}
                            >
                                {index === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <div className="bg-gray-800 rounded-md border border-gray-700 p-1 flex items-center mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === 'grid' && "bg-gray-700 text-white")}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === 'list' && "bg-gray-700 text-white")}
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)} className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700">
                        <FolderPlus className="h-4 w-4 mr-1.5" />
                        New Folder
                    </Button>
                    <Button variant="outline" size="sm" onClick={openNewDoc} className="border-emerald-700 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20">
                        <ScrollText className="h-4 w-4 mr-1.5" />
                        New Doc
                    </Button>
                    <Button size="sm" onClick={() => setIsUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Upload className="h-4 w-4 mr-1.5" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-[400px] overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <AssetGrid
                        assets={assets}
                        viewMode={viewMode}
                        onNavigate={handleNavigate}
                        onDelete={handleDelete}
                        onOpenDoc={openExistingDoc}
                    />
                )}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateFolderOpen} onOpenChange={(open) => {
                setIsCreateFolderOpen(open)
                if (!open) { setNewFolderName(''); setNewEventName(''); setNewEventDate('') }
            }}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Folder Name *</label>
                            <Input
                                placeholder="e.g. Campaign Photos"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                className="bg-gray-700 border-gray-600"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Event Name <span className="text-gray-600">(optional)</span></label>
                            <Input
                                placeholder="e.g. Diwali Rally 2025"
                                value={newEventName}
                                onChange={(e) => setNewEventName(e.target.value)}
                                className="bg-gray-700 border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Event Date <span className="text-gray-600">(optional)</span></label>
                            <Input
                                type="date"
                                value={newEventDate}
                                onChange={(e) => setNewEventDate(e.target.value)}
                                className="bg-gray-700 border-gray-600"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                            {creatingFolder ? 'Creating...' : 'Create Folder'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <AssetUploader onUpload={handleFileUpload} onClose={() => setIsUploadOpen(false)} />
                </div>
            )}

            {/* Doc Editor Dialog */}
            <Dialog open={isDocOpen} onOpenChange={(open) => { if (!open) setIsDocOpen(false) }}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-400">
                            <ScrollText className="h-5 w-5" />
                            {editingDoc ? 'Edit Document' : 'New Document'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                            <Input
                                placeholder="e.g. Employee Inventory — Q1 2025"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Content</label>
                            <textarea
                                placeholder="Write your notes here..."
                                value={docContent}
                                onChange={(e) => setDocContent(e.target.value)}
                                rows={12}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDocOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveDoc}
                            disabled={savingDoc || !docTitle.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {savingDoc ? 'Saving...' : editingDoc ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
