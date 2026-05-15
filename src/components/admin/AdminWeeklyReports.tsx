'use client'

import { useState, useEffect } from 'react'
import { getAllEmployeeReports, generateReportForEmployee, WeeklyReport } from '@/app/actions/weekly-reports'
import { Loader2, RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle, FileText, ChevronDown, Users } from 'lucide-react'
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

interface EmployeeData {
  employee: { id: string; first_name: string; last_name: string; email: string }
  reports: WeeklyReport[]
}

function ReportView({ report, expanded, onToggleExpand }: { report: WeeklyReport; expanded: boolean; onToggleExpand: () => void }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{report.completed_count}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{report.in_progress_count}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{report.pending_count}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{report.overdue_count}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm">
              AI Report — {isCurrentWeek(report.week_start) ? 'This Week' : formatWeek(report.week_start, report.week_end)}
            </CardTitle>
            <span className="text-xs text-gray-500">
              {new Date(report.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {report.report_text ? (
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {expanded || report.report_text.length < 600
                ? report.report_text
                : report.report_text.slice(0, 600) + '...'}
              {report.report_text.length >= 600 && (
                <button
                  onClick={onToggleExpand}
                  className="flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-xs"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No report text available.</p>
          )}
        </CardContent>
      </Card>

      {report.tasks_data && report.tasks_data.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">Tasks ({report.tasks_data.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {report.tasks_data.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-gray-700 last:border-0">
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
  )
}

export default function AdminWeeklyReports() {
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmpIdx, setSelectedEmpIdx] = useState(0)
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getAllEmployeeReports().then(({ data }) => {
      setEmployeeData(data)
      setLoading(false)
    })
  }, [])

  const handleGenerate = async () => {
    const emp = employeeData[selectedEmpIdx]
    if (!emp) return
    setGenerating(true)
    const { success, report } = await generateReportForEmployee(emp.employee.id)
    if (success && report) {
      setEmployeeData(prev => {
        const updated = [...prev]
        const empData = { ...updated[selectedEmpIdx] }
        const exists = empData.reports.findIndex(r => r.week_start === report.week_start)
        if (exists >= 0) {
          empData.reports = [...empData.reports]
          empData.reports[exists] = report
        } else {
          empData.reports = [report, ...empData.reports]
        }
        updated[selectedEmpIdx] = empData
        return updated
      })
      setSelectedWeekIdx(0)
      setExpanded(false)
    }
    setGenerating(false)
  }

  const selectedEmp = employeeData[selectedEmpIdx]
  const currentReport = selectedEmp?.reports[selectedWeekIdx]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Weekly Reports</h2>
          <p className="text-gray-400 text-sm">AI-generated performance summaries for all team members</p>
        </div>
        {selectedEmp && (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {generating ? 'Generating...' : 'Generate This Week'}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : employeeData.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-16">
            <Users className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <p className="text-white font-medium">No employees found</p>
            <p className="text-gray-500 text-sm mt-2">Add team members to generate reports</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Employee selector */}
          <div className="flex gap-2 flex-wrap">
            {employeeData.map((ed, i) => (
              <button
                key={ed.employee.id}
                onClick={() => { setSelectedEmpIdx(i); setSelectedWeekIdx(0); setExpanded(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedEmpIdx === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {ed.employee.first_name} {ed.employee.last_name}
                {ed.reports.length > 0 && (
                  <span className={`ml-1.5 px-1 rounded text-[10px] ${selectedEmpIdx === i ? 'bg-blue-500' : 'bg-gray-700'}`}>
                    {ed.reports.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedEmp && (
            <>
              {/* Week selector */}
              {selectedEmp.reports.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedEmp.reports.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedWeekIdx(i); setExpanded(false) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedWeekIdx === i
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {isCurrentWeek(r.week_start) ? '📅 This Week' : formatWeek(r.week_start, r.week_end)}
                    </button>
                  ))}
                </div>
              )}

              {currentReport ? (
                <ReportView
                  report={currentReport}
                  expanded={expanded}
                  onToggleExpand={() => setExpanded(e => !e)}
                />
              ) : (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="text-center py-16">
                    <FileText className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-white font-medium">No report yet for {selectedEmp.employee.first_name}</p>
                    <p className="text-gray-500 text-sm mb-6">Click "Generate This Week" to create a report</p>
                    <Button onClick={handleGenerate} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {generating ? 'Generating...' : 'Generate Now'}
                    </Button>
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
