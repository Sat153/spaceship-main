'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAssets, uploadFile, getClientIdByName, checkUploadPermission, checkFolderPermission, createFolder, renameAsset, deleteAsset, Asset } from '@/app/actions/assets'
import { Folder, FileText, Image, Video, Download, ChevronRight, Home, ArrowLeft, HardDrive, AlertCircle, RefreshCw, Upload, X, CheckCircle, Loader2, FolderPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Breadcrumb { id: string | null; name: string }

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function fileIcon(asset: Asset) {
  if (asset.type === 'folder') return <Folder className="w-5 h-5 text-amber-400" />
  if (asset.mime_type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />
  if (asset.mime_type?.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />
  return <FileText className="w-5 h-5 text-gray-400" />
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UserAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Asset Library' }])
  const [preview, setPreview] = useState<Asset | null>(null)

  // Upload state
  const [canUpload, setCanUpload] = useState(false)
  const [canCreateFolder, setCanCreateFolder] = useState(false)
  const [ganeshClientId, setGaneshClientId] = useState<string | null>(null)

  // New folder state
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Folder context menu
  const [menuFolder, setMenuFolder] = useState<Asset | null>(null)
  const [renameFolder, setRenameFolder] = useState<Asset | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check permissions
  useEffect(() => {
    checkUploadPermission().then(({ canUpload }) => {
      if (canUpload) {
        setCanUpload(true)
        getClientIdByName('Ganesh Joshi').then(({ id }) => setGaneshClientId(id))
      }
    })
    checkFolderPermission().then(({ canCreateFolder }) => setCanCreateFolder(canCreateFolder))
  }, [])

  const HIDDEN_ROOT_NAMES = ['_debug_test_', 'Office Assets']

  const load = useCallback(async (folderId: string | null) => {
    setLoading(true)
    setError(null)
    const result = await getAssets(undefined, folderId)
    if (!result.success) {
      setError('Failed to load files. Please try again.')
      setAssets([])
    } else {
      const data = result.data ?? []
      // Hide debug/internal folders from Vikas/Rakesh at root level
      const filtered = (canCreateFolder && folderId === null)
        ? data.filter(a => !HIDDEN_ROOT_NAMES.includes(a.name))
        : data
      setAssets(filtered)
    }
    setLoading(false)
  }, [canCreateFolder])

  useEffect(() => { load(currentFolderId) }, [currentFolderId, load])

  const navigate = (asset: Asset) => {
    if (asset.type === 'folder') {
      setBreadcrumbs(prev => [...prev, { id: asset.id, name: asset.name }])
      setCurrentFolderId(asset.id)
    } else if (asset.type === 'doc') {
      setPreview(asset)
    } else if (asset.url) {
      window.open(asset.url, '_blank')
    }
  }

  const goTo = (index: number) => {
    const target = breadcrumbs[index]
    setBreadcrumbs(prev => prev.slice(0, index + 1))
    setCurrentFolderId(target.id)
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const items: UploadItem[] = Array.from(files).map(file => ({ file, status: 'pending' }))
    setUploadQueue(prev => [...prev, ...items])
    setShowUploadPanel(true)
  }

  const processQueue = useCallback(async (queue: UploadItem[]) => {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'pending') continue

      setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item))

      const fd = new FormData()
      fd.append('file', queue[i].file)

      const result = await uploadFile(fd, currentFolderId, ganeshClientId ?? undefined)

      setUploadQueue(prev => prev.map((item, idx) =>
        idx === i
          ? { ...item, status: result.success ? 'done' : 'error', error: result.success ? undefined : (result.error ?? 'Upload failed') }
          : item
      ))
    }
    // Refresh after all done
    load(currentFolderId)
  }, [currentFolderId, ganeshClientId, load])

  useEffect(() => {
    const hasPending = uploadQueue.some(u => u.status === 'pending')
    const hasUploading = uploadQueue.some(u => u.status === 'uploading')
    if (hasPending && !hasUploading) {
      processQueue(uploadQueue)
    }
  }, [uploadQueue, processQueue])

  const removeFromQueue = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index))
  }

  const clearDoneQueue = () => {
    setUploadQueue(prev => prev.filter(u => u.status === 'pending' || u.status === 'uploading'))
    if (uploadQueue.every(u => u.status === 'done' || u.status === 'error')) setShowUploadPanel(false)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreatingFolder(true)
    const result = await createFolder(name, currentFolderId)
    setCreatingFolder(false)
    if (result.success) {
      setNewFolderName('')
      setShowNewFolder(false)
      load(currentFolderId)
    }
  }

  const handleRename = async () => {
    if (!renameFolder || !renameName.trim()) return
    setRenaming(true)
    const result = await renameAsset(renameFolder.id, renameName)
    setRenaming(false)
    if (result.success) {
      setRenameFolder(null)
      load(currentFolderId)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    await deleteAsset(deleteConfirm.id)
    setDeleting(false)
    setDeleteConfirm(null)
    load(currentFolderId)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <button onClick={() => setPreview(null)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold text-lg mb-4">{preview.name}</h3>
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{preview.content}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="space-y-4 relative"
      onDragOver={e => { if (canUpload) { e.preventDefault(); setIsDragging(true) } }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => setMenuFolder(null)}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/20 border-2 border-dashed border-blue-400 pointer-events-none">
          <div className="text-center">
            <Upload className="w-16 h-16 text-blue-400 mx-auto mb-3" />
            <p className="text-white text-xl font-semibold">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Asset Library</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Shared media and files from all connected sources</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreateFolder && (
            <button
              onClick={() => { setShowNewFolder(true); setNewFolderName('') }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-sm font-medium transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          )}
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium">Auto-syncing</span>
          </div>
        </div>
      </div>

      {/* Upload Panel */}
      {showUploadPanel && uploadQueue.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-white text-sm font-medium">Uploading {uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              {uploadQueue.every(u => u.status === 'done' || u.status === 'error') && (
                <button onClick={clearDoneQueue} className="text-xs text-gray-400 hover:text-white transition-colors">Clear</button>
              )}
              <button onClick={() => setShowUploadPanel(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-700 max-h-48 overflow-auto">
            {uploadQueue.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.file.name}</p>
                  <p className="text-gray-500 text-xs">{formatSize(item.file.size)}</p>
                </div>
                <div className="shrink-0">
                  {item.status === 'pending' && <span className="text-xs text-gray-500">Waiting…</span>}
                  {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {item.status === 'error' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-400">{item.error}</span>
                      <button onClick={() => removeFromQueue(i)} className="text-gray-500 hover:text-white ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolder && (
        <div className="bg-gray-800 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <FolderPlus className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            placeholder="Folder name"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || creatingFolder}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Create
          </button>
          <button onClick={() => setShowNewFolder(false)} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
            <button
              onClick={() => goTo(i)}
              className={`px-2 py-1 rounded-md transition-colors ${
                i === breadcrumbs.length - 1
                  ? 'text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {i === 0 ? <Home className="w-3.5 h-3.5" /> : crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Drag hint for upload-permitted users */}
      {canUpload && (
        <p className="text-xs text-gray-600">You can also drag & drop files anywhere on this page to upload.</p>
      )}

      {/* Content */}
      {error ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-12">
            <AlertCircle className="mx-auto w-12 h-12 text-red-400 mb-3" />
            <p className="text-white font-medium mb-1">Failed to load files</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button onClick={() => load(currentFolderId)} className="flex items-center gap-2 mx-auto text-sm text-blue-400 hover:text-blue-300">
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
              <div className="w-full aspect-video rounded-lg bg-gray-700 mb-3" />
              <div className="h-3.5 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <Card
          className={`bg-gray-800 border-gray-700 transition-colors ${canUpload ? 'hover:border-blue-500/50 cursor-pointer' : ''}`}
          onClick={() => canUpload && fileInputRef.current?.click()}
        >
          <CardContent className="text-center py-16">
            {canUpload ? (
              <>
                <Upload className="mx-auto w-14 h-14 text-blue-500/50 mb-4" />
                <p className="text-white font-medium mb-1">No files here yet</p>
                <p className="text-gray-500 text-sm mb-3">Click to upload or drag & drop photos/videos</p>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  <Upload className="w-4 h-4" /> Choose Files
                </span>
              </>
            ) : (
              <>
                <HardDrive className="mx-auto w-14 h-14 text-gray-600 mb-4" />
                <p className="text-white font-medium mb-1">No files here yet</p>
                <p className="text-gray-500 text-sm">Files synced from Telegram groups will appear here automatically</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {assets.map(asset => (
            <div key={asset.id} className="relative group">
              <button
                onClick={() => navigate(asset)}
                className="w-full text-left bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-xl p-4 transition-all hover:bg-gray-750"
              >
                {asset.type === 'file' && asset.mime_type?.startsWith('image/') && asset.url ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-gray-900">
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  </div>
                ) : asset.type === 'file' && asset.mime_type?.startsWith('video/') && asset.url ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-gray-900 flex items-center justify-center">
                    <Video className="w-8 h-8 text-purple-400" />
                  </div>
                ) : (
                  <div className={`w-full aspect-video rounded-lg mb-3 flex items-center justify-center ${asset.type === 'folder' ? 'bg-amber-500/10' : 'bg-gray-900'}`}>
                    <span className="scale-150">{fileIcon(asset)}</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors">
                      {asset.name}
                    </p>
                    {asset.size > 0 && (
                      <p className="text-gray-500 text-xs mt-0.5">{formatSize(asset.size)}</p>
                    )}
                  </div>
                  {asset.type === 'file' && asset.url && (
                    <a
                      href={asset.url}
                      download
                      onClick={e => e.stopPropagation()}
                      className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-700 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  )}
                </div>
              </button>

              {/* Folder context menu — only for canCreateFolder users */}
              {asset.type === 'folder' && canCreateFolder && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuFolder(menuFolder?.id === asset.id ? null : asset) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                  {menuFolder?.id === asset.id && (
                    <div className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-36 overflow-hidden">
                      <button
                        onClick={e => { e.stopPropagation(); setRenameFolder(asset); setRenameName(asset.name); setMenuFolder(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(asset); setMenuFolder(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      {renameFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRenameFolder(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">Rename Folder</h3>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameFolder(null) }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenameFolder(null)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleRename}
                disabled={!renameName.trim() || renaming}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                {renaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">Delete Folder</h3>
            <p className="text-gray-400 text-sm mb-4">Delete <span className="text-white font-medium">"{deleteConfirm.name}"</span>? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
