'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendPhotoAssignmentEmail } from '@/lib/email'

export interface Department {
    id: string
    name: string
}

export interface Profile {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    department_id: string | null
}

export interface RawPhoto {
    id: string
    photo_id: string
    image_url: string
    assignee_id: string | null
    department_id: string | null
    status: 'assigned' | 'in_progress' | 'completed' | 'rejected'
    created_at: string
    assignee?: Profile | null
    department?: Department | null
}

export async function getDepartmentsAndProfiles() {
    const supabase = createAdminClient()

    const [deptResult, profileResult] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('profiles').select('id, first_name, last_name, email, department_id').order('first_name'),
    ])

    return {
        departments: (deptResult.data || []) as Department[],
        profiles: (profileResult.data || []) as Profile[],
    }
}

export async function getRawPhotos(): Promise<RawPhoto[]> {
    const supabase = createAdminClient()

    const { data } = await supabase
        .from('raw_photos')
        .select('*, assignee:profiles(id, first_name, last_name, email, department_id), department:departments(id, name)')
        .order('created_at', { ascending: false })

    return (data || []) as RawPhoto[]
}

async function notifyAssignee(
    assigneeId: string,
    rawPhotoRowId: string,
    photoId: string,
    imageUrl: string,
    assignedByName: string,
    departmentId?: string | null
) {
    const supabase = createAdminClient()

    const [profileRes, deptRes] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, email').eq('id', assigneeId).single(),
        departmentId
            ? supabase.from('departments').select('name').eq('id', departmentId).single()
            : Promise.resolve({ data: null }),
    ])

    if (!profileRes.data?.email) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const taskUrl = `${appUrl}/task/${rawPhotoRowId}`

    await sendPhotoAssignmentEmail({
        toEmail: profileRes.data.email,
        toName: `${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim(),
        assignedBy: assignedByName,
        photoId,
        imageUrl,
        taskUrl,
        departmentName: (deptRes.data as any)?.name || null,
    })
}

export async function assignRawPhoto(
    photoId: string,
    assigneeId: string | null,
    departmentId: string | null,
    assignedByName = 'Admin'
) {
    const supabase = createAdminClient()

    const { data: photo, error } = await supabase
        .from('raw_photos')
        .update({ assignee_id: assigneeId, department_id: departmentId })
        .eq('id', photoId)
        .select('photo_id, image_url')
        .single()

    if (error) return { error: error.message }

    if (assigneeId && photo) {
        notifyAssignee(assigneeId, photoId, photo.photo_id, photo.image_url, assignedByName, departmentId)
    }

    return { error: null }
}

export async function updateRawPhotoStatus(photoId: string, status: RawPhoto['status']) {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('raw_photos')
        .update({ status })
        .eq('id', photoId)

    return { error: error?.message || null }
}

export async function createRawPhoto(
    imageUrl: string,
    assigneeId: string | null,
    departmentId: string | null,
    assignedByName = 'Admin'
) {
    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('raw_photos')
        .insert({ image_url: imageUrl, assignee_id: assigneeId, department_id: departmentId })
        .select('id, photo_id, image_url')
        .single()

    if (error) return { data: null, error: error.message }

    if (assigneeId && data) {
        notifyAssignee(assigneeId, data.id, data.photo_id, data.image_url, assignedByName, departmentId)
    }

    return { data, error: null }
}
