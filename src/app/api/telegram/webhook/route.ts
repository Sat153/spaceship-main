import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`)
    const json = await res.json()
    if (!json.ok) return null
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${json.result.file_path}`
}

async function getOrCreateFolder(
    supabase: any,
    name: string,
    parentId: string | null,
    departmentId: string,
    userId: string
): Promise<string> {
    let query = supabase
        .from('assets')
        .select('id')
        .eq('name', name)
        .eq('type', 'folder')
        .eq('department_id', departmentId)

    query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null)

    const { data: existing } = await query.maybeSingle()
    if (existing) return existing.id

    const { data: newFolder } = await supabase
        .from('assets')
        .insert({ name, type: 'folder', parent_id: parentId, department_id: departmentId, created_by: userId })
        .select('id')
        .single()

    return newFolder.id
}

export async function POST(request: NextRequest) {
    let update: any
    try {
        update = await request.json()
    } catch {
        return NextResponse.json({ ok: true })
    }

    const message = update.message || update.channel_post
    if (!message) return NextResponse.json({ ok: true })

    const { photo, video, document: doc, chat } = message
    if (!photo && !video && !doc) return NextResponse.json({ ok: true })

    const chatType = chat?.type
    if (!['group', 'supergroup', 'channel'].includes(chatType)) {
        return NextResponse.json({ ok: true })
    }

    const groupName = chat?.title || 'Unknown Group'
    console.log(`[Telegram] Media received from: "${groupName}"`)

    try {
        const supabase = createAdminClient()

        // Get Ganesh Joshi client
        const { data: client } = await supabase
            .from('clients')
            .select('id, department_id, name')
            .ilike('name', '%ganesh joshi%')
            .single()

        if (!client) {
            console.error('[Telegram] Client "Ganesh Joshi" not found in DB')
            return NextResponse.json({ ok: true })
        }

        // Get first admin user as uploader
        const { data: adminUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .single()

        const userId = adminUser?.id
        const deptId = client.department_id

        if (!deptId) {
            console.error('[Telegram] Ganesh Joshi client has no department_id')
            return NextResponse.json({ ok: true })
        }

        // Build folder: Clients → Ganesh Joshi → {Group Name}
        const clientsFolderId = await getOrCreateFolder(supabase, 'Clients', null, deptId, userId)
        const clientFolderId  = await getOrCreateFolder(supabase, client.name, clientsFolderId, deptId, userId)
        const groupFolderId   = await getOrCreateFolder(supabase, groupName, clientFolderId, deptId, userId)

        // Resolve file info
        let fileId: string
        let mimeType: string
        let fileName: string
        let fileSize: number = 0

        if (photo) {
            const best = photo[photo.length - 1]
            fileId = best.file_id
            fileSize = best.file_size || 0
            mimeType = 'image/jpeg'
            fileName = `photo_${Date.now()}.jpg`
        } else if (video) {
            fileId = video.file_id
            fileSize = video.file_size || 0
            mimeType = video.mime_type || 'video/mp4'
            const ext = mimeType.split('/')[1] || 'mp4'
            fileName = video.file_name || `video_${Date.now()}.${ext}`
        } else if (doc) {
            fileId = doc.file_id
            fileSize = doc.file_size || 0
            mimeType = doc.mime_type || 'application/octet-stream'
            fileName = doc.file_name || `file_${Date.now()}`
        } else {
            return NextResponse.json({ ok: true })
        }

        // Telegram limits bot downloads to 20MB
        if (fileSize > 20 * 1024 * 1024) {
            console.warn(`[Telegram] File too large (${fileSize} bytes), skipping: ${fileName}`)
            return NextResponse.json({ ok: true })
        }

        // Get download URL
        const downloadUrl = await getTelegramFileUrl(fileId)
        if (!downloadUrl) {
            console.error('[Telegram] Could not get file URL for:', fileId)
            return NextResponse.json({ ok: true })
        }

        // Download the file
        const fileRes = await fetch(downloadUrl)
        if (!fileRes.ok) {
            console.error('[Telegram] Download failed:', downloadUrl)
            return NextResponse.json({ ok: true })
        }
        const fileBuffer = await fileRes.arrayBuffer()

        // Upload to Supabase Storage
        const storagePath = `${deptId}/telegram/${Date.now()}-${fileName}`
        const { error: uploadError } = await supabase.storage
            .from('team-assets')
            .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

        if (uploadError) {
            console.error('[Telegram] Storage upload error:', uploadError)
            return NextResponse.json({ ok: true })
        }

        const { data: { publicUrl } } = supabase.storage.from('team-assets').getPublicUrl(storagePath)

        // Save asset record
        const { error: dbError } = await supabase.from('assets').insert({
            name: fileName,
            type: 'file',
            parent_id: groupFolderId,
            department_id: deptId,
            url: publicUrl,
            size: fileBuffer.byteLength,
            mime_type: mimeType,
            created_by: userId,
            client_id: client.id,
        })

        if (dbError) {
            console.error('[Telegram] DB insert error:', dbError)
        } else {
            console.log(`[Telegram] Saved "${fileName}" from "${groupName}" ✓`)
        }

        return NextResponse.json({ ok: true })

    } catch (err) {
        console.error('[Telegram] Webhook error:', err)
        return NextResponse.json({ ok: true }) // Always 200 so Telegram doesn't retry
    }
}
