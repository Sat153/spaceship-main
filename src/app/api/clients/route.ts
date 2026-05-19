import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotificationForUser } from '@/app/actions/notifications'

// Validation schema for client creation/update
const clientSchema = z.object({
  name: z.string().min(1).max(255),
  client_type: z.enum(['politician', 'corporate', 'ngo', 'government_body', 'startup', 'nonprofit']),
  status: z.enum(['active', 'inactive', 'prospect', 'archived', 'on_hold']).optional(),
  display_name: z.string().max(255).optional(),
  primary_email: z.string().email().optional().or(z.literal('')),
  primary_phone: z.string().max(50).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  industry: z.string().max(255).optional(),
  company_size: z.string().max(50).optional(),
  annual_budget_range: z.string().max(100).optional(),
  department_id: z.string().uuid(),
  account_manager_id: z.string().uuid().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  internal_notes: z.string().optional(),
  client_brief: z.string().optional(),
  // Social Media fields
  social_instagram: z.string().max(500).optional().or(z.literal('')),
  social_twitter: z.string().max(500).optional().or(z.literal('')),
  social_youtube: z.string().max(500).optional().or(z.literal('')),
  social_linkedin: z.string().max(500).optional().or(z.literal('')),
  social_facebook: z.string().max(500).optional().or(z.literal('')),
  social_tiktok: z.string().max(500).optional().or(z.literal('')),
  social_other: z.record(z.string()).optional(),
})

// Helper function to log client activity
async function logClientActivity(
  supabase: any,
  clientId: string,
  activityType: string,
  description: string,
  userId: string,
  departmentId: string,
  entityType: string = 'client',
  oldValues: any = {},
  newValues: any = {},
  req?: NextRequest
) {
  try {
    const clientIP = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || null
    const userAgent = req?.headers.get('user-agent') || null

    await supabase.from('client_activities').insert({
      client_id: clientId,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: clientId,
      description,
      old_values: oldValues,
      new_values: newValues,
      user_id: userId,
      department_id: departmentId,
      ip_address: clientIP,
      user_agent: userAgent,
    })
  } catch (error) {
    console.error('Failed to log client activity:', error)
  }
}

// Helper function to get user profile and check permissions
async function getUserProfile(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, department_id, role, first_name, last_name')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new Error('Profile not found')
  }

  return profile
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const profile = await getUserProfile(supabase, user.id)

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const clientType = url.searchParams.get('client_type') || ''
    const departmentId = url.searchParams.get('department_id') || ''

    const offset = (page - 1) * limit

    // Build query with department isolation (RLS will also enforce this)
    let query = supabase
      .from('clients')
      .select(`
        *,
        department:departments(name),
        account_manager:profiles!clients_account_manager_id_fkey(first_name, last_name),
        created_by_user:profiles!clients_created_by_fkey(first_name, last_name)
      `)

    // Apply filters
    if (search) {
      // Simple text search for now - can add full text search later
      query = query.ilike('name', `%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (clientType) {
      query = query.eq('client_type', clientType)
    }

    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }

    // Admins see all clients; non-admins see only their department
    const isSuperAdmin = profile.role === 'admin'
    if (!isSuperAdmin) {
      query = query.eq('department_id', profile.department_id)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    if (!isSuperAdmin) {
      countQuery = countQuery.eq('department_id', profile.department_id)
    }


    const { count: totalCount } = await countQuery

    return NextResponse.json({
      clients: clients || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Auto-creates 6 stage rooms + room_access entries + client_workflow when a client is created
async function setupClientWorkflow(supabase: any, clientId: string, clientName: string, creatorId: string) {
  // Fetch all workflow stages ordered
  const { data: stages, error: stagesErr } = await supabase
    .from('workflow_stages')
    .select('id, name, stage_order, allowed_dept_names')
    .order('stage_order', { ascending: true })

  if (stagesErr || !stages?.length) {
    console.error('Could not fetch workflow_stages:', stagesErr)
    return
  }

  // Fetch all departments (to map name → id)
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')

  const deptMap: Record<string, string> = {}
  departments?.forEach((d: { id: string; name: string }) => { deptMap[d.name] = d.id })

  // Fetch all team member profiles (to add them to rooms)
  const { data: allMembers } = await supabase
    .from('profiles')
    .select('id, department_id, role')

  for (const stage of stages) {
    // Create chat room for this stage
    const { data: room, error: roomErr } = await supabase
      .from('chat_rooms')
      .insert({
        name: `${clientName} — ${stage.name}`,
        type: 'client',
        client_id: clientId,
        stage_id: stage.id,
        created_by: creatorId,
      })
      .select('id')
      .single()

    if (roomErr || !room) {
      console.error(`Failed to create room for stage ${stage.name}:`, roomErr)
      continue
    }

    // Determine which departments can access this room
    const allowedDeptIds: string[] = []
    for (const deptName of (stage.allowed_dept_names || [])) {
      if (deptMap[deptName]) allowedDeptIds.push(deptMap[deptName])
    }

    // Insert room_access rows for each allowed department
    if (allowedDeptIds.length > 0) {
      await supabase.from('room_access').insert(
        allowedDeptIds.map((deptId: string) => ({ room_id: room.id, department_id: deptId }))
      )
    }

    // Add members to chat_room_members
    // Admin always gets added; dept members get added if their dept is allowed
    const membersToAdd: string[] = []
    for (const member of (allMembers || [])) {
      if (member.role === 'admin') {
        membersToAdd.push(member.id)
      } else if (member.department_id && allowedDeptIds.includes(member.department_id)) {
        membersToAdd.push(member.id)
      }
    }

    const uniqueMembers = Array.from(new Set(membersToAdd))
    if (uniqueMembers.length > 0) {
      await supabase.from('chat_room_members').insert(
        uniqueMembers.map((uid: string) => ({ room_id: room.id, user_id: uid }))
      )
      // Notify each member they've been added to this workflow room
      await Promise.all(uniqueMembers.map((uid: string) =>
        createNotificationForUser(
          uid,
          `💬 Added to workflow: ${stage.name}`,
          `You've been added to the "${stage.name}" group for client workflow. Open Messages to view it.`,
          'info'
        )
      ))
    }
  }

  // Create client_workflow pointing to stage 1
  await supabase.from('client_workflows').insert({
    client_id: clientId,
    current_stage_id: stages[0].id,
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const profile = await getUserProfile(supabase, user.id)

    // Check if user is admin (only admins can create clients)
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create clients' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    // Create client
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        ...validatedData,
        account_manager_id: validatedData.account_manager_id || null,
        created_by: user.id,
      })
      .select(`
        *,
        department:departments(name),
        account_manager:profiles!clients_account_manager_id_fkey(first_name, last_name),
        created_by_user:profiles!clients_created_by_fkey(first_name, last_name)
      `)
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Log activity
    await logClientActivity(
      supabase,
      newClient.id,
      'created',
      `Client "${newClient.name}" created`,
      user.id,
      validatedData.department_id,
      'client',
      {},
      newClient,
      request
    )

    // Auto-create 6 workflow rooms + client_workflow entry (non-blocking)
    setupClientWorkflow(supabase, newClient.id, newClient.name, user.id).catch(err =>
      console.error('Workflow setup error (non-blocking):', err)
    )

    return NextResponse.json({ client: newClient }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}