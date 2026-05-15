'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMyWeeklyReport, generateMyAIReport } from '@/app/actions/weekly-reports'
import type { WeeklyReportData, FilterRange } from '@/app/actions/weekly-reports'
import { Loader2, RefreshCw, FileText, ChevronDown, Image as ImageIcon, Video, Paperclip, CheckCircle2, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const FILTERS: { value: FilterRange; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
]

function AttachmentThumb({ file_url, file_name, mime_type }: { file_url: string; file_name: string; mime_type: string }) {
  const isImage = mime_type?.startsWith('image/')
  const isVideo = mime_type?.startsWith('video/')

  if (isImage) {
    return (
      <a href={file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
        <img src={file_url} alt={file_name} className="w-14 h-14 object-cover rounded-lg border border-gray-700 hover:border-blue-500 transition-colors" />
      </a>
    )
  }
  if (isVideo) {
    return (
      <a href={file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-14 h-14 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center hover:border-blue-500 transition-colors">
        <Video className="h-5 w-5 text-blue-400" />
      </a>
    )
  }
  return (
    <a href={file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-14 h-14 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center hover:border-blue-500 transition-colors">
      <Paperclip className="h-4 w-4 text-gray-400" />
    </a>
  )
}

export default function WeeklyReport() {
  const [filter, setFilter] = useState<FilterRange>('this_week')
  const [data, setData] = useState<WeeklyReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedAI, setExpandedAI] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const loadReport = useCallback(async (f: FilterRange) => {
    setLoading(true)
    const result = await getMyWeeklyReport(f)
    setData(result)
    // Auto-expand days that have tasks
    const expanded: Record<string, boolean> = {}
    result.days.forEach(d => { expanded[d.date] = true })
    setExpandedDays(expanded)
    setLoading(false)
  }, [])

  useEffect(() => { loadReport(filter) }, [filter, loadReport])

  const handleGenerate = async () => {
    setGenerating(true)
    const { success, report_text } = await generateMyAIReport(filter)
    if (success && report_text) {
      setData(prev => prev ? { ...prev, report_text, report_generated_at: new Date().toISOString() } : prev)
    }
    setGenerating(false)
    setExpandedAI(true)
  }

  const toggleDay = (date: string) => setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Weekly Report</h2>
          <p className="text-gray-400 text-sm">Auto-tracked from your completed tasks</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating || loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? 'Generating...' : 'Generate AI Report'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : !data || data.total_tasks === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-16">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <p className="text-white font-medium">No completed tasks for {data?.range_label || filter.replace('_', ' ')}</p>
            <p className="text-gray-500 text-sm mt-2">Complete tasks in My Tasks or Kanban — they'll appear here automatically</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.total_tasks}</p>
              <p className="text-xs text-gray-500">Tasks completed · {data.range_label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-400">{data.days.length} active day{data.days.length !== 1 ? 's' : ''}</p>
              {data.report_generated_at && (
                <p className="text-xs text-gray-600">AI report: {new Date(data.report_generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              )}
            </div>
          </div>

          {/* AI Report */}
          {data.report_text && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">AI</span>
                    Performance Summary
                  </CardTitle>
                  <span className="text-xs text-gray-500">{data.range_label}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {expandedAI || data.report_text.length < 600 ? data.report_text : data.report_text.slice(0, 600) + '...'}
                </div>
                {data.report_text.length >= 600 && (
                  <button onClick={() => setExpandedAI(e => !e)} className="flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-xs">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedAI ? 'rotate-180' : ''}`} />
                    {expandedAI ? 'Show less' : 'Read more'}
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Day-wise activity */}
          <div className="space-y-3">
            {data.days.map(day => (
              <Card key={day.date} className="bg-gray-900 border-gray-800">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => toggleDay(day.date)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{day.day_name}</p>
                      <p className="text-gray-500 text-xs">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedDays[day.date] ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expandedDays[day.date] && (
                  <div className="border-t border-gray-800">
                    {day.tasks.map((task, idx) => (
                      <div key={task.id} className={`p-4 ${idx < day.tasks.length - 1 ? 'border-b border-gray-800' : ''}`}>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {task.type && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{task.type}</span>
                              )}
                              {task.department_name && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{task.department_name}</span>
                              )}
                              {task.tags?.map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">{tag}</span>
                              ))}
                              <span className="text-xs text-gray-600">
                                {new Date(task.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {task.attachments.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 ml-7 flex-wrap">
                            {task.attachments.map(att => (
                              <AttachmentThumb key={att.id} {...att} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
