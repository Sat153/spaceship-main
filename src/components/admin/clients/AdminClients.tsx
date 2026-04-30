import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useClients, useClient, Client, CreateClientData, UpdateClientData } from '@/hooks/useClients'
import { useDepartments } from '@/hooks/admin/useDepartments'
import { generateClientSummary } from '@/app/actions/ai-analysis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Users,
  User,
  Briefcase,
  Tag,
  Calendar,
  Edit3,
  Trash2,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  SortAsc,
  SortDesc,
  Save,
  Type,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClientAssets from "@/components/admin/clients/ClientAssets"
import ClientChat from "@/components/admin/clients/ClientChat"
import ClientSharing from "@/components/admin/clients/ClientSharing"
import ClientNewsPanel from "@/components/admin/clients/ClientNewsPanel"
import ClientTwitterFeed from "@/components/admin/clients/ClientTwitterFeed"
import ClientDemographics from "@/components/admin/clients/ClientDemographics"
import ManifestoPriorities from "@/components/admin/clients/ManifestoPriorities"
import ClientCampaigns from "@/components/admin/clients/ClientCampaigns"

interface AdminClientsProps {
  user: any
}

export default function AdminClients({ user }: AdminClientsProps) {
  const { profile } = useAuth()
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [newClient, setNewClient] = useState({
    name: '',
    client_type: 'corporate' as const,
    status: 'active' as const,
    display_name: '',
    primary_email: '',
    primary_phone: '',
    website_url: '',
    address: '',
    industry: '',
    company_size: '',
    annual_budget_range: '',
    department_id: '',
    account_manager_id: '',
    tags: '',
    internal_notes: '',
    client_brief: '',
    // Social Media
    social_instagram: '',
    social_twitter: '',
    social_youtube: '',
    social_linkedin: '',
    social_facebook: '',
    social_tiktok: '',
  })

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Update effect to reset AI summary when selecting a new client
  useEffect(() => {
    if (selectedClient) {
      setAiSummary(selectedClient.ai_summary || null)
    } else {
      setAiSummary(null)
    }
  }, [selectedClient])

  const handleGenerateSummary = async (forceRegenerate = false) => {
    if (!selectedClient) return

    setIsGeneratingSummary(true)
    try {
      const result = await generateClientSummary(selectedClient, forceRegenerate)
      if (result.summary) {
        setAiSummary(result.summary)
        // Optimistically update the selected client's data
        setSelectedClient((prev: any) => ({
          ...prev,
          ai_summary: result.summary
        }))
      }
      if (result.error) {
        console.error('AI Summary Error:', result.error)
        alert('Failed to generate summary: ' + result.error)
      }
    } catch (error) {
      console.error('Error calling AI service:', error)
      alert('Error generating summary')
    } finally {
      setIsGeneratingSummary(false)
      refetch()
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState({
    department: 'all',
    type: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  const [showFilters, setShowFilters] = useState(false)

  const filters = {
    search: searchQuery,
    status: filterState.status === 'all' ? '' : filterState.status,
    client_type: filterState.type === 'all' ? '' : filterState.type,
    department_id: filterState.department === 'all' ? '' : filterState.department,
  }

  const { clients, loading, createClient, updateClient, deleteClient, refetch } = useClients(filters)
  const { departments } = useDepartments()

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.department_id) return

    try {
      const clientData = {
        ...newClient,
        tags: newClient.tags ? newClient.tags.split(',').map(tag => tag.trim()) : [],
      }

      const createdClient = await createClient(clientData)

      if (createdClient) {
        setIsCreatingClient(false)
        setNewClient({
          name: '',
          client_type: 'corporate',
          status: 'active',
          display_name: '',
          primary_email: '',
          primary_phone: '',
          website_url: '',
          address: '',
          industry: '',
          company_size: '',
          annual_budget_range: '',
          department_id: '',
          account_manager_id: '',
          tags: '',
          internal_notes: '',
          client_brief: '',
          social_instagram: '',
          social_twitter: '',
          social_youtube: '',
          social_linkedin: '',
          social_facebook: '',
          social_tiktok: '',
        })
        setSelectedClient(createdClient)
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Error creating client')
    }
  }

  const handleUpdateClient = async () => {
    if (!selectedClient || !editingClient) return

    try {
      const updatedClient = { ...selectedClient, ...editingClient }
      const success = await updateClient(selectedClient.id, {
        name: updatedClient.name,
        client_type: updatedClient.client_type,
        status: updatedClient.status,
        display_name: updatedClient.display_name,
        primary_email: updatedClient.primary_email,
        primary_phone: updatedClient.primary_phone,
        website_url: updatedClient.website_url,
        address: updatedClient.address,
        industry: updatedClient.industry,
        company_size: updatedClient.company_size,
        annual_budget_range: updatedClient.annual_budget_range,
        account_manager_id: updatedClient.account_manager_id,
        tags: Array.isArray(updatedClient.tags) ? updatedClient.tags : updatedClient.tags?.split(',').map((tag: string) => tag.trim()) || [],
        internal_notes: updatedClient.internal_notes,
        client_brief: updatedClient.client_brief,
        // Social media fields
        social_instagram: updatedClient.social_instagram,
        social_twitter: updatedClient.social_twitter,
        social_youtube: updatedClient.social_youtube,
        social_linkedin: updatedClient.social_linkedin,
        social_facebook: updatedClient.social_facebook,
        social_tiktok: updatedClient.social_tiktok,
      })

      if (success) {
        setEditingClient(null)
        setIsEditMode(false)
        setSelectedClient(success)
      }
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Error updating client')
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const success = await deleteClient(id)
      if (success) {
        setSelectedClient(null)
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client')
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesDepartment = filterState.department === 'all' || client.department?.id === filterState.department
    const matchesType = filterState.type === 'all' || client.client_type === filterState.type
    const matchesStatus = filterState.status === 'all' || client.status === filterState.status

    return matchesSearch && matchesDepartment && matchesType && matchesStatus
  })

  // Apply sorting
  filteredClients.sort((a, b) => {
    let aValue, bValue

    switch (filterState.sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'department':
        aValue = a.department?.name?.toLowerCase() || ''
        bValue = b.department?.name?.toLowerCase() || ''
        break
      case 'type':
        aValue = a.client_type
        bValue = b.client_type
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'created_at':
      default:
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
    }

    if (aValue < bValue) return filterState.sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return filterState.sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Get active filter count for badge
  const activeFilterCount = Object.entries(filterState).filter(([key, value]) =>
    key !== 'sortBy' && key !== 'sortOrder' && value !== 'all'
  ).length

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'success' as const, label: '🟢 Active' },
      inactive: { variant: 'secondary' as const, label: '⚫ Inactive' },
      prospect: { variant: 'warning' as const, label: '🟡 Prospect' },
      archived: { variant: 'destructive' as const, label: '🔴 Archived' },
      on_hold: { variant: 'warning' as const, label: '⏸️ On Hold' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getClientTypeIcon = (type: string) => {
    const typeConfig = {
      politician: '🏛️',
      corporate: '🏢',
      ngo: '🤝',
      government_body: '🏛️',
      startup: '🚀',
      nonprofit: '💚'
    }
    return typeConfig[type as keyof typeof typeConfig] || '🏢'
  }

  const getClientTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      politician: 'from-orange-500/20 to-red-500/10 border-orange-500/30',
      corporate: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
      ngo: 'from-green-500/20 to-emerald-500/10 border-green-500/30',
      government_body: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
      startup: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30',
      nonprofit: 'from-pink-500/20 to-rose-500/10 border-pink-500/30',
    }
    return colors[type] || colors.corporate
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading clients...</p>
        </div>
      </div>
    )
  }

  // ── FOLDER GRID (landing view) ──────────────────────────────────────
  if (!selectedClient && !isCreatingClient) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Building2 className="h-4 w-4" />
              <span className="text-white font-semibold text-lg">Clients</span>
            </div>
            <span className="text-gray-600 text-sm">{filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-blue-500 w-56"
              />
            </div>
            {profile?.role === 'admin' && (
              <Button onClick={() => setIsCreatingClient(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" /> Add Client
              </Button>
            )}
          </div>
        </div>

        {/* Folder Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Building2 className="h-16 w-16 text-gray-600 mb-4" />
              <p className="text-white font-medium mb-1">{searchQuery ? 'No clients found' : 'No clients yet'}</p>
              <p className="text-gray-400 text-sm">{searchQuery ? 'Try a different search' : 'Add your first client to get started'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`group relative bg-gradient-to-br ${getClientTypeColor(client.client_type)} border rounded-xl p-4 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-black/30 transition-all duration-200`}
                >
                  {/* Folder tab */}
                  <div className="absolute -top-2 left-4 w-12 h-2 bg-gray-700 rounded-t-md border border-gray-600 border-b-0" />

                  <div className="flex flex-col items-center text-center space-y-3 pt-2">
                    {/* Folder icon */}
                    <div className="relative">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-200">
                        {getClientTypeIcon(client.client_type)}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="w-full">
                      <p className="text-white font-semibold text-sm leading-tight truncate" title={client.name}>
                        {client.name}
                      </p>
                      {client.industry && (
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{client.industry}</p>
                      )}
                    </div>

                    {/* Status dot */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        client.status === 'active' ? 'bg-green-400' :
                        client.status === 'prospect' ? 'bg-yellow-400' :
                        client.status === 'on_hold' ? 'bg-orange-400' :
                        'bg-gray-400'
                      }`} />
                      <span className="text-gray-400 text-xs capitalize">{client.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Full-width panel for create / detail */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Clients</h2>
              <p className="text-gray-400 text-sm">
                {filteredClients.length} of {clients.length} clients
              </p>
            </div>
            {profile?.role === 'admin' && (
              <Button
                onClick={() => {
                  setIsCreatingClient(true)
                  setSelectedClient(null)
                  setIsEditMode(false)
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients, industry, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-white border-gray-600 bg-gray-800 hover:bg-gray-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {/* Quick Sort */}
              <div className="flex items-center space-x-1">
                <Select
                  value={filterState.sortBy}
                  onValueChange={(value) => setFilterState(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="w-auto h-8 bg-gray-800 border-gray-600 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="created_at" className="text-white">Date</SelectItem>
                    <SelectItem value="name" className="text-white">Name</SelectItem>
                    <SelectItem value="department" className="text-white">Department</SelectItem>
                    <SelectItem value="type" className="text-white">Type</SelectItem>
                    <SelectItem value="status" className="text-white">Status</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterState(prev => ({
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                  }))}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  {filterState.sortOrder === 'asc' ?
                    <SortAsc className="h-4 w-4" /> :
                    <SortDesc className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterState(prev => ({
                  ...prev,
                  department: 'all',
                  type: 'all',
                  status: 'all'
                }))}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Department Filter */}
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Department</Label>
                  <Select
                    value={filterState.department}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all" className="text-white">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-white">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type and Status Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">Type</Label>
                    <Select
                      value={filterState.type}
                      onValueChange={(value) => setFilterState(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="all" className="text-white">All Types</SelectItem>
                        <SelectItem value="politician" className="text-white">🏛️ Politician</SelectItem>
                        <SelectItem value="corporate" className="text-white">🏢 Corporate</SelectItem>
                        <SelectItem value="ngo" className="text-white">🤝 NGO</SelectItem>
                        <SelectItem value="government_body" className="text-white">🏛️ Government</SelectItem>
                        <SelectItem value="startup" className="text-white">🚀 Startup</SelectItem>
                        <SelectItem value="nonprofit" className="text-white">💚 Nonprofit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">Status</Label>
                    <Select
                      value={filterState.status}
                      onValueChange={(value) => setFilterState(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="all" className="text-white">All Status</SelectItem>
                        <SelectItem value="active" className="text-white">🟢 Active</SelectItem>
                        <SelectItem value="inactive" className="text-white">⚫ Inactive</SelectItem>
                        <SelectItem value="prospect" className="text-white">🟡 Prospect</SelectItem>
                        <SelectItem value="archived" className="text-white">🔴 Archived</SelectItem>
                        <SelectItem value="on_hold" className="text-white">⏸️ On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Chips */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="px-6 py-3 border-b border-gray-700 bg-gray-800/30">
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs border border-blue-600/30">
                  <Search className="h-3 w-3" />
                  <span>&quot;{searchQuery}&quot;</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:bg-blue-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {filterState.department !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs border border-purple-600/30">
                  <Building2 className="h-3 w-3" />
                  <span>{departments.find(d => d.id === filterState.department)?.name}</span>
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, department: 'all' }))}
                    className="hover:bg-purple-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {filterState.type !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs border border-green-600/30">
                  <Type className="h-3 w-3" />
                  <span>{getClientTypeIcon(filterState.type)} {filterState.type}</span>
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, type: 'all' }))}
                    className="hover:bg-green-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {filterState.status !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs border border-yellow-600/30">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{filterState.status}</span>
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, status: 'all' }))}
                    className="hover:bg-yellow-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients List */}
        <div className="flex-1 overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Users className="h-16 w-16 text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery || activeFilterCount > 0 ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-400 text-center text-sm">
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'Create your first client to get started'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${selectedClient?.id === client.id ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                    }`}
                  onClick={() => {
                    setSelectedClient(client)
                    setIsCreatingClient(false)
                    setIsEditMode(false)
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="overflow-hidden mr-2">
                      <h3 className="font-medium text-white truncate">{client.name}</h3>
                      {client.display_name && client.display_name !== client.name && (
                        <p className="text-sm text-gray-400 truncate">"{client.display_name}"</p>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {client.industry} • {client.department?.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(client.status)}
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(client.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-400 mb-2">
                    {client.primary_email && (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="truncate max-w-[150px]">{client.primary_email}</span>
                      </div>
                    )}
                    {client.primary_phone && (
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        <span>{client.primary_phone}</span>
                      </div>
                    )}
                  </div>

                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {client.tags.slice(0, 3).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded border border-blue-600/30"
                        >
                          {tag}
                        </span>
                      ))}
                      {client.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-600/20 text-gray-400 rounded">
                          +{client.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {client.account_manager && (
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      <span>
                        AM: {client.account_manager.first_name} {client.account_manager.last_name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Client Details or Create Form */}
      <div className="flex-1 flex flex-col">
        {isCreatingClient ? (
          <div className="h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingClient(false)} className="text-gray-400 hover:text-white p-1">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-xl font-bold text-white">Create New Client</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsCreatingClient(false)} className="text-gray-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Basic Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Client Name *</Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter client name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name" className="text-white">Display Name</Label>
                    <Input
                      id="display_name"
                      value={newClient.display_name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, display_name: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Public-facing name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Client Type *</Label>
                    <Select
                      value={newClient.client_type}
                      onValueChange={(value: any) => setNewClient(prev => ({ ...prev, client_type: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="politician" className="text-white">🏛️ Politician</SelectItem>
                        <SelectItem value="corporate" className="text-white">🏢 Corporate</SelectItem>
                        <SelectItem value="ngo" className="text-white">🤝 NGO</SelectItem>
                        <SelectItem value="government_body" className="text-white">🏛️ Government Body</SelectItem>
                        <SelectItem value="startup" className="text-white">🚀 Startup</SelectItem>
                        <SelectItem value="nonprofit" className="text-white">💚 Nonprofit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Status</Label>
                    <Select
                      value={newClient.status}
                      onValueChange={(value: any) => setNewClient(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="active" className="text-white">🟢 Active</SelectItem>
                        <SelectItem value="inactive" className="text-white">⚫ Inactive</SelectItem>
                        <SelectItem value="prospect" className="text-white">🟡 Prospect</SelectItem>
                        <SelectItem value="archived" className="text-white">🔴 Archived</SelectItem>
                        <SelectItem value="on_hold" className="text-white">⏸️ On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Department *</Label>
                  <Select
                    value={newClient.department_id}
                    onValueChange={(value) => setNewClient(prev => ({ ...prev, department_id: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-white">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Contact Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Primary Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.primary_email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, primary_email: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Primary Phone</Label>
                    <Input
                      id="phone"
                      value={newClient.primary_phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, primary_phone: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-white">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={newClient.website_url}
                    onChange={(e) => setNewClient(prev => ({ ...prev, website_url: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-white">Address</Label>
                  <Textarea
                    id="address"
                    value={newClient.address}
                    onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Street address, city, state, country"
                    rows={2}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Business Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-white">Industry</Label>
                    <Input
                      id="industry"
                      value={newClient.industry}
                      onChange={(e) => setNewClient(prev => ({ ...prev, industry: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_size" className="text-white">Company Size</Label>
                    <Select
                      value={newClient.company_size}
                      onValueChange={(value) => setNewClient(prev => ({ ...prev, company_size: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="startup" className="text-white">Startup (1-10)</SelectItem>
                        <SelectItem value="small" className="text-white">Small (11-50)</SelectItem>
                        <SelectItem value="medium" className="text-white">Medium (51-200)</SelectItem>
                        <SelectItem value="large" className="text-white">Large (201-1000)</SelectItem>
                        <SelectItem value="enterprise" className="text-white">Enterprise (1000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_range" className="text-white">Annual Budget Range</Label>
                  <Select
                    value={newClient.annual_budget_range}
                    onValueChange={(value) => setNewClient(prev => ({ ...prev, annual_budget_range: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="under_10k" className="text-white">Under $10K</SelectItem>
                      <SelectItem value="10k_50k" className="text-white">$10K - $50K</SelectItem>
                      <SelectItem value="50k_100k" className="text-white">$50K - $100K</SelectItem>
                      <SelectItem value="100k_500k" className="text-white">$100K - $500K</SelectItem>
                      <SelectItem value="500k_1m" className="text-white">$500K - $1M</SelectItem>
                      <SelectItem value="over_1m" className="text-white">Over $1M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-white">Tags</Label>
                  <Input
                    id="tags"
                    value={newClient.tags}
                    onChange={(e) => setNewClient(prev => ({ ...prev, tags: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-gray-400">Separate multiple tags with commas</p>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Social Media Profiles</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="social_instagram" className="text-white flex items-center gap-2">
                      <span>📸</span> Instagram
                    </Label>
                    <Input
                      id="social_instagram"
                      value={newClient.social_instagram}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_instagram: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@username or profile URL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_twitter" className="text-white flex items-center gap-2">
                      <span>𝕏</span> Twitter / X
                    </Label>
                    <Input
                      id="social_twitter"
                      value={newClient.social_twitter}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_twitter: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@handle or profile URL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_youtube" className="text-white flex items-center gap-2">
                      <span>▶️</span> YouTube
                    </Label>
                    <Input
                      id="social_youtube"
                      value={newClient.social_youtube}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_youtube: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Channel URL or handle"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_linkedin" className="text-white flex items-center gap-2">
                      <span>💼</span> LinkedIn
                    </Label>
                    <Input
                      id="social_linkedin"
                      value={newClient.social_linkedin}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_linkedin: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Profile or company page URL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_facebook" className="text-white flex items-center gap-2">
                      <span>📘</span> Facebook
                    </Label>
                    <Input
                      id="social_facebook"
                      value={newClient.social_facebook}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_facebook: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Page or profile URL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_tiktok" className="text-white flex items-center gap-2">
                      <span>🎵</span> TikTok
                    </Label>
                    <Input
                      id="social_tiktok"
                      value={newClient.social_tiktok}
                      onChange={(e) => setNewClient(prev => ({ ...prev, social_tiktok: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@username or profile URL"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Internal Notes</h4>

                <div className="space-y-2">
                  <Label htmlFor="client_brief" className="text-white">Client Brief</Label>
                  <Textarea
                    id="client_brief"
                    value={newClient.client_brief}
                    onChange={(e) => setNewClient(prev => ({ ...prev, client_brief: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Brief description of the client and their needs"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_notes" className="text-white">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    value={newClient.internal_notes}
                    onChange={(e) => setNewClient(prev => ({ ...prev, internal_notes: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Private notes for the team"
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <Button
                  onClick={handleCreateClient}
                  disabled={!newClient.name || !newClient.department_id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingClient(false)}
                  className="text-white border-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : isEditMode && editingClient && selectedClient ? (
          /* Edit Client Form */
          <div className="h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit Client: {selectedClient.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false)
                    setEditingClient(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_name" className="text-white">Client Name *</Label>
                    <Input
                      id="edit_name"
                      value={editingClient.name}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_display_name" className="text-white">Display Name</Label>
                    <Input
                      id="edit_display_name"
                      value={editingClient.display_name}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, display_name: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Client Type</Label>
                    <Select
                      value={editingClient.client_type}
                      onValueChange={(value) => setEditingClient((prev: any) => ({ ...prev, client_type: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="politician" className="text-white">🏛️ Politician</SelectItem>
                        <SelectItem value="corporate" className="text-white">🏢 Corporate</SelectItem>
                        <SelectItem value="ngo" className="text-white">🤝 NGO</SelectItem>
                        <SelectItem value="government_body" className="text-white">🏛️ Government Body</SelectItem>
                        <SelectItem value="startup" className="text-white">🚀 Startup</SelectItem>
                        <SelectItem value="nonprofit" className="text-white">💚 Nonprofit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Status</Label>
                    <Select
                      value={editingClient.status}
                      onValueChange={(value) => setEditingClient((prev: any) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="active" className="text-white">🟢 Active</SelectItem>
                        <SelectItem value="inactive" className="text-white">⚫ Inactive</SelectItem>
                        <SelectItem value="prospect" className="text-white">🟡 Prospect</SelectItem>
                        <SelectItem value="archived" className="text-white">🔴 Archived</SelectItem>
                        <SelectItem value="on_hold" className="text-white">⏸️ On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_email" className="text-white">Primary Email</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={editingClient.primary_email}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, primary_email: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_phone" className="text-white">Primary Phone</Label>
                    <Input
                      id="edit_phone"
                      value={editingClient.primary_phone}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, primary_phone: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_website" className="text-white">Website</Label>
                  <Input
                    id="edit_website"
                    type="url"
                    value={editingClient.website_url}
                    onChange={(e) => setEditingClient((prev: any) => ({ ...prev, website_url: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_address" className="text-white">Address</Label>
                  <Textarea
                    id="edit_address"
                    value={editingClient.address}
                    onChange={(e) => setEditingClient((prev: any) => ({ ...prev, address: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={2}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_industry" className="text-white">Industry</Label>
                    <Input
                      id="edit_industry"
                      value={editingClient.industry}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, industry: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Company Size</Label>
                    <Select
                      value={editingClient.company_size}
                      onValueChange={(value) => setEditingClient((prev: any) => ({ ...prev, company_size: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="startup" className="text-white">Startup (1-10)</SelectItem>
                        <SelectItem value="small" className="text-white">Small (11-50)</SelectItem>
                        <SelectItem value="medium" className="text-white">Medium (51-200)</SelectItem>
                        <SelectItem value="large" className="text-white">Large (201-1000)</SelectItem>
                        <SelectItem value="enterprise" className="text-white">Enterprise (1000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Annual Budget Range</Label>
                  <Select
                    value={editingClient.annual_budget_range}
                    onValueChange={(value) => setEditingClient((prev: any) => ({ ...prev, annual_budget_range: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="under_10k" className="text-white">Under $10K</SelectItem>
                      <SelectItem value="10k_50k" className="text-white">$10K - $50K</SelectItem>
                      <SelectItem value="50k_100k" className="text-white">$50K - $100K</SelectItem>
                      <SelectItem value="100k_500k" className="text-white">$100K - $500K</SelectItem>
                      <SelectItem value="500k_1m" className="text-white">$500K - $1M</SelectItem>
                      <SelectItem value="over_1m" className="text-white">Over $1M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_tags" className="text-white">Tags</Label>
                  <Input
                    id="edit_tags"
                    value={editingClient.tags}
                    onChange={(e) => setEditingClient((prev: any) => ({ ...prev, tags: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-gray-400">Separate multiple tags with commas</p>
                </div>
              </div>

              {/* Social Media Profiles */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Social Media Profiles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_instagram" className="text-white flex items-center gap-2">
                      <span>📸</span> Instagram
                    </Label>
                    <Input
                      id="edit_social_instagram"
                      value={editingClient.social_instagram}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_instagram: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@username or profile URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_twitter" className="text-white flex items-center gap-2">
                      <span>𝕏</span> Twitter / X
                    </Label>
                    <Input
                      id="edit_social_twitter"
                      value={editingClient.social_twitter}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_twitter: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@handle or profile URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_youtube" className="text-white flex items-center gap-2">
                      <span>▶️</span> YouTube
                    </Label>
                    <Input
                      id="edit_social_youtube"
                      value={editingClient.social_youtube}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_youtube: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Channel URL or handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_linkedin" className="text-white flex items-center gap-2">
                      <span>💼</span> LinkedIn
                    </Label>
                    <Input
                      id="edit_social_linkedin"
                      value={editingClient.social_linkedin}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_linkedin: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Profile or company page URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_facebook" className="text-white flex items-center gap-2">
                      <span>📘</span> Facebook
                    </Label>
                    <Input
                      id="edit_social_facebook"
                      value={editingClient.social_facebook}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_facebook: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Page or profile URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_social_tiktok" className="text-white flex items-center gap-2">
                      <span>🎵</span> TikTok
                    </Label>
                    <Input
                      id="edit_social_tiktok"
                      value={editingClient.social_tiktok}
                      onChange={(e) => setEditingClient((prev: any) => ({ ...prev, social_tiktok: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="@username or profile URL"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Internal Notes</h4>
                <div className="space-y-2">
                  <Label htmlFor="edit_brief" className="text-white">Client Brief</Label>
                  <Textarea
                    id="edit_brief"
                    value={editingClient.client_brief}
                    onChange={(e) => setEditingClient((prev: any) => ({ ...prev, client_brief: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_notes" className="text-white">Internal Notes</Label>
                  <Textarea
                    id="edit_notes"
                    value={editingClient.internal_notes}
                    onChange={(e) => setEditingClient((prev: any) => ({ ...prev, internal_notes: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={4}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditMode(false)
                    setEditingClient(null)
                  }}
                  className="text-white border-gray-600 bg-gray-800 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const updateData: UpdateClientData = {
                      name: editingClient.name,
                      client_type: editingClient.client_type,
                      status: editingClient.status,
                      display_name: editingClient.display_name || undefined,
                      primary_email: editingClient.primary_email || undefined,
                      primary_phone: editingClient.primary_phone || undefined,
                      website_url: editingClient.website_url || undefined,
                      address: editingClient.address || undefined,
                      industry: editingClient.industry || undefined,
                      company_size: editingClient.company_size || undefined,
                      annual_budget_range: editingClient.annual_budget_range || undefined,
                      tags: editingClient.tags ? editingClient.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
                      internal_notes: editingClient.internal_notes || undefined,
                      client_brief: editingClient.client_brief || undefined,
                      social_instagram: editingClient.social_instagram || undefined,
                      social_twitter: editingClient.social_twitter || undefined,
                      social_youtube: editingClient.social_youtube || undefined,
                      social_linkedin: editingClient.social_linkedin || undefined,
                      social_facebook: editingClient.social_facebook || undefined,
                      social_tiktok: editingClient.social_tiktok || undefined
                    }
                    const result = await updateClient(selectedClient.id, updateData)
                    if (result) {
                      setSelectedClient({ ...selectedClient, ...updateData, tags: updateData.tags || selectedClient.tags })
                      setIsEditMode(false)
                      setEditingClient(null)
                      refetch()
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        ) : selectedClient ? (
          /* Client Details View */
          <div className="h-full flex flex-col">
            {/* Header - Always Visible */}
            <div className="p-6 border-b border-gray-700 bg-gray-900/50">
              <div className="flex items-start justify-between">

                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setIsEditMode(false); setEditingClient(null) }} className="text-gray-400 hover:text-white p-1 mr-1">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl">{getClientTypeIcon(selectedClient.client_type)}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                      {selectedClient.display_name && selectedClient.display_name !== selectedClient.name && (
                        <p className="text-gray-400">&quot;{selectedClient.display_name}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    {getStatusBadge(selectedClient.status)}
                    <span className="text-sm text-gray-400">
                      {selectedClient.industry} • {selectedClient.department?.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    {selectedClient.primary_email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        <a href={`mailto:${selectedClient.primary_email}`} className="hover:text-blue-400">
                          {selectedClient.primary_email}
                        </a>
                      </div>
                    )}
                    {selectedClient.primary_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        <a href={`tel:${selectedClient.primary_phone}`} className="hover:text-blue-400">
                          {selectedClient.primary_phone}
                        </a>
                      </div>
                    )}
                    {selectedClient.website_url && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        <a
                          href={selectedClient.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {(profile?.role === 'admin' || selectedClient.account_manager_id === user?.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(true)
                        setEditingClient({
                          name: selectedClient.name,
                          client_type: selectedClient.client_type,
                          status: selectedClient.status,
                          display_name: selectedClient.display_name || '',
                          primary_email: selectedClient.primary_email || '',
                          primary_phone: selectedClient.primary_phone || '',
                          website_url: selectedClient.website_url || '',
                          address: selectedClient.address || '',
                          industry: selectedClient.industry || '',
                          company_size: selectedClient.company_size || '',
                          annual_budget_range: selectedClient.annual_budget_range || '',
                          account_manager_id: selectedClient.account_manager_id || '',
                          tags: Array.isArray(selectedClient.tags) ? selectedClient.tags.join(', ') : '',
                          internal_notes: selectedClient.internal_notes || '',
                          client_brief: selectedClient.client_brief || '',
                          social_instagram: selectedClient.social_instagram || '',
                          social_twitter: selectedClient.social_twitter || '',
                          social_youtube: selectedClient.social_youtube || '',
                          social_linkedin: selectedClient.social_linkedin || '',
                          social_facebook: selectedClient.social_facebook || '',
                          social_tiktok: selectedClient.social_tiktok || ''
                        })
                      }}
                      className="text-white border-gray-600 bg-gray-800 hover:bg-gray-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}

                  {profile?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      className="text-red-400 border-red-600 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <div className="px-6 border-b border-gray-700">
                  <TabsList className="bg-transparent border-b-0 h-10 p-0 space-x-6">
                    <TabsTrigger
                      value="overview"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="campaigns"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      Campaigns
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      Files
                    </TabsTrigger>
                    <TabsTrigger
                      value="chat"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="news"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      News
                    </TabsTrigger>
                    <TabsTrigger
                      value="twitter"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                    >
                      𝕏 Twitter
                    </TabsTrigger>
                    {selectedClient.client_type === 'politician' && (
                      <>
                        <TabsTrigger
                          value="demographics"
                          className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                        >
                          Demographics
                        </TabsTrigger>
                        <TabsTrigger
                          value="manifesto"
                          className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 rounded-none h-10 px-0 pb-2"
                        >
                          Manifesto
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
                  {/* Address */}
                  {selectedClient.address && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-white">Address</h3>
                      </div>
                      <p className="text-gray-300 pl-6">{selectedClient.address}</p>
                    </div>
                  )}

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                      Business Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      {selectedClient.company_size && (
                        <div>
                          <p className="text-sm text-gray-400">Company Size</p>
                          <p className="text-white capitalize">{selectedClient.company_size.replace('_', ' ')}</p>
                        </div>
                      )}
                      {selectedClient.annual_budget_range && (
                        <div>
                          <p className="text-sm text-gray-400">Budget Range</p>
                          <p className="text-white">{selectedClient.annual_budget_range.replace('_', ' - $').replace('k', 'K').replace('m', 'M')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social Media Profiles */}
                  {(selectedClient.social_instagram || selectedClient.social_twitter || selectedClient.social_youtube || selectedClient.social_linkedin || selectedClient.social_facebook || selectedClient.social_tiktok) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-gray-400" />
                        Social Media Profiles
                      </h3>
                      <div className="flex flex-wrap gap-3 pl-6">
                        {selectedClient.social_instagram && (
                          <a
                            href={selectedClient.social_instagram.startsWith('http') ? selectedClient.social_instagram : `https://instagram.com/${selectedClient.social_instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                          >
                            <span>📸</span> Instagram
                          </a>
                        )}
                        {selectedClient.social_twitter && (
                          <a
                            href={selectedClient.social_twitter.startsWith('http') ? selectedClient.social_twitter : `https://x.com/${selectedClient.social_twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors"
                          >
                            <span>𝕏</span> Twitter/X
                          </a>
                        )}
                        {selectedClient.social_youtube && (
                          <a
                            href={selectedClient.social_youtube.startsWith('http') ? selectedClient.social_youtube : `https://youtube.com/${selectedClient.social_youtube}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 rounded-lg text-white text-sm hover:bg-red-700 transition-colors"
                          >
                            <span>▶️</span> YouTube
                          </a>
                        )}
                        {selectedClient.social_linkedin && (
                          <a
                            href={selectedClient.social_linkedin.startsWith('http') ? selectedClient.social_linkedin : `https://linkedin.com/in/${selectedClient.social_linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-700 rounded-lg text-white text-sm hover:bg-blue-800 transition-colors"
                          >
                            <span>💼</span> LinkedIn
                          </a>
                        )}
                        {selectedClient.social_facebook && (
                          <a
                            href={selectedClient.social_facebook.startsWith('http') ? selectedClient.social_facebook : `https://facebook.com/${selectedClient.social_facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg text-white text-sm hover:bg-blue-500 transition-colors"
                          >
                            <span>📘</span> Facebook
                          </a>
                        )}
                        {selectedClient.social_tiktok && (
                          <a
                            href={selectedClient.social_tiktok.startsWith('http') ? selectedClient.social_tiktok : `https://tiktok.com/${selectedClient.social_tiktok.startsWith('@') ? selectedClient.social_tiktok : '@' + selectedClient.social_tiktok}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-lg text-white text-sm hover:bg-gray-800 transition-colors"
                          >
                            <span>🎵</span> TikTok
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Client Brief */}
                  {selectedClient.client_brief && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">Client Brief</h3>
                      <p className="text-gray-300 leading-relaxed">{selectedClient.client_brief}</p>
                    </div>
                  )}

                  {/* AI Profile Analysis */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">AI Profile Analysis</h3>
                      </div>
                      {(aiSummary || isGeneratingSummary) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateSummary(!!aiSummary)}
                          disabled={isGeneratingSummary}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                        >
                          {isGeneratingSummary ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                              Generating...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              {aiSummary ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-2" />
                                  Regenerate
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-2" />
                                  Generate Summary
                                </>
                              )}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* AI Summary Content */}
                    {isGeneratingSummary && !aiSummary ? (
                      <div className="p-4 bg-purple-900/10 rounded-lg border border-purple-500/30 animate-pulse">
                        <div className="h-4 bg-purple-500/20 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-purple-500/20 rounded w-1/2"></div>
                      </div>
                    ) : aiSummary ? (
                      <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                        <p className="text-gray-300 leading-relaxed text-sm">
                          {aiSummary}
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                        <p className="text-gray-400 text-sm mb-3">
                          Generate an AI-powered summary of this client's profile, including key opportunities and engagement strategies.
                        </p>
                        <Button
                          onClick={() => handleGenerateSummary()}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Analysis
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Internal Notes */}
                  {selectedClient.internal_notes && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">Internal Notes</h3>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-gray-300 leading-relaxed">{selectedClient.internal_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedClient.tags && selectedClient.tags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-white">Tags</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {selectedClient.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="bg-blue-600/20 text-blue-400 border border-blue-600/30">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared With Team */}
                  <ClientSharing clientId={selectedClient.id} clientName={selectedClient.name} />

                  {/* Account Manager */}
                  {selectedClient.account_manager && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-white">Account Manager</h3>
                      </div>
                      <div className="pl-6">
                        <p className="text-white">
                          {selectedClient.account_manager.first_name} {selectedClient.account_manager.last_name}
                        </p>
                        <p className="text-gray-400 text-sm">{selectedClient.account_manager.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-700 text-sm text-gray-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p>Created: {new Date(selectedClient.created_at).toLocaleDateString()}</p>
                        <p>Updated: {new Date(selectedClient.updated_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p>Last Activity: {new Date(selectedClient.last_activity_at).toLocaleDateString()}</p>
                        {selectedClient.created_by_user && (
                          <p>Created by: {selectedClient.created_by_user.first_name} {selectedClient.created_by_user.last_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="campaigns" className="flex-1 overflow-y-auto mt-0">
                  <ClientCampaigns clientId={selectedClient.id} />
                </TabsContent>

                <TabsContent value="files" className="flex-1 overflow-hidden py-4 mt-0">
                  <ClientAssets clientId={selectedClient.id} departmentId={selectedClient.department_id} />
                </TabsContent>

                <TabsContent value="chat" className="flex-1 overflow-hidden p-6 mt-0">
                  <ClientChat clientId={selectedClient.id} clientName={selectedClient.name} />
                </TabsContent>

                <TabsContent value="news" className="flex-1 overflow-hidden p-6 mt-0">
                  <ClientNewsPanel
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    youtubeHandle={selectedClient.social_youtube}
                  />
                </TabsContent>

                <TabsContent value="twitter" className="flex-1 overflow-hidden p-6 mt-0">
                  <ClientTwitterFeed
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    twitterHandle={selectedClient.social_twitter}
                  />
                </TabsContent>

                {selectedClient.client_type === 'politician' && (
                  <>
                    <TabsContent value="demographics" className="flex-1 overflow-y-auto p-6 mt-0">
                      <ClientDemographics
                        clientId={selectedClient.id}
                        clientName={selectedClient.name}
                      />
                    </TabsContent>

                    <TabsContent value="manifesto" className="flex-1 overflow-y-auto p-6 mt-0">
                      <ManifestoPriorities
                        clientId={selectedClient.id}
                        clientName={selectedClient.name}
                      />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}