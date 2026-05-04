'use client'

import { useState, useEffect, useCallback } from "react"
import { Asset, getAssets, createFolder, uploadFile, deleteAsset, getClientRootFolder } from "@/app/actions/assets"
import { AssetGrid } from "@/components/admin/assets/AssetGrid"
import { AssetUploader } from "@/components/admin/assets/AssetUploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronRight, FolderPlus, Upload, Grid, List as ListIcon, Home, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientAssetsProps {
    clientId: string
    departmentId: string
}

interface Breadcrumb {
    id: string | null
    name: string
}

export default function ClientAssets({ clientId, departmentId }: ClientAssetsProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Navigation State
    const [clientRootId, setClientRootId] = useState<string | null>(null)
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Client Root' }])

    // UI State
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [creatingFolder, setCreatingFolder] = useState(false)

    // Initial Initialization: Find the client's root folder
    const initializeClientFolder = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getClientRootFolder(clientId)
            if (result.success && result.data) {
                setClientRootId(result.data)
                setCurrentFolderId(result.data)
                setBreadcrumbs([{ id: result.data, name: 'Client Root' }])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [clientId])

    useEffect(() => {
        initializeClientFolder()
    }, [clientId])

    // Main Asset Loader
    const loadAssets = async (folderId: string | null) => {
        setLoading(true)
        try {
            const result = await getAssets(undefined, folderId, clientId)
            if (result.success && result.data) {
                setAssets(result.data)
            } else {
                console.error(result.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (currentFolderId || clientRootId === null) {
            loadAssets(currentFolderId)
        }
    }, [currentFolderId, clientId])

    // Navigation Handlers
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
        if (currentFolderId === clientRootId) return
        if (breadcrumbs.length > 1) {
            handleBreadcrumbClick(breadcrumbs.length - 2)
        }
    }

    // Action Handlers
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return
        setCreatingFolder(true)
        try {
            const result = await createFolder(newFolderName, currentFolderId, clientId)
            if (result.success) {
                setIsCreateFolderOpen(false)
                setNewFolderName('')
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
            await uploadFile(formData, currentFolderId, clientId)
        }
        setIsUploadOpen(false)
        if (!clientRootId) {
            await initializeClientFolder()
        } else {
            loadAssets(currentFolderId)
        }
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

    return (
        <div className="space-y-4 h-full flex flex-col px-4">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">

                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 text-sm overflow-x-auto no-scrollbar">
                    {breadcrumbs.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={handleUp} className="mr-2 h-8 w-8 text-gray-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id || 'root'} className="flex items-center">
                            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500 mx-1" />}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={cn(
                                    "hover:text-white transition-colors",
                                    index === breadcrumbs.length - 1 ? "text-white font-semibold" : "text-gray-400"
                                )}
                            >
                                {index === 0 ? <Home className="h-4 w-4" /> : crumb.name}
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

                    <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)} className="border-gray-600 text-white hover:bg-gray-700">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        New Folder
                    </Button>
                    <Button size="sm" onClick={() => setIsUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-full pt-12">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <AssetGrid
                        assets={assets}
                        viewMode={viewMode}
                        onNavigate={handleNavigate}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateFolderOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                        <Button onClick={handleCreateFolder} disabled={creatingFolder} className="bg-blue-600 hover:bg-blue-700">
                            {creatingFolder ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Upload Overlay */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <AssetUploader onUpload={handleFileUpload} onClose={() => setIsUploadOpen(false)} />
                </div>
            )}
        </div>
    )
}
