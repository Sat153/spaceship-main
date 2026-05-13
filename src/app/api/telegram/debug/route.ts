import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    const results: Record<string, any> = {}
    const supabase = createAdminClient()

    // 1. Check bot token
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    results.bot_token_set = !!botToken

    // 2. Check webhook info from Telegram
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
        const data = await res.json()
        results.telegram_webhook = data.result
    } catch (e: any) {
        results.telegram_webhook_error = e.message
    }

    // 3. Find Ganesh Joshi client
    const { data: clients, error: clientErr } = await supabase
        .from('clients')
        .select('id, name, department_id')
        .ilike('name', '%ganesh%')

    results.ganesh_clients_found = clients
    results.ganesh_client_error = clientErr?.message

    // 4. Check team-assets bucket
    const { data: buckets, error: bucketErr } = await supabase
        .storage
        .listBuckets()

    results.buckets = buckets?.map(b => b.name)
    results.bucket_error = bucketErr?.message

    // 5. Check assets table
    const { data: assets, error: assetsErr } = await supabase
        .from('assets')
        .select('id, name, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    results.recent_assets = assets
    results.assets_error = assetsErr?.message

    // 6. Check admin user exists
    const { data: admin } = await supabase
        .from('profiles')
        .select('id, first_name, role')
        .eq('role', 'admin')
        .limit(1)
        .single()

    results.admin_user = admin ? { id: admin.id, name: admin.first_name } : null

    // 7. Test storage upload
    try {
        const testContent = new TextEncoder().encode('test')
        const testPath = `test/debug-${Date.now()}.txt`
        const { error: uploadErr } = await supabase.storage
            .from('team-assets')
            .upload(testPath, testContent, { contentType: 'text/plain', upsert: true })

        results.storage_upload_test = uploadErr ? `FAILED: ${uploadErr.message}` : 'SUCCESS'

        if (!uploadErr) {
            await supabase.storage.from('team-assets').remove([testPath])
        }
    } catch (e: any) {
        results.storage_upload_test = `ERROR: ${e.message}`
    }

    // 8. Test assets table insert
    try {
        const { error: insertErr } = await supabase.from('assets').insert({
            name: '__debug_test__',
            type: 'folder',
            parent_id: null,
            department_id: 'd6953c18-2746-421c-91f4-7fbca3850445',
            url: null,
            size: 0,
            mime_type: null,
            created_by: '8bd60502-fe10-4e01-bd09-feba180836a0',
        }).select('id').single()

        if (insertErr) {
            results.assets_insert_test = `FAILED: ${insertErr.message}`
        } else {
            results.assets_insert_test = 'SUCCESS'
        }
    } catch (e: any) {
        results.assets_insert_test = `ERROR: ${e.message}`
    }

    return NextResponse.json(results, { status: 200 })
}
