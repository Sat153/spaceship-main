import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Matches date folder names like "16 May 2026"
const DATE_FOLDER_RE = /^\d{2} \w{3} \d{4}$/

export async function GET() {
  const admin = createAdminClient()

  // Get all files with their parent folder info
  const { data: files, error } = await admin
    .from('assets')
    .select('id, name, parent_id, department_id, created_by, created_at')
    .eq('type', 'file')
    .not('parent_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message })
  if (!files || files.length === 0) return NextResponse.json({ ok: true, moved: 0 })

  // Get all folders referenced as parents
  const parentIds = [...new Set(files.map(f => f.parent_id))]
  const { data: folders } = await admin
    .from('assets')
    .select('id, name, parent_id, department_id, created_by')
    .in('id', parentIds)
    .eq('type', 'folder')

  const folderMap = new Map((folders || []).map(f => [f.id, f]))

  // Filter files whose parent is NOT already a date folder
  const looseFiles = files.filter(f => {
    const parent = folderMap.get(f.parent_id)
    return parent && !DATE_FOLDER_RE.test(parent.name)
  })

  if (looseFiles.length === 0) return NextResponse.json({ ok: true, moved: 0, message: 'All files already in date folders' })

  // Cache of created date folders: key = "parentId::dateLabel" → folderId
  const dateFolderCache = new Map<string, string>()

  async function getOrCreateDateFolder(parentId: string, dateLabel: string, deptId: string, createdBy: string): Promise<string> {
    const key = `${parentId}::${dateLabel}`
    if (dateFolderCache.has(key)) return dateFolderCache.get(key)!

    const { data: existing } = await admin
      .from('assets')
      .select('id')
      .eq('name', dateLabel)
      .eq('type', 'folder')
      .eq('parent_id', parentId)
      .maybeSingle()

    if (existing) {
      dateFolderCache.set(key, existing.id)
      return existing.id
    }

    const { data: created } = await admin
      .from('assets')
      .insert({ name: dateLabel, type: 'folder', parent_id: parentId, department_id: deptId, created_by: createdBy })
      .select('id')
      .single()

    dateFolderCache.set(key, created.id)
    return created.id
  }

  let moved = 0
  const log: any[] = []

  for (const file of looseFiles) {
    const parent = folderMap.get(file.parent_id)!
    const dateLabel = new Date(file.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    })

    const dateFolderId = await getOrCreateDateFolder(
      file.parent_id,
      dateLabel,
      file.department_id,
      file.created_by
    )

    const { error: updateErr } = await admin
      .from('assets')
      .update({ parent_id: dateFolderId })
      .eq('id', file.id)

    if (updateErr) {
      log.push({ file: file.name, error: updateErr.message })
    } else {
      moved++
    }
  }

  return NextResponse.json({ ok: true, moved, errors: log })
}
