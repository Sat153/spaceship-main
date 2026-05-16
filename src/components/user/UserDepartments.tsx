'use client'

import { useEffect, useState } from 'react'
import { getAllDepartments } from '@/app/actions/user-departments'
import type { Department } from '@/app/actions/user-departments'
import { Building2, Users, ChevronDown, Loader2, Shield, User } from 'lucide-react'

const COLORS = [
  'from-violet-400 to-purple-600',
  'from-blue-400 to-cyan-500',
  'from-pink-400 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-blue-500',
  'from-red-400 to-pink-500',
  'from-teal-400 to-cyan-500',
]

export default function UserDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getAllDepartments().then(({ data }) => {
      setDepartments(data)
      setLoading(false)
    })
  }, [])

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const totalMembers = departments.reduce((s, d) => s + d.members.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Departments</h2>
        <p className="text-gray-400">{departments.length} departments · {totalMembers} team members</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((dept, idx) => (
            <div key={dept.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-800/50 transition-colors"
                onClick={() => toggle(dept.id)}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLORS[idx % COLORS.length]} flex items-center justify-center flex-shrink-0 opacity-90`}>
                  <Building2 className="h-5 w-5 text-white" />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{dept.name}</p>
                  {dept.description && (
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{dept.description}</p>
                  )}
                </div>

                {/* Member count + chevron */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
                    <Users className="h-3 w-3" />
                    {dept.members.length}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded[dept.id] ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded[dept.id] && (
                <div className="border-t border-gray-800">
                  {dept.members.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-6">No members in this department</p>
                  ) : (
                    <div className="divide-y divide-gray-800/60">
                      {dept.members.map(member => {
                        const initials = `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase() || '?'
                        const name = `${member.first_name} ${member.last_name}`.trim() || member.email
                        return (
                          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{name}</p>
                              <p className="text-gray-500 text-xs truncate">{member.email}</p>
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                              {member.role === 'admin' ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                              {member.role}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
