'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Plus, Search, Copy, Check, Trash2, Edit2, X, Loader2,
    BookMarked, Wheat, Heart, Building, Zap, CalendarDays, Tag, Maximize2, MessageSquare
} from 'lucide-react'
import { CyberHeader } from '@/components/ui/cyber-header'
import {
    getMessageTemplates, createMessageTemplate, updateMessageTemplate,
    deleteMessageTemplate, MessageTemplate, CreateTemplateData
} from '@/app/actions/message-templates'

const CATEGORIES: { id: MessageTemplate['category'] | 'all'; label: string; labelHindi: string; icon: any; color: string }[] = [
    { id: 'all',         label: 'All',         labelHindi: 'सभी',               icon: BookMarked,   color: 'bg-gray-600' },
    { id: 'kisan',       label: 'Kisan',       labelHindi: 'किसान',              icon: Wheat,        color: 'bg-green-600' },
    { id: 'women',       label: 'Women',       labelHindi: 'महिला सशक्तिकरण',   icon: Heart,        color: 'bg-pink-600' },
    { id: 'development', label: 'Development', labelHindi: 'विकास कार्य',        icon: Building,     color: 'bg-blue-600' },
    { id: 'general',     label: 'General',     labelHindi: 'सामान्य',            icon: Tag,          color: 'bg-gray-500' },
    { id: 'crisis',      label: 'Crisis',      labelHindi: 'आपातकाल',            icon: Zap,          color: 'bg-red-600' },
    { id: 'event',       label: 'Event',       labelHindi: 'कार्यक्रम',          icon: CalendarDays, color: 'bg-purple-600' },
]

const EMPTY_FORM: CreateTemplateData = {
    title: '',
    body_english: '',
    body_hindi: '',
    category: 'general',
    tags: [],
}

export default function MessagingBank({ readOnly = false }: { readOnly?: boolean }) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [search, setSearch] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<CreateTemplateData>(EMPTY_FORM)
    const [tagInput, setTagInput] = useState('')
    const [saving, setSaving] = useState(false)
    const [langView, setLangView] = useState<'english' | 'hindi' | 'both'>('both')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [expandedTemplate, setExpandedTemplate] = useState<MessageTemplate | null>(null)

    useEffect(() => { fetchTemplates() }, [])

    const fetchTemplates = async () => {
        setLoading(true)
        const { data } = await getMessageTemplates()
        if (data) setTemplates(data)
        setLoading(false)
    }

    const filtered = templates.filter(t => {
        const matchCat = activeCategory === 'all' || t.category === activeCategory
        const q = search.toLowerCase()
        const matchSearch = !q || t.title.toLowerCase().includes(q) ||
            t.body_english.toLowerCase().includes(q) ||
            (t.body_hindi || '').toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
        return matchCat && matchSearch
    })

    const copy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const openCreate = () => {
        setForm(EMPTY_FORM)
        setTagInput('')
        setEditingId(null)
        setShowModal(true)
    }

    const openEdit = (t: MessageTemplate) => {
        setForm({ title: t.title, body_english: t.body_english, body_hindi: t.body_hindi || '', category: t.category, tags: t.tags || [] })
        setTagInput('')
        setEditingId(t.id)
        setShowModal(true)
    }

    const addTag = () => {
        const tag = tagInput.trim()
        if (tag && !form.tags?.includes(tag)) {
            setForm(f => ({ ...f, tags: [...(f.tags || []), tag] }))
        }
        setTagInput('')
    }

    const removeTag = (tag: string) => setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }))

    const handleSave = async () => {
        if (!form.title.trim() || !form.body_english.trim()) return
        setSaving(true)
        if (editingId) {
            await updateMessageTemplate(editingId, form)
        } else {
            await createMessageTemplate(form)
        }
        setSaving(false)
        setShowModal(false)
        fetchTemplates()
    }

    const handleDelete = async (id: string) => {
        await deleteMessageTemplate(id)
        setTemplates(t => t.filter(x => x.id !== id))
        setConfirmDeleteId(null)
    }

    const getCatConfig = (cat: string) => CATEGORIES.find(c => c.id === cat) || CATEGORIES[4]

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 border-b border-gray-800">
                <CyberHeader
                    title="Caption & Messaging Bank"
                    subtitle="Pre-approved phrases and messaging templates"
                    accent="#14b8a6"
                    badge="MESSAGE BANK"
                    icon={<MessageSquare className="h-6 w-6 text-white" />}
                    stats={[{ label: 'TEMPLATES', value: templates.length, color: '#5eead4' }]}
                    actions={
                        !readOnly ? (
                            <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                                <Plus className="h-4 w-4" /> New Template
                            </Button>
                        ) : undefined
                    }
                />
                {/* Category tabs */}
                <div className="flex gap-2 flex-wrap mb-4">
                    {CATEGORIES.map(cat => {
                        const Icon = cat.icon
                        const count = cat.id === 'all' ? templates.length : templates.filter(t => t.category === cat.id).length
                        return (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeCategory === cat.id ? `${cat.color} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}>
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{cat.labelHindi}</span>
                                <span className="sm:hidden">{cat.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-700'}`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Search + lang toggle */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search templates..."
                            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder-gray-500" />
                    </div>
                    <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                        {(['both', 'english', 'hindi'] as const).map(l => (
                            <button key={l} onClick={() => setLangView(l)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${langView === l ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                {l === 'both' ? 'Both' : l === 'english' ? 'EN' : 'HI'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Templates grid */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="text-center py-16">
                            <BookMarked className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                            <p className="text-white font-medium mb-1">No templates found</p>
                            <p className="text-gray-400 text-sm">Create your first messaging template</p>
                            {!readOnly && (
                                <Button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Plus className="h-4 w-4" /> Add Template
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filtered.map(t => {
                            const catCfg = getCatConfig(t.category)
                            const CatIcon = catCfg.icon
                            const copyId = `en-${t.id}`
                            const copyIdHi = `hi-${t.id}`

                            return (
                                <Card key={t.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                                    <CardContent className="p-4">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${catCfg.color}`}>
                                                        <CatIcon className="h-3 w-3" />
                                                        {catCfg.labelHindi}
                                                    </span>
                                                </div>
                                                <h3 className="text-white font-medium text-sm truncate">{t.title}</h3>
                                            </div>
                                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setExpandedTemplate(t)} className="p-1.5 text-gray-500 hover:text-purple-400 rounded transition-colors" title="Expand">
                                                    <Maximize2 className="h-3.5 w-3.5" />
                                                </button>
                                                {!readOnly && (
                                                    <>
                                                        <button onClick={() => openEdit(t)} className="p-1.5 text-gray-500 hover:text-blue-400 rounded transition-colors">
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(t.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* English body */}
                                        {(langView === 'english' || langView === 'both') && (
                                            <div className="mb-2">
                                                {langView === 'both' && <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">English</p>}
                                                <div className="relative group">
                                                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 pr-6">{t.body_english}</p>
                                                    <button onClick={() => copy(t.body_english, copyId)}
                                                        className="absolute top-0 right-0 p-1 text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                                                        {copiedId === copyId ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hindi body */}
                                        {(langView === 'hindi' || langView === 'both') && t.body_hindi && (
                                            <div className="mb-2">
                                                {langView === 'both' && <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Hindi</p>}
                                                <div className="relative group">
                                                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 pr-6 font-[noto-serif-devanagari]">{t.body_hindi}</p>
                                                    <button onClick={() => copy(t.body_hindi!, copyIdHi)}
                                                        className="absolute top-0 right-0 p-1 text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                                                        {copiedId === copyIdHi ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {t.tags && t.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {t.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Copy both button */}
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                            <button onClick={() => copy([t.body_english, t.body_hindi].filter(Boolean).join('\n\n'), t.id)}
                                                className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    copiedId === t.id ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                                                }`}>
                                                {copiedId === t.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copiedId === t.id ? 'Copied!' : 'Copy Template'}
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Expand Modal */}
            {expandedTemplate && (() => {
                const t = expandedTemplate
                const catCfg = getCatConfig(t.category)
                const CatIcon = catCfg.icon
                const copyId = `expand-en-${t.id}`
                const copyIdHi = `expand-hi-${t.id}`
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setExpandedTemplate(null)}>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-start justify-between p-5 border-b border-gray-800">
                                <div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${catCfg.color} mb-2`}>
                                        <CatIcon className="h-3 w-3" /> {catCfg.labelHindi}
                                    </span>
                                    <h3 className="text-white font-semibold text-lg">{t.title}</h3>
                                </div>
                                <button onClick={() => setExpandedTemplate(null)} className="text-gray-400 hover:text-white shrink-0 ml-4">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-5">
                                {t.body_english && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">English</p>
                                            <button onClick={() => copy(t.body_english, copyId)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-all">
                                                {copiedId === copyId ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copiedId === copyId ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap bg-gray-800 rounded-xl p-4">{t.body_english}</p>
                                    </div>
                                )}
                                {t.body_hindi && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hindi</p>
                                            <button onClick={() => copy(t.body_hindi!, copyIdHi)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-all">
                                                {copiedId === copyIdHi ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copiedId === copyIdHi ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap bg-gray-800 rounded-xl p-4">{t.body_hindi}</p>
                                    </div>
                                )}
                                {t.tags && t.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {t.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <button onClick={() => copy([t.body_english, t.body_hindi].filter(Boolean).join('\n\n'), t.id)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        copiedId === t.id ? 'bg-green-600/20 text-green-400' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}>
                                    {copiedId === t.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copiedId === t.id ? 'Copied!' : 'Copy Full Template'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Delete Confirm Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-red-500/10">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-white font-semibold">Delete Template?</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-5">This template will be permanently deleted and cannot be recovered.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <h3 className="text-white font-semibold text-lg">
                                {editingId ? 'Edit Template' : 'New Template'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Title *</label>
                                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Kisan Samelan Announcement"
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                                        const Icon = cat.icon
                                        return (
                                            <button key={cat.id} onClick={() => setForm(f => ({ ...f, category: cat.id as MessageTemplate['category'] }))}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    form.category === cat.id ? `${cat.color} text-white` : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}>
                                                <Icon className="h-3.5 w-3.5" />
                                                {cat.labelHindi}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">English Caption *</label>
                                <Textarea value={form.body_english} onChange={e => setForm(f => ({ ...f, body_english: e.target.value }))}
                                    placeholder="English caption text..."
                                    rows={4} className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 resize-none" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Hindi Caption</label>
                                <Textarea value={form.body_hindi || ''} onChange={e => setForm(f => ({ ...f, body_hindi: e.target.value }))}
                                    placeholder="हिंदी कैप्शन..."
                                    rows={4} className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 resize-none" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Tags</label>
                                <div className="flex gap-2 mb-2">
                                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                                        placeholder="Add tag and press Enter"
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 flex-1" />
                                    <Button type="button" onClick={addTag} variant="outline"
                                        className="border-gray-600 text-gray-300 hover:bg-gray-700">
                                        Add
                                    </Button>
                                </div>
                                {(form.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(form.tags || []).map(tag => (
                                            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-red-400">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end p-5 border-t border-gray-700">
                            <Button variant="ghost" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={!form.title.trim() || !form.body_english.trim() || saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editingId ? 'Update Template' : 'Save Template'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
