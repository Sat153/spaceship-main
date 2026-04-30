import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Download, CheckCircle, Clock, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

async function getTask(id: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('raw_photos')
        .select(`
            id,
            photo_id,
            image_url,
            status,
            created_at,
            assignee:profiles(first_name, last_name, email),
            department:departments(name)
        `)
        .eq('id', id)
        .single()

    if (error || !data) return null
    return data
}

function isVideo(url: string) {
    return /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(url)
}

export default async function TaskViewPage({ params }: PageProps) {
    const { id } = await params
    const task = await getTask(id)

    if (!task) notFound()

    const assignee = task.assignee as any
    const department = task.department as any
    const name = assignee
        ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || 'Team Member'
        : 'Team Member'
    const deptName = department?.name || null
    const fileIsVideo = isVideo(task.image_url)
    const fileName = task.image_url.split('/').pop()?.split('?')[0] || task.photo_id

    return (
        <div style={{ margin: 0, padding: 0, background: '#0a0a0a', minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px' }}>

                {/* Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Anya Segen CRM</p>
                </div>

                {/* Main Card */}
                <div style={{ background: '#111827', borderRadius: 16, border: '1px solid #1f2937', overflow: 'hidden' }}>

                    {/* Header bar */}
                    <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', padding: '28px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Briefcase size={22} color="#fff" />
                            </div>
                            <div>
                                <p style={{ margin: 0, color: '#bfdbfe', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>New Task Assigned</p>
                                <h1 style={{ margin: '4px 0 0', color: '#ffffff', fontSize: 22, fontWeight: 700 }}>You got your today&apos;s task!</h1>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '28px 32px' }}>

                        {/* Greeting */}
                        <p style={{ margin: '0 0 24px', color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
                            Hi <strong style={{ color: '#f9fafb' }}>{name}</strong>, a new file has been assigned to you.
                            {deptName && <> This is for the <strong style={{ color: '#f9fafb' }}>{deptName}</strong> department.</>}
                        </p>

                        {/* File Preview */}
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #374151', marginBottom: 28, background: '#1f2937' }}>
                            {fileIsVideo ? (
                                <video
                                    src={task.image_url}
                                    controls
                                    style={{ width: '100%', maxHeight: 340, display: 'block', background: '#000' }}
                                />
                            ) : (
                                <img
                                    src={task.image_url}
                                    alt={task.photo_id}
                                    style={{ width: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }}
                                />
                            )}
                        </div>

                        {/* Meta */}
                        <div style={{ background: '#1f2937', borderRadius: 10, border: '1px solid #374151', marginBottom: 28 }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Clock size={15} color="#6b7280" />
                                <div>
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Assigned</p>
                                    <p style={{ margin: '2px 0 0', color: '#f9fafb', fontSize: 14 }}>
                                        {new Date(task.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CheckCircle size={15} color="#6b7280" />
                                <div>
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Task ID</p>
                                    <p style={{ margin: '2px 0 0', color: '#f9fafb', fontSize: 14, fontFamily: 'monospace' }}>{task.photo_id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <a
                            href={task.image_url}
                            download={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                width: '100%',
                                padding: '14px 24px',
                                background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
                                color: '#ffffff',
                                borderRadius: 10,
                                textDecoration: 'none',
                                fontSize: 15,
                                fontWeight: 600,
                                boxSizing: 'border-box',
                            }}
                        >
                            <Download size={18} />
                            Download {fileIsVideo ? 'Video' : 'Photo'}
                        </a>

                        <p style={{ margin: '16px 0 0', color: '#4b5563', fontSize: 12, textAlign: 'center' }}>
                            The file will be saved to your device.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p style={{ margin: '24px 0 0', color: '#374151', fontSize: 12, textAlign: 'center' }}>
                    Anya Segen CRM · This task was assigned to you by your team lead.
                </p>
            </div>
        </div>
    )
}
