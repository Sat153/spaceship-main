'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, MessageCircle, Users } from 'lucide-react'
import { getMyRooms, getMessages, sendMessage, ChatRoom, ChatMessage } from '@/app/actions/chat'
import { getLatestApproval, approveContent, requestChanges, Approval } from '@/app/actions/approvals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export default function ClientDashboard() {
    const { user, profile, loading, signOut } = useAuth()
    const router = useRouter()

    const [rooms, setRooms] = useState<ChatRoom[]>([])
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [loadingRooms, setLoadingRooms] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [approval, setApproval] = useState<Approval | null>(null)
    const [approvalAction, setApprovalAction] = useState(false)
    const [changesNotes, setChangesNotes] = useState('')
    const [showChangesInput, setShowChangesInput] = useState(false)

    // Auth guard
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/auth/login')
            } else if (profile && profile.role !== 'client') {
                router.replace(profile.role === 'admin' ? '/admin' : '/dashboard')
            }
        }
    }, [user, profile, loading, router])

    // Load rooms
    useEffect(() => {
        if (!user || !profile || profile.role !== 'client') return
        setLoadingRooms(true)
        getMyRooms().then(result => {
            if (result.success && result.data) {
                setRooms(result.data)
                // Auto-select first room
                if (result.data.length > 0) setSelectedRoom(result.data[0])
            }
            setLoadingRooms(false)
        })
    }, [user, profile])

    // Load messages + approval when room selected
    useEffect(() => {
        if (!selectedRoom) return
        setLoadingMessages(true)
        getMessages(selectedRoom.id).then(result => {
            if (result.success && result.data) setMessages(result.data)
            setLoadingMessages(false)
        })
        if (selectedRoom.stage_id && selectedRoom.client_id) {
            getLatestApproval(selectedRoom.client_id, selectedRoom.stage_id).then(r => setApproval(r.data))
        }
    }, [selectedRoom?.id])

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

    const handleSend = async () => {
        if (!selectedRoom || !newMessage.trim() || sending) return
        setSending(true)
        const result = await sendMessage(selectedRoom.id, newMessage)
        if (result.success) {
            setNewMessage('')
            const refreshed = await getMessages(selectedRoom.id)
            if (refreshed.success && refreshed.data) setMessages(refreshed.data)
        }
        setSending(false)
    }

    const formatTime = (d: string) =>
        new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (loading || !profile) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        )
    }

    if (profile.role !== 'client') return null

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-white font-bold text-lg">Anya Segen</h1>
                    <p className="text-gray-400 text-sm">Client Portal — {profile.first_name} {profile.last_name}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={signOut}
                    className="text-gray-400 border-gray-700 hover:bg-gray-800"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar — room list */}
                {rooms.length > 1 && (
                    <aside className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
                        <div className="p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Approval Rooms</p>
                            {rooms.map(room => (
                                <button
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${selectedRoom?.id === room.id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                    }`}
                                >
                                    {room.name.split(' — ').slice(1).join(' — ') || room.name}
                                </button>
                            ))}
                        </div>
                    </aside>
                )}

                {/* Chat area */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {loadingRooms ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-center px-8">
                            <div>
                                <MessageCircle className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                                <h2 className="text-white text-xl font-semibold mb-2">No approval rooms yet</h2>
                                <p className="text-gray-400">Your agency team will share content here for your approval.</p>
                            </div>
                        </div>
                    ) : selectedRoom ? (
                        <>
                            {/* Room header */}
                            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{selectedRoom.name.split(' — ')[0]}</p>
                                        <p className="text-gray-400 text-xs">
                                            {selectedRoom.name.split(' — ').slice(1).join(' — ')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Approval bar */}
                            {approval && (
                                <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/80">
                                    {approval.status === 'approved' ? (
                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                            <CheckCircle2 className="h-4 w-4" /> You approved this content
                                        </div>
                                    ) : approval.status === 'changes_requested' ? (
                                        <div className="text-orange-400 text-sm">
                                            Changes requested. Agency team is working on revisions.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-white text-sm font-medium">Content is ready for your approval</p>
                                            {showChangesInput ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="What needs to be changed?"
                                                        value={changesNotes}
                                                        onChange={e => setChangesNotes(e.target.value)}
                                                        className="flex-1 bg-gray-800 border-gray-700 text-white text-sm"
                                                    />
                                                    <Button size="sm" onClick={handleRequestChanges} disabled={approvalAction || !changesNotes.trim()} className="bg-orange-600 hover:bg-orange-700 shrink-0">
                                                        {approvalAction ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send'}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setShowChangesInput(false)} className="border-gray-600 text-gray-300 shrink-0">Cancel</Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleApprove} disabled={approvalAction} className="bg-green-600 hover:bg-green-700">
                                                        {approvalAction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                        Approve Content
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setShowChangesInput(true)} className="border-orange-600 text-orange-400 hover:bg-orange-900/20">
                                                        Request Changes
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {loadingMessages ? (
                                    <div className="flex justify-center pt-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-500 pt-12">
                                        <p>No messages yet. Your agency team will share content here for approval.</p>
                                    </div>
                                ) : messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.is_mine ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
                                            {!msg.is_mine && (
                                                <p className="text-xs text-blue-300 mb-1">{msg.sender_name}</p>
                                            )}
                                            {msg.file_url && msg.file_type?.startsWith('image/') && (
                                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                                    <img src={msg.file_url} alt="shared" className="rounded-lg max-w-full mb-1" style={{ maxHeight: 240 }} />
                                                </a>
                                            )}
                                            {msg.file_url && msg.file_type?.startsWith('video/') && (
                                                <video src={msg.file_url} controls className="rounded-lg max-w-full mb-1" style={{ maxHeight: 240 }} />
                                            )}
                                            {msg.message && <p className="whitespace-pre-wrap text-sm">{msg.message}</p>}
                                            <p className={`text-xs mt-1 ${msg.is_mine ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {formatTime(msg.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-gray-800 bg-gray-900">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type your feedback or approval..."
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                        className="flex-1 bg-gray-800 border-gray-700 text-white"
                                        disabled={sending}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || sending}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </main>
            </div>
        </div>
    )
}
