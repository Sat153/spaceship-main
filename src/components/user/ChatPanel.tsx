'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    MessageCircle, Send, Users, Plus, Loader2,
    User, ArrowLeft, Building, Paperclip, X, Image as ImageIcon, Lock, LockOpen, CheckCircle2
} from 'lucide-react'
import {
    sendMessage,
    getOrCreateDirectRoom,
    ChatRoom,
} from '@/app/actions/chat'
import {
    getLatestApproval,
    submitForApproval,
    approveContent,
    requestChanges,
    getStageOrder,
    Approval,
} from '@/app/actions/approvals'
import {
    useChatRooms,
    useChatMessages,
    useChatableUsers,
    useCreateDepartmentRoom,
} from '@/hooks/useSWR'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'

export default function ChatPanel() {
    const { profile } = useAuth()
    // Use SWR hooks for data fetching with caching
    const { rooms, isLoading: loading, refresh: refreshRooms } = useChatRooms()
    const { users: chatableUsers } = useChatableUsers()
    const { createRoom: createDeptRoom, isCreating: creatingDeptRoom } = useCreateDepartmentRoom()

    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [showNewChat, setShowNewChat] = useState(false)
    const [creatingChat, setCreatingChat] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [isInternal, setIsInternal] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Approval state
    const [approval, setApproval] = useState<Approval | null>(null)
    const [approvalLoading, setApprovalLoading] = useState(false)
    const [approvalAction, setApprovalAction] = useState(false)
    const [changesNotes, setChangesNotes] = useState('')
    const [showChangesInput, setShowChangesInput] = useState(false)
    const [currentStageOrder, setCurrentStageOrder] = useState<number | null>(null)

    // Use SWR for messages with 40s polling
    const {
        messages,
        isLoading: messagesLoading,
        refresh: refreshMessages
    } = useChatMessages(selectedRoom?.id || null, 40000) // 40 second polling

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Detect stage order from room name (e.g. "Ganesh Joshi — 03 Internal Review" → 3)
    const stageOrderFromName = selectedRoom?.name
        ? parseInt(selectedRoom.name.split(' — ').pop()?.match(/^(\d+)/)?.[1] || '0')
        : 0

    // Load approval when entering a workflow room at stage 3 or 4
    useEffect(() => {
        setApproval(null)
        setCurrentStageOrder(null)
        if (!selectedRoom?.client_id) return
        const order = parseInt(selectedRoom.name.split(' — ').pop()?.match(/^(\d+)/)?.[1] || '0')
        if (!order) return
        setCurrentStageOrder(order)
        if ((order === 3 || order === 4) && selectedRoom.stage_id) {
            setApprovalLoading(true)
            getLatestApproval(selectedRoom.client_id, selectedRoom.stage_id).then(result => {
                setApproval(result.data)
                setApprovalLoading(false)
            })
        } else if (order === 3 || order === 4) {
            // stage_id not in cache — fetch it
            setApprovalLoading(true)
            getStageOrder(selectedRoom.id).then(() => setApprovalLoading(false))
        }
    }, [selectedRoom?.id])

    const handleSubmitForApproval = async () => {
        if (!selectedRoom?.client_id || !selectedRoom?.stage_id) return
        setApprovalAction(true)
        const result = await submitForApproval(selectedRoom.client_id, selectedRoom.stage_id)
        if (result.data) setApproval(result.data)
        setApprovalAction(false)
    }

    const handleApprove = async () => {
        if (!approval) return
        setApprovalAction(true)
        await approveContent(approval.id)
        setApproval(prev => prev ? { ...prev, status: 'approved' } : null)
        setApprovalAction(false)
    }

    const handleRequestChanges = async () => {
        if (!approval || !changesNotes.trim()) return
        setApprovalAction(true)
        await requestChanges(approval.id, changesNotes)
        setApproval(prev => prev ? { ...prev, status: 'changes_requested', notes: changesNotes } : null)
        setChangesNotes('')
        setShowChangesInput(false)
        setApprovalAction(false)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSelectedFile(file)
        setFilePreview(URL.createObjectURL(file))
    }

    const clearFile = () => {
        setSelectedFile(null)
        setFilePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSendMessage = async () => {
        if (!selectedRoom || (!newMessage.trim() && !selectedFile) || sending) return

        setSending(true)
        setUploading(!!selectedFile)

        let fileUrl: string | undefined
        let fileType: string | undefined

        if (selectedFile) {
            try {
                const supabase = createClient()
                const ext = selectedFile.name.split('.').pop()
                const path = `chat/${selectedRoom.id}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('team-assets')
                    .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false })

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('team-assets').getPublicUrl(path)
                    fileUrl = publicUrl
                    fileType = selectedFile.type
                }
            } catch (err) {
                console.error('Upload error:', err)
            }
            setUploading(false)
        }

        const result = await sendMessage(selectedRoom.id, newMessage, fileUrl, fileType, isInternal)
        if (result.success) {
            setNewMessage('')
            clearFile()
            refreshMessages()
        }
        setSending(false)
    }

    const handleStartChat = async (userId: string) => {
        setCreatingChat(true)
        const result = await getOrCreateDirectRoom(userId)
        if (result.success && result.data) {
            setSelectedRoom(result.data)
            setShowNewChat(false)
            refreshRooms()
        }
        setCreatingChat(false)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (date.toDateString() === today.toDateString()) {
            return 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday'
        }
        return date.toLocaleDateString()
    }

    // New Chat View
    if (showNewChat) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowNewChat(false)}
                        className="text-white border-gray-600 hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h2 className="text-2xl font-bold text-white">Start New Chat</h2>
                </div>

                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">Select a person to chat with</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chatableUsers.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">
                                No users available to chat with
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {chatableUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                                        onClick={() => !creatingChat && handleStartChat(user.id)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{user.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {user.role} • {user.department_name}
                                                    {user.reason === 'teammate' && ' • Working on same client'}
                                                </p>
                                            </div>
                                        </div>
                                        {creatingChat ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                                        ) : (
                                            <MessageCircle className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Chat View with Room Selected
    if (selectedRoom) {
        return (
            <div className="flex flex-col h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-4">
                    <Button
                        variant="outline"
                        onClick={() => setSelectedRoom(null)}
                        className="text-white border-gray-600 hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-white">{selectedRoom.name}</h2>
                        <p className="text-sm text-gray-400 capitalize">{selectedRoom.type} chat</p>
                    </div>
                </div>

                {/* Approval Bar — shown for stage 3 (admin) and stage 4 (admin + client) */}
                {(stageOrderFromName === 3 || stageOrderFromName === 4) && (
                    <div className="mb-3 rounded-lg border border-gray-700 bg-gray-900 p-3">
                        {approvalLoading ? (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading approval status...
                            </div>
                        ) : stageOrderFromName === 3 && profile?.role === 'admin' ? (
                            // Stage 3: Admin can submit for client approval
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white text-sm font-medium">Internal Review</p>
                                    <p className="text-gray-400 text-xs">
                                        {approval?.status === 'pending' ? 'Waiting for client approval...' :
                                         approval?.status === 'changes_requested' ? `Changes requested: ${approval.notes}` :
                                         'Review content and submit for client approval when ready.'}
                                    </p>
                                </div>
                                {approval?.status !== 'pending' && (
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitForApproval}
                                        disabled={approvalAction}
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs shrink-0"
                                    >
                                        {approvalAction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        Submit for Approval
                                    </Button>
                                )}
                            </div>
                        ) : stageOrderFromName === 4 ? (
                            // Stage 4: show approval UI
                            approval?.status === 'approved' ? (
                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                    <CheckCircle2 className="h-4 w-4" /> Content approved by client
                                </div>
                            ) : approval?.status === 'pending' ? (
                                profile?.role === 'client' ? (
                                    // Client sees Approve / Request Changes
                                    <div className="space-y-2">
                                        <p className="text-white text-sm font-medium">Content ready for your approval</p>
                                        {showChangesInput ? (
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Describe what changes are needed..."
                                                    value={changesNotes}
                                                    onChange={e => setChangesNotes(e.target.value)}
                                                    className="bg-gray-800 border-gray-600 text-white text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleRequestChanges} disabled={approvalAction || !changesNotes.trim()} className="bg-orange-600 hover:bg-orange-700 text-xs">
                                                        {approvalAction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                        Send Feedback
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setShowChangesInput(false)} className="border-gray-600 text-gray-300 text-xs">Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={handleApprove} disabled={approvalAction} className="bg-green-600 hover:bg-green-700 text-xs">
                                                    {approvalAction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setShowChangesInput(true)} className="border-orange-600 text-orange-400 hover:bg-orange-900/20 text-xs">
                                                    Request Changes
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Admin sees pending status
                                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                        <Loader2 className="h-4 w-4 animate-pulse" /> Waiting for client approval...
                                    </div>
                                )
                            ) : approval?.status === 'changes_requested' ? (
                                <div className="space-y-1">
                                    <p className="text-orange-400 text-sm font-medium">Changes requested</p>
                                    <p className="text-gray-300 text-xs">{approval.notes}</p>
                                    {profile?.role === 'admin' && (
                                        <Button size="sm" onClick={handleSubmitForApproval} disabled={approvalAction} className="bg-green-600 hover:bg-green-700 text-xs mt-2">
                                            Resubmit for Approval
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                // No approval yet — admin sees waiting message
                                profile?.role === 'admin' ? (
                                    <p className="text-gray-400 text-sm">No content submitted yet. Submit from Stage 3 — Internal Review.</p>
                                ) : null
                            )
                        ) : null}
                    </div>
                )}

                {/* Messages */}
                <Card className="flex-1 bg-gray-800 border-gray-700 overflow-hidden flex flex-col">
                    <CardContent className="flex-1 overflow-y-auto p-4">
                        {messagesLoading ? (
                            <div className="space-y-4 p-2">
                                {[1,2,3,4,5].map((i) => (
                                    <div key={i} className={`flex gap-2 animate-pulse ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-7 h-7 rounded-full bg-gray-700 flex-shrink-0" />
                                        <div className={`space-y-1.5 max-w-[60%] ${i % 2 === 0 ? 'items-end' : ''} flex flex-col`}>
                                            <div className="h-3 bg-gray-700 rounded w-16" />
                                            <div className={`h-10 bg-gray-700 rounded-2xl ${i % 3 === 0 ? 'w-48' : i % 2 === 0 ? 'w-36' : 'w-56'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                    <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, index) => {
                                    const showDate = index === 0 ||
                                        formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at)

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="text-center text-xs text-gray-500 my-4">
                                                    {formatDate(msg.created_at)}
                                                </div>
                                            )}
                                            <div className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                                {msg.is_internal && (
                                                <div className={`flex items-center gap-1 text-xs text-amber-400 mb-1 ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                                    <Lock className="h-3 w-3" /> Internal note
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] ${msg.is_mine
                                                    ? msg.is_internal ? 'bg-amber-700 text-white' : 'bg-blue-600 text-white'
                                                    : msg.is_internal ? 'bg-amber-900/50 text-white border border-amber-700/50' : 'bg-gray-700 text-white'
                                                    } rounded-lg px-4 py-2`}>
                                                    {!msg.is_mine && (
                                                        <p className="text-xs text-blue-300 mb-1">{msg.sender_name}</p>
                                                    )}
                                                    {msg.file_url && msg.file_type?.startsWith('image/') && (
                                                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={msg.file_url}
                                                                alt="shared image"
                                                                className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-90"
                                                                style={{ maxHeight: '240px', objectFit: 'cover' }}
                                                            />
                                                        </a>
                                                    )}
                                                    {msg.file_url && msg.file_type?.startsWith('video/') && (
                                                        <video
                                                            src={msg.file_url}
                                                            controls
                                                            className="rounded-lg max-w-full mb-1"
                                                            style={{ maxHeight: '240px' }}
                                                        />
                                                    )}
                                                    {msg.file_url && !msg.file_type?.startsWith('image/') && !msg.file_type?.startsWith('video/') && (
                                                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm underline mb-1">
                                                            <Paperclip className="h-3 w-3" /> File attachment
                                                        </a>
                                                    )}
                                                    {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                                                    <p className={`text-xs mt-1 ${msg.is_mine ? 'text-blue-200' : 'text-gray-400'}`}>
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </CardContent>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-700">
                        {/* Internal note indicator */}
                        {isInternal && (
                            <div className="mb-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded px-3 py-1.5">
                                <Lock className="h-3 w-3" />
                                Internal note — only visible to agency team, not to clients
                            </div>
                        )}
                        {/* File preview */}
                        {filePreview && selectedFile && (
                            <div className="mb-2 relative inline-block">
                                {selectedFile.type.startsWith('image/') ? (
                                    <img src={filePreview} alt="preview" className="h-20 rounded-lg object-cover border border-gray-600" />
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg text-sm text-gray-300">
                                        <ImageIcon className="h-4 w-4" />
                                        {selectedFile.name}
                                    </div>
                                )}
                                <button onClick={clearFile}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={sending}
                                className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 shrink-0 w-8 h-8"
                            >
                                <Paperclip className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setIsInternal(v => !v)}
                                disabled={sending}
                                title={isInternal ? 'Internal note (click to make public)' : 'Make internal note'}
                                className={`shrink-0 w-8 h-8 ${isInternal
                                    ? 'border-amber-600 text-amber-400 bg-amber-900/30 hover:bg-amber-900/50'
                                    : 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                {isInternal ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                            </Button>
                            <Input
                                placeholder={isInternal ? 'Internal note...' : 'Type a message...'}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className={`flex-1 min-w-0 border-gray-600 text-white text-sm ${isInternal ? 'bg-amber-900/20' : 'bg-gray-700'}`}
                                disabled={sending}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={(!newMessage.trim() && !selectedFile) || sending}
                                size="icon"
                                className={`shrink-0 w-8 h-8 ${isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {(uploading || sending) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    // Group rooms: direct/department vs workflow (stage_id present)
    const directRooms = rooms.filter(r => !r.stage_id)
    const workflowRooms = rooms.filter(r => r.stage_id)

    // Group workflow rooms by client_id
    const workflowByClient = workflowRooms.reduce<Record<string, ChatRoom[]>>((acc, room) => {
        const key = room.client_id || 'unknown'
        if (!acc[key]) acc[key] = []
        acc[key].push(room)
        return acc
    }, {})

    const renderRoomCard = (room: ChatRoom) => {
        // For workflow rooms, show only the stage part (after " — ")
        const displayName = room.stage_id
            ? room.name.split(' — ').slice(1).join(' — ') || room.name
            : room.name

        return (
            <Card
                key={room.id}
                className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => setSelectedRoom(room)}
            >
                <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            room.type === 'direct' ? 'bg-blue-600' :
                            room.stage_id ? 'bg-amber-700' : 'bg-purple-600'
                        }`}>
                            {room.type === 'direct' ? (
                                <User className="h-5 w-5 text-white" />
                            ) : (
                                <Users className="h-5 w-5 text-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-white font-medium truncate text-sm">{displayName}</p>
                                {room.last_message_at && (
                                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                                        {formatTime(room.last_message_at)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                                {room.last_message || 'No messages yet'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Rooms List View
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Messages</h2>
                    <p className="text-gray-400">Chat with your team</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => setShowNewChat(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">New Chat</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                    <Button
                        onClick={async () => {
                            const result = await createDeptRoom(undefined)
                            if (result?.success && result.data) {
                                setSelectedRoom(result.data)
                                refreshRooms()
                            }
                        }}
                        disabled={creatingDeptRoom}
                        variant="outline"
                        size="sm"
                        className="text-white border-purple-500 hover:bg-purple-600/20"
                    >
                        {creatingDeptRoom ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                            <Building className="h-4 w-4 mr-1.5" />
                        )}
                        <span className="hidden sm:inline">My Department</span>
                        <span className="sm:hidden">Dept</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                                        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="text-center py-12">
                        <MessageCircle className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No conversations yet</h3>
                        <p className="text-gray-400 mb-4">Start a new chat with your team members</p>
                        <Button onClick={() => setShowNewChat(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Start Chatting
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Direct & department rooms */}
                    {directRooms.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct & Team</p>
                            {directRooms.map(renderRoomCard)}
                        </div>
                    )}

                    {/* Workflow rooms grouped by client */}
                    {Object.entries(workflowByClient).map(([clientId, stageRooms]) => {
                        // Extract client name from first room (format: "ClientName — Stage")
                        const clientName = stageRooms[0]?.name.split(' — ')[0] || 'Client'
                        const sorted = [...stageRooms].sort((a, b) => {
                            const aStage = a.name.split(' — ')[1] || ''
                            const bStage = b.name.split(' — ')[1] || ''
                            return aStage.localeCompare(bStage)
                        })
                        return (
                            <div key={clientId} className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {clientName} — Workflow
                                </p>
                                {sorted.map(renderRoomCard)}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
