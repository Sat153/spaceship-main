'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllEmployeesSummary, getEmployeeWeeklyReport, generateAdminReport } from '@/app/actions/weekly-reports'
import type { WeeklyReportData, EmployeeSummary, FilterRange } from '@/app/actions/weekly-reports'
import { Loader2, RefreshCw, CheckCircle2, Calendar, ChevronDown, Users, BarChart2, Image as ImageIcon, Video, Paperclip } from 'lucide-react'
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
  if (isImage) return (
    <a href={file_url} target="_blank" rel="noopener noreferrer">
      <img src={file_url} alt={file_name} className="w-12 h-12 object-cover rounded-lg border border-gray-700 hover:border-blue-500 transition-colors" />
    </a>
  )
  if (isVideo) return (
    <a href={file_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center hover:border-blue-500 transition-colors">
      <Video className="h-4 w-4 text-blue-400" />
    </a>
  )
  return (
    <a href={file_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center hover:border-blue-500 transition-colors">
      <Paperclip className="h-3.5 w-3.5 text-gray-400" />
    </a>
  )
}

function DayWiseView({ data }: { data: WeeklyReportData }) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    data.days.forEach(d => { m[d.date] = true })
    return m
  })
  const [expandedAI, setExpandedAI] = useState(false)

  if (data.total_tasks === 0) return (
    <div className="text-center py-10">
      <CheckCircle2 className="mx-auto h-10 w-10 text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm">No completed tasks in this period</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* AI Report */}
      {data.report_text && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">AI</span>
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {expandedAI || data.report_text.length < 500 ? data.report_text : data.report_text.slice(0, 500) + '...'}
            </div>
            {data.report_text.length >= 500 && (
              <button onClick={() => setExpandedAI(e => !e)} className="flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 text-xs">
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedAI ? 'rotate-180' : ''}`} />
                {expandedAI ? 'Show less' : 'Read more'}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day-wise */}
      {data.days.map(day => (
        <div key={day.date} className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setExpandedDays(p => ({ ...p, [day.date]: !p[day.date] }))}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-white text-sm font-semibold">{day.day_name}</span>
              <span className="text-gray-500 text-xs">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{day.tasks.length} tasks</span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expandedDays[day.date] ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedDays[day.date] && (
            <div className="border-t border-gray-700">
              {day.tasks.map((task, idx) => (
                <div key={task.id} className={`px-4 py-3 ${idx < day.tasks.length - 1 ? 'border-b border-gray-700/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {task.type && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">{task.type}</span>}
                        {task.department_name && <span className="text-xs text-gray-500">{task.department_name}</span>}
                        <span className="text-xs text-gray-600">{new Date(task.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {task.attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {task.attachments.map(a => <AttachmentThumb key={a.id} {...a} />)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminWeeklyReports() {
  const [filter, setFilter] = useState<FilterRange>('this_week')
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeView, setActiveView] = useState<'detail' | 'overview'>('overview')

  const loadSummary = useCallback(async (f: FilterRange) => {
    setLoadingSummary(true)
    const { employees } = await getAllEmployeesSummary(f)
    setSummaries(employees)
    setLoadingSummary(false)
  }, [])

  const loadReport = useCallback(async (empId: string, f: FilterRange) => {
    setLoadingReport(true)
    const data = await getEmployeeWeeklyReport(empId, f)
    setReportData(data)
    setLoadingReport(false)
  }, [])

  useEffect(() => { loadSummary(filter) }, [filter, loadSummary])

  const selectEmployee = (id: string) => {
    setSelectedId(id)
    setActiveView('detail')
    loadReport(id, filter)
  }

  const handleGenerate = async () => {
    if (!selectedId) return
    setGenerating(true)
    const { success, report_text } = await generateAdminReport(selectedId, filter)
    if (success && report_text) {
      setReportData(prev => prev ? { ...prev, report_text: report_text!, report_generated_at: new Date().toISOString() } : prev)
    }
    setGenerating(false)
  }

  const handleFilterChange = (f: FilterRange) => {
    setFilter(f)
    setReportData(null)
    if (selectedId) loadReport(selectedId, f)
  }

  const maxTasks = Math.max(...summaries.map(e => e.total_tasks), 1)
  const selectedEmp = summaries.find(e => e.user_id === selectedId)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Weekly Reports</h2>
          <p className="text-gray-400 text-sm">Auto-tracked performance for all team members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView('overview')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${activeView === 'overview' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
            <BarChart2 className="h-3.5 w-3.5" /> Overview
          </button>
          {selectedEmp && (
            <button onClick={() => setActiveView('detail')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${activeView === 'detail' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <Users className="h-3.5 w-3.5" /> {selectedEmp.first_name}
            </button>
          )}
          {activeView === 'detail' && selectedId && (
            <Button onClick={handleGenerate} disabled={generating || loadingReport} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {generating ? 'Generating...' : 'AI Report'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => handleFilterChange(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Overview: productivity comparison */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
          ) : summaries.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="text-center py-12">
                <Users className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                <p className="text-gray-500">No employees found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-white">{summaries.reduce((s, e) => s + e.total_tasks, 0)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total tasks completed</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-white">{summaries.filter(e => e.total_tasks > 0).length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Active employees</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-white">{summaries[0]?.total_tasks || 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Top performer</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-white">
                      {summaries.length > 0 ? Math.round(summaries.reduce((s, e) => s + e.total_tasks, 0) / summaries.length) : 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Avg per employee</p>
                  </CardContent>
                </Card>
              </div>

              {/* Productivity bars */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base">Productivity Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summaries.map(emp => (
                      <div key={emp.user_id}>
                        <div className="flex items-center justify-between mb-1">
                          <button onClick={() => selectEmployee(emp.user_id)} className="text-sm text-white hover:text-blue-400 font-medium transition-colors text-left">
                            {emp.first_name} {emp.last_name}
                          </button>
                          <div className="flex items-center gap-2">
                            {emp.department_name && <span className="text-xs text-gray-500">{emp.department_name}</span>}
                            <span className="text-sm font-semibold text-white">{emp.total_tasks}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max((emp.total_tasks / maxTasks) * 100, emp.total_tasks > 0 ? 2 : 0)}%`,
                              background: emp.total_tasks > 0 ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : 'transparent',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department breakdown */}
              {(() => {
                const deptMap: Record<string, number> = {}
                summaries.forEach(e => {
                  const key = e.department_name || 'Unassigned'
                  deptMap[key] = (deptMap[key] || 0) + e.total_tasks
                })
                const depts = Object.entries(deptMap).sort((a, b) => b[1] - a[1])
                return depts.length > 0 ? (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-base">Department Output</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {depts.map(([dept, count]) => (
                          <div key={dept} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                            <span className="text-gray-300 text-sm">{dept}</span>
                            <span className="text-white font-semibold text-sm">{count} tasks</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              })()}
            </>
          )}
        </div>
      )}

      {/* Detail: individual employee */}
      {activeView === 'detail' && selectedId && (
        <div className="space-y-4">
          {/* Employee selector */}
          <div className="flex gap-2 flex-wrap">
            {summaries.map(emp => (
              <button key={emp.user_id} onClick={() => selectEmployee(emp.user_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedId === emp.user_id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                {emp.first_name} {emp.last_name}
                {emp.total_tasks > 0 && (
                  <span className={`ml-1.5 px-1 rounded text-[10px] ${selectedId === emp.user_id ? 'bg-blue-500' : 'bg-gray-700'}`}>{emp.total_tasks}</span>
                )}
              </button>
            ))}
          </div>

          {loadingReport ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
          ) : reportData ? (
            <DayWiseView data={reportData} />
          ) : null}
        </div>
      )}
    </div>
  )
}
