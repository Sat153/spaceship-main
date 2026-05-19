'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    Users, Building2, Mail, Phone, Search, Eye, FileText,
    Clock, ArrowLeft, Download, Loader2, FolderOpen, UserCheck, MessageCircle, Newspaper, ExternalLink
} from 'lucide-react'
import { ClientDetails, ClientAsset } from '@/app/actions/user-clients'
import {
    useSharedClients,
    useClientDetails,
    useClientFiles,
    useClientIntelligence,
    useCreateClientRoom
} from '@/hooks/useSWR'
import { useRouter } from 'next/navigation'

export default function SharedClients() {
    const router = useRouter()
    // Use SWR hooks for data fetching with caching
    const { clients, isLoading: loading, refresh: refreshClients } = useSharedClients()
    const { createRoom: createClientRoom, isCreating: creatingRoom } = useCreateClientRoom()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
    const [filesClientId, setFilesClientId] = useState<string | null>(null)
    const [showFilesModal, setShowFilesModal] = useState(false)

    // Fetch client details with SWR (only when selectedClientId is set)
    const { client: selectedClient, isLoading: detailsLoading } = useClientDetails(selectedClientId)

    // Fetch client files with SWR (only when filesClientId is set)
    const { files: clientFiles, isLoading: filesLoading } = useClientFiles(filesClientId)

    // Fetch client intelligence (news/twitter)
    const { news: newsItems, twitter: twitterItems, isLoading: intelLoading } = useClientIntelligence(selectedClientId)

    const handleViewDetails = (clientId: string) => {
        setSelectedClientId(clientId)
    }

    const handleViewFiles = (clientId: string) => {
        setFilesClientId(clientId)
        setShowFilesModal(true)
    }

    const handleBack = () => {
        setSelectedClientId(null)
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // Loading state while fetching client details
    if (selectedClientId && detailsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={handleBack} className="text-white border-gray-600 hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Clients
                    </Button>
                    <div className="h-7 w-48 bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                            <CardHeader><div className="h-4 bg-gray-700 rounded w-3/4" /></CardHeader>
                            <CardContent><div className="space-y-2"><div className="h-3 bg-gray-700 rounded" /><div className="h-3 bg-gray-700 rounded w-2/3" /></div></CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // Client Detail View
    if (selectedClient) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="text-white border-gray-600 hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Clients
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                        <p className="text-gray-400">
                            {selectedClient.department_name} • {selectedClient.status}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Info */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center">
                                <Users className="h-5 w-5 mr-2" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center text-gray-300">
                                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                {selectedClient.email}
                            </div>
                            {selectedClient.phone && (
                                <div className="flex items-center text-gray-300">
                                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                                    {selectedClient.phone}
                                </div>
                            )}
                            {selectedClient.company && (
                                <div className="flex items-center text-gray-300">
                                    <Building2 className="h-4 w-4 mr-3 text-gray-400" />
                                    {selectedClient.company}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Summary */}
                    {selectedClient.ai_summary && (
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">AI Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-300 whitespace-pre-wrap">
                                    {selectedClient.ai_summary}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes */}
                    {selectedClient.notes && (
                        <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-white">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-300 whitespace-pre-wrap">
                                    {selectedClient.notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* News & Intelligence */}
                    {newsItems.length > 0 && (
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center">
                                    <Newspaper className="h-5 w-5 mr-2" />
                                    News & Updates
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                                {newsItems.slice(0, 5).map((item) => (
                                    <div key={item.id} className="p-2 bg-gray-900 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-white text-sm font-medium">{item.title}</p>
                                                {item.source_name && (
                                                    <p className="text-xs text-gray-400">{item.source_name}</p>
                                                )}
                                            </div>
                                            {item.source_url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(item.source_url!, '_blank')}
                                                    className="text-gray-400 hover:text-white h-6 w-6 p-0"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Twitter Feed */}
                    {twitterItems.length > 0 && (
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center">
                                    <span className="text-xl mr-2">𝕏</span>
                                    Twitter / X
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                                {twitterItems.slice(0, 5).map((item) => (
                                    <div key={item.id} className="p-2 bg-gray-900 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-white text-sm">{item.title}</p>
                                                {item.content && (
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.content}</p>
                                                )}
                                            </div>
                                            {item.source_url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(item.source_url!, '_blank')}
                                                    className="text-gray-400 hover:text-white h-6 w-6 p-0"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <Button
                        onClick={() => handleViewFiles(selectedClient.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        View Client Files
                    </Button>
                    <Button
                        onClick={async () => {
                            const result = await createClientRoom(selectedClient.id)
                            if (result?.success) {
                                // Navigate to messages tab
                                router.push('/dashboard?tab=messages')
                            }
                        }}
                        disabled={creatingRoom}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {creatingRoom ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <MessageCircle className="h-4 w-4 mr-2" />
                        )}
                        Team Group Chat
                    </Button>
                </div>

                {/* Files Modal - also rendered in detail view */}
                <Dialog open={showFilesModal} onOpenChange={setShowFilesModal}>
                    <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-white">Client Files</DialogTitle>
                        </DialogHeader>

                        {filesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            </div>
                        ) : clientFiles.length === 0 ? (
                            <div className="text-center py-8">
                                <FolderOpen className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                                <p className="text-gray-400">No files available for this client</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {clientFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-blue-400" />
                                            <div>
                                                <p className="text-white font-medium">{file.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {formatFileSize(file.size)} • {file.created_by_name}
                                                </p>
                                            </div>
                                        </div>
                                        {file.url && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-blue-400 hover:text-blue-300"
                                                onClick={() => window.open(file.url!, '_blank')}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    // Clients List View
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Shared Clients</h2>
                <p className="text-gray-400">
                    Clients that have been shared with you by Admin/Manager
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
            </div>

            {/* Clients Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                            <CardHeader>
                                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-700 rounded"></div>
                                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="text-center py-12">
                        <UserCheck className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {searchQuery ? 'No clients found' : 'No shared clients yet'}
                        </h3>
                        <p className="text-gray-400">
                            {searchQuery
                                ? 'Try adjusting your search terms'
                                : 'When Admin or Manager shares clients with you, they will appear here'
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                        <Card key={client.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-white text-lg">{client.name}</CardTitle>
                                        <CardDescription className="text-gray-400">
                                            {client.company || 'No company'}
                                        </CardDescription>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded capitalize ${client.status === 'active' ? 'bg-green-600/20 text-green-400' :
                                        client.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                            'bg-gray-600/20 text-gray-400'
                                        }`}>
                                        {client.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-400">
                                        <Mail className="h-3 w-3 mr-2" />
                                        {client.email}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Clock className="h-3 w-3 mr-2" />
                                        Shared by {client.shared_by_name}
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewDetails(client.id)}
                                        disabled={detailsLoading}
                                        className="flex-1 text-white border-gray-600 hover:bg-gray-700"
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Details
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewFiles(client.id)}
                                        className="flex-1 text-white border-gray-600 hover:bg-gray-700"
                                    >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Files
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Files Modal */}
            <Dialog open={showFilesModal} onOpenChange={setShowFilesModal}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Client Files</DialogTitle>
                    </DialogHeader>

                    {filesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                        </div>
                    ) : clientFiles.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderOpen className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                            <p className="text-gray-400">No files available for this client</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {clientFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                        <div>
                                            <p className="text-white font-medium">{file.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {formatFileSize(file.size)} • {file.created_by_name}
                                            </p>
                                        </div>
                                    </div>
                                    {file.url && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-blue-400 hover:text-blue-300"
                                            onClick={() => window.open(file.url!, '_blank')}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
