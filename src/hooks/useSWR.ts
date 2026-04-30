'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import {
    getSharedClients,
    getClientDetails,
    getClientFiles,
    getClientIntelligenceForUser,
    SharedClient,
    ClientDetails,
    ClientAsset,
    ClientIntelligenceItem
} from '@/app/actions/user-clients'
import {
    getMyRooms,
    getMessages,
    sendMessage,
    getChatableUsers,
    getOrCreateDirectRoom,
    ChatRoom,
    ChatMessage,
    ChatableUser
} from '@/app/actions/chat'

// ============ SHARED CLIENTS HOOKS ============

export function useSharedClients() {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: SharedClient[];
        error?: string;
    }>(
        'shared-clients',
        () => getSharedClients(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        clients: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useClientDetails(clientId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: ClientDetails;
        error?: string;
    }>(
        clientId ? `client-details-${clientId}` : null,
        () => clientId ? getClientDetails(clientId) : Promise.resolve({ success: false }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 120000, // 2 minute cache
        }
    )

    return {
        client: data?.data || null,
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useClientFiles(clientId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: ClientAsset[];
        error?: string;
    }>(
        clientId ? `client-files-${clientId}` : null,
        () => clientId ? getClientFiles(clientId) : Promise.resolve({ success: false }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        files: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useClientIntelligence(clientId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean
        news?: ClientIntelligenceItem[]
        twitter?: ClientIntelligenceItem[]
        error?: string
    }>(
        clientId ? `client-intel-${clientId}` : null,
        () => clientId ? getClientIntelligenceForUser(clientId) : Promise.resolve({ success: false }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        news: data?.news || [],
        twitter: data?.twitter || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

// ============ CHAT HOOKS ============

export function useChatRooms() {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: ChatRoom[];
        error?: string;
    }>(
        'chat-rooms',
        () => getMyRooms(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 second cache
        }
    )

    return {
        rooms: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useChatMessages(roomId: string | null, pollingInterval?: number) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: ChatMessage[];
        error?: string;
    }>(
        roomId ? `chat-messages-${roomId}` : null,
        () => roomId ? getMessages(roomId) : Promise.resolve({ success: false }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000, // 5 second dedup
            refreshInterval: pollingInterval || 0, // Optional polling
        }
    )

    return {
        messages: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useChatableUsers() {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: ChatableUser[];
        error?: string;
    }>(
        'chatable-users',
        () => getChatableUsers(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 120000, // 2 minute cache (doesn't change often)
        }
    )

    return {
        users: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

// ============ MUTATION HOOKS ============

export function useSendMessage(roomId: string | null) {
    const { trigger, isMutating } = useSWRMutation(
        roomId ? `chat-messages-${roomId}` : null,
        async (_key: string, { arg }: { arg: string }) => {
            if (!roomId) throw new Error('No room selected')
            return sendMessage(roomId, arg)
        }
    )

    return {
        sendMessage: trigger,
        isSending: isMutating,
    }
}

export function useCreateDirectRoom() {
    const { trigger, isMutating } = useSWRMutation(
        'create-direct-room',
        async (_key: string, { arg }: { arg: string }) => {
            return getOrCreateDirectRoom(arg)
        }
    )

    return {
        createRoom: trigger,
        isCreating: isMutating,
    }
}

export function useCreateClientRoom() {
    const { trigger, isMutating } = useSWRMutation(
        'create-client-room',
        async (_key: string, { arg }: { arg: string }) => {
            const { getOrCreateClientRoom } = await import('@/app/actions/chat')
            return getOrCreateClientRoom(arg)
        }
    )

    return {
        createRoom: trigger,
        isCreating: isMutating,
    }
}

export function useCreateDepartmentRoom() {
    const { trigger, isMutating } = useSWRMutation(
        'create-department-room',
        async (_key: string, { arg }: { arg?: string }) => {
            const { getOrCreateDepartmentRoom } = await import('@/app/actions/chat')
            return getOrCreateDepartmentRoom(arg)
        }
    )

    return {
        createRoom: trigger,
        isCreating: isMutating,
    }
}

// ============ ADMIN HOOKS ============

export function useAdminDocuments() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-documents',
        async () => {
            const { fetchDocuments } = await import('@/app/actions/admin-documents')
            return fetchDocuments()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        documents: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminDepartments() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-departments-list',
        async () => {
            const { fetchDepartments } = await import('@/app/actions/admin-documents')
            return fetchDepartments()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 120000, // 2 minute cache (rarely changes)
        }
    )

    return {
        departments: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminTasks() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-tasks',
        async () => {
            const { fetchTasks } = await import('@/app/actions/admin-kanban')
            return fetchTasks()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 second cache
        }
    )

    return {
        tasks: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminEvents() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-events',
        async () => {
            const { fetchEvents } = await import('@/app/actions/admin-calendar')
            return fetchEvents()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        events: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminTeamMembers() {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data?: any[];
        error?: string;
    }>(
        'admin-team-members',
        async () => {
            const { getTeamMembers } = await import('@/app/actions/admin-team')
            return getTeamMembers()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        members: data?.data || [],
        isLoading,
        isError: !!error || !data?.success,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminUsers() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-users',
        async () => {
            const { fetchUsers } = await import('@/app/actions/admin-kanban')
            return fetchUsers()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 120000, // 2 minute cache
        }
    )

    return {
        users: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminProjects() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-projects',
        async () => {
            const { fetchProjects } = await import('@/app/actions/projects')
            return fetchProjects()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    )

    return {
        projects: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useAdminClients() {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null;
        error: string | null;
    }>(
        'admin-clients-list',
        async () => {
            const { fetchClients } = await import('@/app/actions/admin-calendar')
            return fetchClients()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    )

    return {
        clients: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

export function useContentPosts(filters?: { status?: string }) {
    const { data, error, isLoading, mutate } = useSWR<{
        data: any[] | null
        error: string | null
    }>(
        filters?.status ? `content-posts-${filters.status}` : 'content-posts-all',
        async () => {
            const { getContentPosts } = await import('@/app/actions/content-posts')
            return getContentPosts(filters?.status ? { status: filters.status as any } : undefined)
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 second cache
        }
    )

    return {
        posts: data?.data || [],
        isLoading,
        isError: !!error || !!data?.error,
        error: error || data?.error,
        refresh: mutate,
    }
}

