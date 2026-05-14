'use client'

import { Asset } from '@/app/actions/assets'
import { Folder, FileText, Image as ImageIcon, Music, Video, MoreVertical, Trash2, Download, FolderOpen, CalendarDays, Tag, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AssetGridProps {
    assets: Asset[]
    onNavigate: (folderId: string) => void
    onDelete: (id: string) => void
    onOpenDoc?: (asset: Asset) => void
    viewMode: 'grid' | 'list'
}

const FILE_TYPE_STYLES: Record<string, { icon: any; bg: string; iconColor: string }> = {
    'image':       { icon: ImageIcon,  bg: 'bg-purple-500/10',  iconColor: 'text-purple-400' },
    'video':       { icon: Video,      bg: 'bg-red-500/10',     iconColor: 'text-red-400' },
    'audio':       { icon: Music,      bg: 'bg-yellow-500/10',  iconColor: 'text-yellow-400' },
    'default':     { icon: FileText,   bg: 'bg-gray-500/10',    iconColor: 'text-gray-400' },
}

function getFileStyle(mimeType: string | null) {
    if (!mimeType) return FILE_TYPE_STYLES.default
    const type = mimeType.split('/')[0]
    return FILE_TYPE_STYLES[type] || FILE_TYPE_STYLES.default
}

function formatSize(bytes: number) {
    if (!bytes || bytes === 0) return ''
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function AssetMenu({ asset, onDelete }: { asset: Asset; onDelete: (id: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-600 rounded-lg">
                    <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                {asset.url && (
                    <DropdownMenuItem asChild>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" download className="cursor-pointer text-gray-300 focus:text-white focus:bg-gray-700">
                            <Download className="mr-2 h-4 w-4" /> Download
                        </a>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onClick={() => onDelete(asset.id)}
                    className="text-red-400 focus:text-red-300 focus:bg-red-400/10 cursor-pointer"
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function AssetGrid({ assets, onNavigate, onDelete, onOpenDoc, viewMode }: AssetGridProps) {
    if (assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                    <FolderOpen className="h-9 w-9 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">This folder is empty</p>
                <p className="text-gray-600 text-sm mt-1">Upload files, create a folder or add a document</p>
            </div>
        )
    }

    // ── LIST VIEW ─────────────────────────────────────────────────────────────
    if (viewMode === 'list') {
        return (
            <div className="border border-gray-700 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[400px]">
                    <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Size</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Department</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50 bg-gray-800/20">
                        {assets.map((asset) => {
                            const style = getFileStyle(asset.mime_type)
                            const Icon = asset.type === 'folder' ? Folder : asset.type === 'doc' ? ScrollText : style.icon
                            const isClickable = asset.type === 'folder' || asset.type === 'doc'
                            return (
                                <tr key={asset.id} className="group hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div
                                            className={cn("flex items-center gap-3", isClickable && "cursor-pointer")}
                                            onClick={() => {
                                                if (asset.type === 'folder') onNavigate(asset.id)
                                                else if (asset.type === 'doc') onOpenDoc?.(asset)
                                            }}
                                        >
                                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-700",
                                                asset.type === 'folder' ? 'bg-blue-500/10' :
                                                asset.type === 'doc' ? 'bg-emerald-500/10' : style.bg
                                            )}>
                                                {asset.type === 'file' && asset.mime_type?.startsWith('image/') && asset.url ? (
                                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Icon className={cn("h-4 w-4",
                                                        asset.type === 'folder' ? 'text-blue-400 fill-blue-400/20' :
                                                        asset.type === 'doc' ? 'text-emerald-400' : style.iconColor
                                                    )} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className={cn("font-medium text-gray-200 truncate max-w-[140px] sm:max-w-xs block", asset.type === 'folder' && "hover:text-white")}>
                                                    {asset.name}
                                                </span>
                                                {asset.type === 'folder' && (asset.event_name || asset.event_date) && (
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        {asset.event_name && <span className="text-[11px] text-purple-300 flex items-center gap-1"><Tag className="h-2.5 w-2.5" />{asset.event_name}</span>}
                                                        {asset.event_date && <span className="text-[11px] text-blue-300 flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5" />{new Date(asset.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{formatSize(asset.size)}</td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        {asset.departments?.name && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-300 border border-gray-600">
                                                {asset.departments.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                                        {new Date(asset.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex">
                                            <AssetMenu asset={asset} onDelete={onDelete} />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    // ── GRID VIEW ─────────────────────────────────────────────────────────────
    const folders = assets.filter(a => a.type === 'folder')
    const docs    = assets.filter(a => a.type === 'doc')
    const files   = assets.filter(a => a.type === 'file')

    return (
        <div className="space-y-6">
            {/* Folders */}
            {folders.length > 0 && (
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Folders</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                className="group relative bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-700/80 transition-all cursor-pointer"
                                onClick={() => onNavigate(folder.id)}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Folder className="h-5 w-5 text-blue-400 fill-blue-400/20" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white" title={folder.name}>
                                            {folder.name}
                                        </p>
                                    </div>
                                </div>
                                {(folder.event_name || folder.event_date) && (
                                    <div className="mt-2 space-y-1">
                                        {folder.event_name && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-purple-300">
                                                <Tag className="h-3 w-3 flex-shrink-0" />
                                                <span className="truncate">{folder.event_name}</span>
                                            </div>
                                        )}
                                        {folder.event_date && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-blue-300">
                                                <CalendarDays className="h-3 w-3 flex-shrink-0" />
                                                <span>{new Date(folder.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <AssetMenu asset={folder} onDelete={onDelete} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Docs */}
            {docs.length > 0 && (
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Documents</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {docs.map(doc => (
                            <div
                                key={doc.id}
                                className="group relative bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-emerald-500/50 hover:bg-gray-700/80 transition-all cursor-pointer"
                                onClick={() => onOpenDoc?.(doc)}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <ScrollText className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white" title={doc.name}>
                                            {doc.name}
                                        </p>
                                    </div>
                                </div>
                                {doc.content && (
                                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{doc.content}</p>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <AssetMenu asset={doc} onDelete={onDelete} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Files */}
            {files.length > 0 && (
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Files</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {files.map(file => {
                            const style = getFileStyle(file.mime_type)
                            const Icon = style.icon
                            const isImage = file.mime_type?.startsWith('image/')
                            return (
                                <div
                                    key={file.id}
                                    className="group relative bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-500 transition-all"
                                >
                                    {/* Preview area */}
                                    <div className={cn("w-full h-32 flex items-center justify-center", isImage ? 'bg-gray-900' : style.bg)}>
                                        {isImage && file.url ? (
                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon className={cn("h-10 w-10", style.iconColor)} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <p className="text-xs font-medium text-gray-200 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{formatSize(file.size)}</p>
                                    </div>

                                    {/* Hover actions */}
                                    <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <AssetMenu asset={file} onDelete={onDelete} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
