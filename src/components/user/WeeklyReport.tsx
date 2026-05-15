'use client'

import { useState, useEffect } from 'react'
import { getMyWeeklyReports, generateMyWeeklyReport } from '@/app/actions/weekly-reports'
import type { WeeklyReport } from '@/app/actions/weekly-reports'
import { Loader2, RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle, FileText, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function formatWeek(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function isCurrentWeek(start: string) {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return new Date(start).toDateString() === monday.toDateString()
}

export default function WeeklyReport() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getMyWeeklyReports().then(({ data }) => {
      setReports(data)
      setLoading(false)
    })
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    const { success, report } = await generateMyWeeklyReport()
    if (success && report) {
      setReports(prev => {
        const exists = prev.findIndex(r => r.week_start === report.week_start)
        if (exists >= 0) {
          const updated = [...prev]
          updated[exists] = report
          return updated
        }
        return [report, ...prev]
      })
      setSelectedIdx(0)
    }
    setGenerating(false)
  }

  const current = reports[selectedIdx]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Weekly Report</h2>
          <p className="text-gray-400 text-sm">AI-generated summary of your tasks and performance</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? 'Generating...' : 'Generate This Week'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <p className="text-white font-medium mb-2">No reports yet</p>
            <p className="text-gray-500 text-sm mb-6">Click "Generate This Week" to create your first weekly report</p>
            <Button onClick={handleGenerate} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Generate Now'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Week selector */}
          {reports.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {reports.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedIdx === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {isCurrentWeek(r.week_start) ? '📅 This Week' : formatWeek(r.week_start, r.week_end)}
                </button>
              ))}
            </div>
          )}

          {current && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{current.completed_count}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{current.in_progress_count}</p>
                      <p className="text-xs text-gray-500">In Progress</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{current.pending_count}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{current.overdue_count}</p>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Report */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">
                      AI Report — {isCurrentWeek(current.week_start) ? 'This Week' : formatWeek(current.week_start, current.week_end)}
                    </CardTitle>
                    <span className="text-xs text-gray-500">
                      Generated {new Date(current.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {current.report_text ? (
                    <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {expanded || current.report_text.length < 600
                        ? current.report_text
                        : current.report_text.slice(0, 600) + '...'}
                      {current.report_text.length >= 600 && (
                        <button
                          onClick={() => setExpanded(!expanded)}
                          className="flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-xs"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          {expanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No report text. Click Generate to create one.</p>
                  )}
                </CardContent>
              </Card>

              {/* Task list */}
              {current.tasks_data && current.tasks_data.length > 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base">All Tasks ({current.tasks_data.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {current.tasks_data.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                          <span className="text-gray-300 text-sm truncate flex-1 mr-3">{task.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            task.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                            task.status === 'review' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
