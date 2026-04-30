'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Palette, Share2, Building2, CheckCircle2, User } from 'lucide-react'

const DEPARTMENTS = [
    {
        name: 'Creative Labs',
        icon: Palette,
        color: 'blue',
        members: [
            { name: 'Rupin', role: 'Graphic Designer', specialty: 'Visual creatives and branding consistency' },
            { name: 'Deepanshu', role: 'Graphic Designer', specialty: 'Design development and thematic execution' },
            { name: 'Robin', role: 'Video Editor', specialty: 'Reels and narrative-driven video content' },
            { name: 'Vishal', role: 'Video Editor', specialty: 'Editing and visual storytelling' },
            { name: 'Mohit', role: 'Video Editor', specialty: 'Post-production and content optimization' },
        ],
        rights: [
            'Extract videos and photos sent by client',
            'Submit video for approval',
            'Report making and track work progress dashboard — common dashboard for all to mention how many videos or creatives they made',
            'Daily/weekly agenda to be updated on that common dashboard by Prashant',
            'Delay or pending approval marked to be in their content as a reminder',
        ],
    },
    {
        name: 'PR & Social Media',
        icon: Share2,
        color: 'purple',
        members: [
            { name: 'Utkarsh', role: 'Social Media Manager', specialty: 'Posting and captioning' },
            { name: 'Ishika', role: 'Social Media Manager', specialty: 'Live tickers and content update' },
        ],
        rights: [
            'Extract videos and photos sent by client',
            'Submit photos for approval with captions',
            'Report making and track work progress dashboard — common dashboard for all to mention what\'d been posted throughout the day',
            'Daily updation: pre-approval captions for events next day',
            'Updating routine of the client next day, a day before',
            'QA/QC pending — mention on content until QA/QC is done',
            'Posted content is crosschecked and corrected — only then marked as final posts',
        ],
    },
    {
        name: 'Administration',
        icon: Building2,
        color: 'green',
        members: [
            { name: 'HR', role: 'Administration', specialty: 'Joining formalities and payroll management (onboarding process and all)' },
            { name: 'Prashant', role: 'Founder', specialty: '' },
        ],
        rights: [],
    },
]

const colorMap: Record<string, { bg: string; border: string; badge: string; icon: string; dot: string }> = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300',   icon: 'text-blue-400',   dot: 'bg-blue-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300', icon: 'text-purple-400', dot: 'bg-purple-400' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  badge: 'bg-green-500/20 text-green-300',  icon: 'text-green-400',  dot: 'bg-green-400' },
}

export default function AnySegenRights() {
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Shield className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Anya Segen</h1>
                        <p className="text-gray-400 mt-0.5">Department rights & feature access</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
                {DEPARTMENTS.map(dept => {
                    const DeptIcon = dept.icon
                    const colors = colorMap[dept.color]

                    return (
                        <Card key={dept.name} className="bg-gray-800 border-gray-700">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-white flex items-center gap-2 text-lg">
                                    <DeptIcon className={`h-5 w-5 ${colors.icon}`} />
                                    {dept.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Members */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Members</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {dept.members.map(member => (
                                            <div key={member.name} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                                                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colors.badge}`}>
                                                    <User className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium">{member.name}</p>
                                                    <p className={`text-xs font-medium ${colors.icon}`}>{member.role}</p>
                                                    {member.specialty && (
                                                        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{member.specialty}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rights */}
                                {dept.rights.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rights & Features</p>
                                        <div className="space-y-2">
                                            {dept.rights.map((right, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
                                                        <span className={`text-xs font-bold ${colors.icon}`}>{i + 1}</span>
                                                    </div>
                                                    <p className="text-gray-200 text-sm leading-relaxed">{right}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
