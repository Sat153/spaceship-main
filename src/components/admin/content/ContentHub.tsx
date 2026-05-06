'use client'

import { useState } from 'react'
import { PenTool, LayoutGrid } from 'lucide-react'
import ContentCreator from './ContentCreator'
import GridPlanner from './GridPlanner'

type ContentView = 'posts' | 'grid'

const TABS: { id: ContentView; label: string; icon: any }[] = [
    { id: 'posts', label: 'Posts', icon: PenTool },
    { id: 'grid', label: 'Grid Planner', icon: LayoutGrid },
]

export default function ContentHub() {
    const [view, setView] = useState<ContentView>('posts')

    return (
        <div className="h-full flex flex-col">
            {/* Sub-nav */}
            <div className="shrink-0 flex items-center gap-1 px-6 pt-5 pb-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const active = view === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative"
                            style={{ color: active ? 'white' : 'rgba(255,255,255,0.4)' }}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-blue-500" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'posts' ? (
                    <ContentCreator key="posts" />
                ) : (
                    <div className="p-6">
                        <GridPlanner key="grid" />
                    </div>
                )}
            </div>
        </div>
    )
}
