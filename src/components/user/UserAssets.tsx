'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAssets, Asset } from '@/app/actions/assets'
import { Folder, FileText, Image, Video, Download, ChevronRight, Home, ArrowLeft, HardDrive, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Breadcrumb { id: string | null; name: string }

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

  const load = useCallback(async (folderId: string | null) => {
    setLoading(true)
    setError(null)
    const result = await getAssets(undefined, folderId)
    if (!result.success) {
      setError('Failed to load files. Please try again.')
      setAssets([])
    } else {
      setAssets(result.data ?? [])
    }
    setLoading(false)
  }, [])

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Asset Library</h2>
          <p className="text-gray-400 text-sm mt-0.5">Shared media and files from all connected sources</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-medium">Auto-syncing</span>
        </div>
      </div>

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
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-16">
            <HardDrive className="mx-auto w-14 h-14 text-gray-600 mb-4" />
            <p className="text-white font-medium mb-1">No files here yet</p>
            <p className="text-gray-500 text-sm">Files synced from Telegram groups will appear here automatically</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {assets.map(asset => (
            <button
              key={asset.id}
              onClick={() => navigate(asset)}
              className="group text-left bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-xl p-4 transition-all hover:bg-gray-750"
            >
              {/* Preview thumbnail for images */}
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
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-700 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
