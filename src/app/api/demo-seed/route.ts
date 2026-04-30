import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    try {
        const admin = createAdminClient()

        // Get the first admin user + their department
        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('id, department_id')
            .eq('role', 'admin')
            .not('department_id', 'is', null)
            .limit(1)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'No admin profile found', detail: profileError }, { status: 400 })
        }

        const userId = profile.id
        const deptId = profile.department_id

        // Create a demo folder
        const { data: folder, error: folderError } = await admin
            .from('assets')
            .insert({
                name: 'Demo Folder',
                type: 'folder',
                parent_id: null,
                department_id: deptId,
                created_by: userId,
            })
            .select()
            .single()

        if (folderError) {
            return NextResponse.json({ error: 'Failed to create folder', detail: folderError }, { status: 400 })
        }

        // Create a dummy image file record inside that folder
        const { data: file, error: fileError } = await admin
            .from('assets')
            .insert({
                name: 'sample-photo.jpg',
                type: 'file',
                parent_id: folder.id,
                department_id: deptId,
                url: 'https://picsum.photos/seed/anya/800/600',
                size: 204800,
                mime_type: 'image/jpeg',
                created_by: userId,
            })
            .select()
            .single()

        if (fileError) {
            return NextResponse.json({ error: 'Failed to create file', detail: fileError }, { status: 400 })
        }

        // Create a dummy PDF file record at root
        const { data: pdf, error: pdfError } = await admin
            .from('assets')
            .insert({
                name: 'brand-guidelines.pdf',
                type: 'file',
                parent_id: null,
                department_id: deptId,
                url: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF1',
                size: 512000,
                mime_type: 'application/pdf',
                created_by: userId,
            })
            .select()
            .single()

        return NextResponse.json({
            success: true,
            message: 'Demo data created!',
            created: {
                folder: folder.name,
                fileInsideFolder: file.name,
                rootFile: pdf?.name ?? 'skipped',
            }
        })

    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}

// Cleanup endpoint
export async function DELETE() {
    try {
        const admin = createAdminClient()
        await admin.from('assets').delete().in('name', ['Demo Folder', 'sample-photo.jpg', 'brand-guidelines.pdf'])
        return NextResponse.json({ success: true, message: 'Demo data removed' })
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
