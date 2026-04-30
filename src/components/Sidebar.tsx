'use client'

import { useState } from 'react'
import {
  FileText,
  Users,
  Settings,
  LogOut,
  Home,
  BookOpen,
  Bell,
  User,
  Building2,
  Calendar,
  Kanban,
  MessageCircle,
  PenTool,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole?: 'admin' | 'user'
}

const userMenuItems = [
  { id: 'clients', label: 'My Clients', icon: Building2, color: 'from-cyan-400 to-blue-500' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'from-violet-400 to-purple-500' },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, color: 'from-emerald-400 to-teal-500' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'from-amber-400 to-orange-500' },
  { id: 'profile', label: 'My Profile', icon: User, color: 'from-pink-400 to-rose-500' },
]

const adminMenuItems = [
  { id: 'overview', label: 'Overview', icon: Home, color: 'from-violet-400 to-purple-600' },
  { id: 'members', label: 'Departments', icon: Users, color: 'from-blue-400 to-cyan-500' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'from-fuchsia-400 to-pink-500' },
  { id: 'assets', label: 'Asset Library', icon: FileText, color: 'from-amber-400 to-orange-500' },
  { id: 'clients', label: 'Clients', icon: Building2, color: 'from-cyan-400 to-blue-500' },
  { id: 'content', label: 'Content', icon: PenTool, color: 'from-pink-400 to-rose-500' },
  { id: 'documents', label: 'KB Documents', icon: BookOpen, color: 'from-emerald-400 to-teal-500' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'from-violet-400 to-indigo-500' },
  { id: 'kanban', label: 'Kanban Board', icon: Kanban, color: 'from-orange-400 to-red-500' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'from-slate-400 to-gray-500' },
]

export default function Sidebar({ activeTab, onTabChange, userRole }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      router.push('/')
    }
  }

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div
      className={`relative flex flex-col h-screen transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0d0d14 0%, #0a0a11 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Ambient glow top */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% -20%, rgba(139,92,246,0.15) 0%, transparent 70%)',
      }} />

      {/* Logo / Header */}
      <div className={`flex items-center h-16 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            }}>
              <span className="text-white text-xs font-bold">AS</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">ANYA SEGEN</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          }}>
            <span className="text-white text-xs font-bold">AS</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 12px rgba(139,92,246,0.4)',
        }}
      >
        {isCollapsed
          ? <ChevronRight className="w-3 h-3 text-white" />
          : <ChevronLeft className="w-3 h-3 text-white" />
        }
      </button>

      {/* Section label */}
      {!isCollapsed && (
        <div className="px-4 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Navigation
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isCollapsed ? 'justify-center' : ''
              }`}
              style={isActive ? {
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}
            >
              {/* Active glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
                  boxShadow: 'inset 0 0 20px rgba(139,92,246,0.1)',
                }} />
              )}

              {/* Icon container */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`}
                style={isActive ? (() => {
                    const colors: Record<string, string> = {
                      'from-violet-400 to-purple-600': 'linear-gradient(135deg, #a78bfa, #9333ea)',
                      'from-blue-400 to-cyan-500': 'linear-gradient(135deg, #60a5fa, #06b6d4)',
                      'from-fuchsia-400 to-pink-500': 'linear-gradient(135deg, #e879f9, #ec4899)',
                      'from-amber-400 to-orange-500': 'linear-gradient(135deg, #fbbf24, #f97316)',
                      'from-cyan-400 to-blue-500': 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                      'from-pink-400 to-rose-500': 'linear-gradient(135deg, #f472b6, #f43f5e)',
                      'from-emerald-400 to-teal-500': 'linear-gradient(135deg, #34d399, #14b8a6)',
                      'from-violet-400 to-indigo-500': 'linear-gradient(135deg, #a78bfa, #6366f1)',
                      'from-orange-400 to-red-500': 'linear-gradient(135deg, #fb923c, #ef4444)',
                      'from-slate-400 to-gray-500': 'linear-gradient(135deg, #94a3b8, #6b7280)',
                    }
                    return {
                      background: colors[item.color] ?? 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
                    }
                  })() : {
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
              </div>

              {/* Label */}
              {!isCollapsed && (
                <span
                  className={`text-sm font-medium truncate transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                >
                  {item.label}
                </span>
              )}

              {/* Active indicator dot */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  boxShadow: '0 0 6px rgba(139,92,246,0.8)',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* User footer */}
      <div className={`px-3 pb-4 flex items-center gap-3 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            boxShadow: '0 0 10px rgba(139,92,246,0.4)',
          }}
        >
          {initials || 'U'}
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {userRole}
            </p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  )
}
