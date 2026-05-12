'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { CalendarDays, MapPin, Video, Clock, Users } from 'lucide-react'

interface Event {
  id: string
  title: string
  description?: string
  event_type: string
  start_date: string
  end_date: string
  all_day: boolean
  location?: string
  meeting_url?: string
  priority: string
  color: string
}

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting', deadline: 'Deadline', reminder: 'Reminder',
  appointment: 'Appointment', block_time: 'Block Time', general: 'General',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 border-red-500/30 text-red-400',
  high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  medium: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  low: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function UserCalendar() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.department_id) return
    const fetchEvents = async () => {
      const now = new Date().toISOString()
      // Get events for user's department
      const { data: deptEvents } = await supabase
        .from('admin_events')
        .select('id, title, description, event_type, start_date, end_date, all_day, location, meeting_url, priority, color, assigned_to')
        .eq('department_id', profile.department_id)
        .gte('end_date', now)
        .order('start_date', { ascending: true })
        .limit(50)

      const all: Event[] = []
      for (const e of deptEvents || []) {
        // Include if no specific assignees, or if user is in the assignee list
        let include = true
        if (e.assigned_to) {
          try {
            const ids: string[] = JSON.parse(e.assigned_to)
            include = ids.length === 0 || ids.includes(user!.id)
          } catch { include = true }
        }
        if (include) all.push(e)
      }
      setEvents(all)
      setLoading(false)
    }
    fetchEvents()
  }, [profile?.department_id, user?.id])

  const upcoming = events.filter(e => new Date(e.start_date) >= new Date())
  const today = new Date().toDateString()
  const todayEvents = events.filter(e => new Date(e.start_date).toDateString() === today)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">My Calendar</h2>
        <p className="text-gray-400">{upcoming.length} upcoming event{upcoming.length !== 1 ? 's' : ''} for your department</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900 rounded-xl border border-gray-800">
          <CalendarDays className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-white font-medium">No upcoming events</p>
          <p className="text-gray-500 text-sm mt-1">Department events will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayEvents.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Today</p>
              {todayEvents.map(event => <EventCard key={event.id} event={event} highlight />)}
            </div>
          )}
          {upcoming.filter(e => new Date(e.start_date).toDateString() !== today).map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, highlight }: { event: Event; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${highlight ? 'bg-blue-500/5 border-blue-500/30' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[event.event_type] || event.event_type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.medium}`}>
              {event.priority}
            </span>
          </div>
          <p className="text-white font-medium">{event.title}</p>
          {event.description && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{event.description}</p>}
        </div>
        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: event.color || '#60a5fa' }} />
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {event.all_day ? formatDate(event.start_date) : `${formatDate(event.start_date)} · ${formatTime(event.start_date)}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location}
          </span>
        )}
        {event.meeting_url && (
          <a href={event.meeting_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
            <Video className="h-3 w-3" />
            Join Meeting
          </a>
        )}
      </div>
    </div>
  )
}
