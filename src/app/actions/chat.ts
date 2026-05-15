'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// ============ TYPES ============

export interface ChatRoom {
    id: string
    name: string
    type: 'direct' | 'client' | 'department'
    client_id: string | null
    department_id: string | null
    stage_id?: string | null
    stage_order?: number | null
    last_message?: string
    last_message_at?: string
    unread_count?: number
}

export interface ChatMessage {
    id: string
    room_id: string
    sender_id: string
    sender_name: string
    message: string
    created_at: string
    is_mine: boolean
    is_internal?: boolean
    file_url?: string | null
    file_type?: string | null
}

export interface ChatableUser {
    id: string
    name: string
    email: string
    role: string
    department_name: string
    reason: string // 'admin' | 'manager' | 'teammate'
}

// ============ HELPER ============

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// ============ GET MY CHAT ROOMS ============

export async function getMyRooms(): Promise<{
    success: boolean;
    data?: ChatRoom[];
    error?: string
}> {
    console.log('🔍 ACTION: getMyRooms')
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get user profile for role + department
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, department_id')
            .eq('id', user.id)
            .single()

        // Get rooms I'm a member of
        const { data: memberships, error: memError } = await supabase
            .from('chat_room_members')
            .select('room_id')
            .eq('user_id', user.id)

        if (memError) {
            return { success: false, error: memError.message }
        }

        if (!memberships || memberships.length === 0) {
            return { success: true, data: [] }
        }

        const roomIds = memberships.map(m => m.room_id)

        // Get room details
        const { data: rooms, error: roomsError } = await supabase
            .from('chat_rooms')
            .select('id, name, type, client_id, department_id, stage_id, created_at')
            .in('id', roomIds)

        if (roomsError) {
            return { success: false, error: roomsError.message }
        }

        // For non-admin users filter workflow rooms by department access
        let visibleRooms = rooms || []
        if (profile?.role !== 'admin' && profile?.department_id) {
            // Get rooms this department can access
            const { data: accessible } = await supabase
                .from('room_access')
                .select('room_id')
                .eq('department_id', profile.department_id)

            const accessibleIds = new Set((accessible || []).map((r: { room_id: string }) => r.room_id))

            visibleRooms = visibleRooms.filter(room => {
                // Non-workflow rooms (direct/department): always visible
                if (!room.stage_id) return true
                // Workflow rooms: only if department has access
                return accessibleIds.has(room.id)
            })
        }

        // Fetch stage orders for all stage IDs in one query
        const stageIds = Array.from(new Set(visibleRooms.map(r => r.stage_id).filter(Boolean)))
        let stageOrderMap: Record<string, number> = {}
        if (stageIds.length > 0) {
            const { data: stageRows } = await supabase
                .from('workflow_stages')
                .select('id, stage_order')
                .in('id', stageIds)
            stageRows?.forEach((s: { id: string; stage_order: number }) => {
                stageOrderMap[s.id] = s.stage_order
            })
        }

        // Get last message for each room in parallel
        const roomsWithLastMessage: ChatRoom[] = await Promise.all(
            visibleRooms.map(async (room) => {
                const { data: lastMsg } = await supabase
                    .from('chat_messages')
                    .select('message, created_at')
                    .eq('room_id', room.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                return {
                    id: room.id,
                    name: room.name,
                    type: room.type,
                    client_id: room.client_id,
                    department_id: room.department_id,
                    stage_id: room.stage_id,
                    stage_order: room.stage_id ? (stageOrderMap[room.stage_id] ?? null) : null,
                    last_message: lastMsg?.message,
                    last_message_at: lastMsg?.created_at
                }
            })
        )

        // Sort by last message time
        roomsWithLastMessage.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
            return timeB - timeA
        })

        return { success: true, data: roomsWithLastMessage }
    } catch (error) {
        console.error('Error in getMyRooms:', error)
        return { success: false, error: 'Failed to fetch chat rooms' }
    }
}

// ============ GET OR CREATE DIRECT ROOM ============

export async function getOrCreateDirectRoom(otherUserId: string): Promise<{
    success: boolean;
    data?: ChatRoom;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        if (user.id === otherUserId) {
            return { success: false, error: 'Cannot create chat with yourself' }
        }

        // Check if direct room already exists between these two users
        // Get all direct rooms I'm in
        const { data: myRooms } = await supabase
            .from('chat_room_members')
            .select('room_id')
            .eq('user_id', user.id)

        if (myRooms && myRooms.length > 0) {
            const myRoomIds = myRooms.map(r => r.room_id)

            // Check if other user is in any of these direct rooms
            const { data: sharedRooms } = await supabase
                .from('chat_room_members')
                .select('room_id')
                .eq('user_id', otherUserId)
                .in('room_id', myRoomIds)

            if (sharedRooms && sharedRooms.length > 0) {
                // Check if it's a direct room
                const { data: directRoom } = await supabase
                    .from('chat_rooms')
                    .select('*')
                    .eq('type', 'direct')
                    .in('id', sharedRooms.map(r => r.room_id))
                    .single()

                if (directRoom) {
                    return { success: true, data: directRoom }
                }
            }
        }

        // Get other user's name for room name
        const { data: otherProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', otherUserId)
            .single()

        if (!otherProfile) {
            return { success: false, error: 'User not found' }
        }

        const roomName = `${otherProfile.first_name} ${otherProfile.last_name}`

        // Create new direct room
        const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert({
                name: roomName,
                type: 'direct',
                created_by: user.id
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating room:', createError)
            return { success: false, error: createError.message }
        }

        // Add both users to the room
        const { error: memberError } = await supabase
            .from('chat_room_members')
            .insert([
                { room_id: newRoom.id, user_id: user.id },
                { room_id: newRoom.id, user_id: otherUserId }
            ])

        if (memberError) {
            console.error('Error adding members:', memberError)
            // Cleanup: delete the room
            await supabase.from('chat_rooms').delete().eq('id', newRoom.id)
            return { success: false, error: memberError.message }
        }

        return { success: true, data: newRoom }
    } catch (error) {
        console.error('Error in getOrCreateDirectRoom:', error)
        return { success: false, error: 'Failed to create chat room' }
    }
}

// ============ GET CLIENT ROOM ============

export async function getOrCreateClientRoom(clientId: string): Promise<{
    success: boolean;
    data?: ChatRoom;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if client room already exists
        const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('type', 'client')
            .eq('client_id', clientId)
            .single()

        if (existingRoom) {
            // Make sure user is a member
            const { data: membership } = await supabase
                .from('chat_room_members')
                .select('id')
                .eq('room_id', existingRoom.id)
                .eq('user_id', user.id)
                .single()

            if (!membership) {
                // Add user to room
                await supabase.from('chat_room_members').insert({
                    room_id: existingRoom.id,
                    user_id: user.id
                })
            }

            return { success: true, data: existingRoom }
        }

        // Get client name for room name
        const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single()

        if (!client) {
            return { success: false, error: 'Client not found' }
        }

        // Create client room
        const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert({
                name: `Team: ${client.name}`,
                type: 'client',
                client_id: clientId,
                created_by: user.id
            })
            .select()
            .single()

        if (createError) {
            return { success: false, error: createError.message }
        }

        // Add current user
        await supabase.from('chat_room_members').insert({
            room_id: newRoom.id,
            user_id: user.id
        })

        // Add all users who have access to this client
        const { data: shares } = await supabase
            .from('client_shares')
            .select('shared_with_user_id')
            .eq('client_id', clientId)
            .neq('shared_with_user_id', user.id)

        if (shares && shares.length > 0) {
            await supabase.from('chat_room_members').insert(
                shares.map(s => ({ room_id: newRoom.id, user_id: s.shared_with_user_id }))
            )
        }

        return { success: true, data: newRoom }
    } catch (error) {
        console.error('Error in getOrCreateClientRoom:', error)
        return { success: false, error: 'Failed to get client room' }
    }
}

// ============ GET OR CREATE DEPARTMENT ROOM ============

export async function getOrCreateDepartmentRoom(departmentId?: string): Promise<{
    success: boolean;
    data?: ChatRoom;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get user's department if not provided
        let deptId = departmentId
        if (!deptId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('department_id')
                .eq('id', user.id)
                .single()

            if (!profile?.department_id) {
                return { success: false, error: 'User has no department' }
            }
            deptId = profile.department_id
        }

        // Check if department room already exists
        const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('type', 'department')
            .eq('department_id', deptId)
            .single()

        if (existingRoom) {
            // Make sure user is a member
            const { data: membership } = await supabase
                .from('chat_room_members')
                .select('id')
                .eq('room_id', existingRoom.id)
                .eq('user_id', user.id)
                .single()

            if (!membership) {
                // Add user to room
                await supabase.from('chat_room_members').insert({
                    room_id: existingRoom.id,
                    user_id: user.id
                })
            }

            return { success: true, data: existingRoom }
        }

        // Get department name
        const { data: dept } = await supabase
            .from('departments')
            .select('name')
            .eq('id', deptId)
            .single()

        if (!dept) {
            return { success: false, error: 'Department not found' }
        }

        // Create department room
        const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert({
                name: `${dept.name} Team`,
                type: 'department',
                department_id: deptId,
                created_by: user.id
            })
            .select()
            .single()

        if (createError) {
            return { success: false, error: createError.message }
        }

        // Add all department members to the room
        const { data: deptMembers } = await supabase
            .from('profiles')
            .select('id')
            .eq('department_id', deptId)

        if (deptMembers && deptMembers.length > 0) {
            await supabase.from('chat_room_members').insert(
                deptMembers.map(m => ({ room_id: newRoom.id, user_id: m.id }))
            )
        }

        return { success: true, data: newRoom }
    } catch (error) {
        console.error('Error in getOrCreateDepartmentRoom:', error)
        return { success: false, error: 'Failed to get department room' }
    }
}

// ============ GET MESSAGES ============

export async function getMessages(roomId: string): Promise<{
    success: boolean;
    data?: ChatMessage[];
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get user profile for role check
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Verify user is member of room
        const { data: membership } = await supabase
            .from('chat_room_members')
            .select('id')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { success: false, error: 'Not a member of this chat' }
        }

        // Build messages query — client role cannot see internal messages
        // Fetch newest 500 messages descending, then reverse so display is oldest→newest
        let msgQuery = supabase
            .from('chat_messages')
            .select('id, room_id, sender_id, message, created_at, is_internal, file_url, file_type')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(500)

        if (userProfile?.role === 'client') {
            msgQuery = msgQuery.eq('is_internal', false)
        }

        const { data: messages, error: msgError } = await msgQuery

        if (msgError) {
            return { success: false, error: msgError.message }
        }

        if (!messages || messages.length === 0) {
            return { success: true, data: [] }
        }

        // Get sender names
        const senderIds = Array.from(new Set(messages.map(m => m.sender_id)))
        const { data: senders } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', senderIds)

        const enrichedMessages: ChatMessage[] = messages.map(msg => {
            const sender = senders?.find(s => s.id === msg.sender_id)
            return {
                ...msg,
                sender_name: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
                is_mine: msg.sender_id === user.id
            }
        })

        // Reverse back to ascending order (oldest first) for chat display
        return { success: true, data: enrichedMessages.reverse() }
    } catch (error) {
        console.error('Error in getMessages:', error)
        return { success: false, error: 'Failed to fetch messages' }
    }
}

// ============ SEND MESSAGE ============

export async function sendMessage(roomId: string, message: string, fileUrl?: string, fileType?: string, isInternal?: boolean): Promise<{
    success: boolean;
    data?: ChatMessage;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!message.trim() && !fileUrl) {
            return { success: false, error: 'Message cannot be empty' }
        }

        // Verify user is member of room
        const { data: membership } = await supabase
            .from('chat_room_members')
            .select('id')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { success: false, error: 'Not a member of this chat' }
        }

        // Insert message
        const { data: newMessage, error: insertError } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: user.id,
                message: message.trim() || '',
                ...(fileUrl && { file_url: fileUrl, file_type: fileType }),
                ...(isInternal && { is_internal: true })
            })
            .select()
            .single()

        if (insertError) {
            return { success: false, error: insertError.message }
        }

        // Get sender profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single()

        revalidatePath('/dashboard')

        return {
            success: true,
            data: {
                ...newMessage,
                sender_name: profile ? `${profile.first_name} ${profile.last_name}` : 'You',
                is_mine: true
            }
        }
    } catch (error) {
        console.error('Error in sendMessage:', error)
        return { success: false, error: 'Failed to send message' }
    }
}

// ============ GET CHATABLE USERS ============

export async function getChatableUsers(): Promise<{
    success: boolean;
    data?: ChatableUser[];
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get current user's profile
        const { data: myProfile } = await supabase
            .from('profiles')
            .select('department_id')
            .eq('id', user.id)
            .single()

        if (!myProfile) {
            return { success: false, error: 'Profile not found' }
        }

        const chatableUsers: ChatableUser[] = []
        const addedUserIds = new Set<string>()

        // 1. Get Admin/Manager in same department
        const { data: deptMembers } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, department_id')
            .eq('department_id', myProfile.department_id)
            .in('role', ['admin', 'manager'])
            .neq('id', user.id)

        // Get department name
        const { data: dept } = await supabase
            .from('departments')
            .select('name')
            .eq('id', myProfile.department_id)
            .single()

        const deptName = dept?.name || 'Unknown'

        deptMembers?.forEach(member => {
            if (!addedUserIds.has(member.id)) {
                addedUserIds.add(member.id)
                chatableUsers.push({
                    id: member.id,
                    name: `${member.first_name} ${member.last_name}`,
                    email: member.email,
                    role: member.role,
                    department_name: deptName,
                    reason: member.role === 'admin' ? 'admin' : 'manager'
                })
            }
        })

        // 2. Get teammates working on same clients
        // First get clients I have access to
        const { data: myShares } = await supabase
            .from('client_shares')
            .select('client_id')
            .eq('shared_with_user_id', user.id)

        if (myShares && myShares.length > 0) {
            const clientIds = myShares.map(s => s.client_id)

            // Get other users who also have access to these clients
            const { data: teamShares } = await supabase
                .from('client_shares')
                .select('shared_with_user_id')
                .in('client_id', clientIds)
                .neq('shared_with_user_id', user.id)

            if (teamShares && teamShares.length > 0) {
                const teammateIds = Array.from(new Set(teamShares.map(s => s.shared_with_user_id)))
                    .filter(id => !addedUserIds.has(id))

                if (teammateIds.length > 0) {
                    const { data: teammates } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name, email, role, department_id')
                        .in('id', teammateIds)

                    // Get department names for teammates
                    const deptIds = Array.from(new Set(teammates?.map(t => t.department_id).filter(Boolean) || []))
                    const { data: departments } = await supabase
                        .from('departments')
                        .select('id, name')
                        .in('id', deptIds)

                    teammates?.forEach(teammate => {
                        if (!addedUserIds.has(teammate.id)) {
                            addedUserIds.add(teammate.id)
                            const tmDept = departments?.find(d => d.id === teammate.department_id)
                            chatableUsers.push({
                                id: teammate.id,
                                name: `${teammate.first_name} ${teammate.last_name}`,
                                email: teammate.email,
                                role: teammate.role,
                                department_name: tmDept?.name || 'Unknown',
                                reason: 'teammate'
                            })
                        }
                    })
                }
            }
        }

        return { success: true, data: chatableUsers }
    } catch (error) {
        console.error('Error in getChatableUsers:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}
