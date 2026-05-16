import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DATE_FOLDER_RE = /^\d{2} \w{3} \d{4}$/

export async function GET() {
  const admin = createAdminClient()

  // 1. Get all files with parent info in two queries
  const { data: files, error } = await admin
    .from('assets')
    .select('id, name, parent_id, department_id, created_by, created_at')
    .eq('type', 'file')
    .not('parent_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message })
  if (!files || files.length === 0) return NextResponse.json({ ok: true, moved: 0 })

  const parentIds = Array.from(new Set(files.map((f: any) => f.parent_id)))

  const { data: folders } = await admin
    .from('assets')
    .select('id, name, parent_id, department_id, created_by')
    .in('id', parentIds)
    .eq('type', 'folder')

  const folderMap = new Map((folders || []).map((f: any) => [f.id, f]))

  // 2. Filter files not already in a date folder
  const looseFiles = files.filter((f: any) => {
    const parent = folderMap.get(f.parent_id)
    return parent && !DATE_FOLDER_RE.test(parent.name)
  })

  if (looseFiles.length === 0) {
    return NextResponse.json({ ok: true, moved: 0, message: 'All files already in date folders' })
  }

  // 3. Build unique (parentId, dateLabel) pairs needed
  type DateKey = { parentId: string; dateLabel: string; deptId: string; createdBy: string }
  const needed = new Map<string, DateKey>()
  for (const f of looseFiles) {
    const dateLabel = new Date(f.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
    const key = `${f.parent_id}::${dateLabel}`
    if (!needed.has(key)) {
      needed.set(key, { parentId: f.parent_id, dateLabel, deptId: f.department_id, createdBy: f.created_by })
    }
  }

  // 4. Check which date folders already exist
  const neededEntries = Array.from(needed.values())
  const neededParentIds = Array.from(new Set(neededEntries.map(e => e.parentId)))
  const neededLabels = Array.from(new Set(neededEntries.map(e => e.dateLabel)))

  const { data: existingDateFolders } = await admin
    .from('assets')
    .select('id, name, parent_id')
    .eq('type', 'folder')
    .in('parent_id', neededParentIds)
    .in('name', neededLabels)

  const existingMap = new Map<string, string>()
  ;(existingDateFolders || []).forEach((f: any) => {
    existingMap.set(`${f.parent_id}::${f.name}`, f.id)
  })

  // 5. Create missing date folders in one bulk insert
  const toCreate = neededEntries.filter(e => !existingMap.has(`${e.parentId}::${e.dateLabel}`))

  if (toCreate.length > 0) {
    const rows = toCreate.map(e => ({
      name: e.dateLabel,
      type: 'folder',
      parent_id: e.parentId,
      department_id: e.deptId,
      created_by: e.createdBy,
    }))
    const { data: created, error: createErr } = await admin
      .from('assets')
      .insert(rows)
      .select('id, name, parent_id')
    if (createErr) return NextResponse.json({ error: 'Failed to create date folders: ' + createErr.message })
    ;(created || []).forEach((f: any) => {
      existingMap.set(`${f.parent_id}::${f.name}`, f.id)
    })
  }

  // 6. Group files by their target date folder and bulk update each group
  const groups = new Map<string, string[]>() // dateFolderId → fileIds[]
  for (const f of looseFiles) {
    const dateLabel = new Date(f.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
    const dateFolderId = existingMap.get(`${f.parent_id}::${dateLabel}`)
    if (!dateFolderId) continue
    if (!groups.has(dateFolderId)) groups.set(dateFolderId, [])
    groups.get(dateFolderId)!.push(f.id)
  }

  let moved = 0
  for (const [dateFolderId, fileIds] of Array.from(groups)) {
    const { error: updateErr } = await admin
      .from('assets')
      .update({ parent_id: dateFolderId })
      .in('id', fileIds)
    if (!updateErr) moved += fileIds.length
  }

  return NextResponse.json({ ok: true, moved, dateFoldersCreated: toCreate.length })
}
