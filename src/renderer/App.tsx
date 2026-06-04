import { useState, useEffect, useCallback, useRef } from 'react'
import NavRail, { type ModuleId } from './components/NavRail'
import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'
import HsClassifier from './components/HsClassifier'
import BatchClassifier from './components/BatchClassifier'
import TitleBar from './components/TitleBar'
import Settings from './components/Settings'
import AboutModal from './components/AboutModal'
import LicenseModal from './components/LicenseModal'

export interface DeclarationItem {
  id: string
  displayName: string
  type: string | null
  status: 'draft' | 'processing' | 'review' | 'done' | 'error'
  cargoCount: number
  updatedAt: string
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).api
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小时前`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} 天前`
}

const mockDeclarations: DeclarationItem[] = [
  { id: '1', displayName: 'INV-2024-001', type: null, status: 'review', cargoCount: 3, updatedAt: '2 分钟前' },
]

export default function App() {
  // ═══ Module navigation ═══
  const [activeModule, setActiveModule] = useState<ModuleId>('declarations')

  // ═══ Declarations state ═══
  const [declarations, setDeclarations] = useState<DeclarationItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [licenseOpen, setLicenseOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const loadDeclarations = useCallback(async () => {
    if (isElectron()) {
      try {
        const result = await window.api.getDeclarations(debouncedSearch || undefined)
        if (Array.isArray(result)) {
          setDeclarations(result.map((r: any) => ({
            id: r.id,
            displayName: r.displayName || '(未编号)',
            type: r.type || null,
            status: r.status,
            cargoCount: r.cargoCount || 0,
            updatedAt: formatRelativeTime(r.updated_at),
          })))
        }
      } catch (err) {
        console.error('Failed to load declarations:', err)
        setDeclarations(mockDeclarations)
      }
    } else {
      setDeclarations(mockDeclarations)
    }
    setReady(true)
  }, [debouncedSearch])

  useEffect(() => { loadDeclarations() }, [loadDeclarations])

  useEffect(() => {
    if (window.api?.onOpenAbout) {
      return window.api.onOpenAbout(() => setAboutOpen(true))
    }
  }, [])

  useEffect(() => {
    const handler = () => setLicenseOpen(true)
    window.addEventListener('app:show-license', handler)
    return () => window.removeEventListener('app:show-license', handler)
  }, [])

  const editingDeclaration = editingId ? declarations.find(d => d.id === editingId) || null : null
  const selectedDeclaration = selectedId ? declarations.find(d => d.id === selectedId) || null : null

  const filteredDeclarations = searchQuery
    ? declarations.filter(d =>
        d.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    : declarations

  const handleSelect = (id: string) => {
    if (editingId) return
    setSelectedId(id)
  }

  const handleEnterEdit = (id: string) => {
    setSelectedId(id)
    setEditingId(id)
  }

  const handleDelete = async (id: string) => {
    if (isElectron()) {
      try {
        await window.api.deleteDeclaration(id)
        if (selectedId === id) setSelectedId(null)
        if (editingId === id) setEditingId(null)
        await loadDeclarations()
      } catch (err) { console.error('Failed to delete:', err) }
    }
  }

  const handleExitEdit = async () => {
    setEditingId(null)
    await loadDeclarations()
  }

  const handleNewDeclaration = async () => {
    if (isElectron()) {
      try {
        const result = await window.api.createDeclaration()
        if (result?.id) {
          await loadDeclarations()
          setSelectedId(result.id)
          setEditingId(result.id)
        }
      } catch (err) { console.error('Failed to create declaration:', err) }
    } else {
      const newId = String(Date.now())
      setSelectedId(newId)
      setEditingId(newId)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingId) {
        setEditingId(null)
        loadDeclarations()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId])

  // ═══ HS classifier → navigate to HS module ═══
  const navigateToHsClassifier = useCallback((productName?: string) => {
    setActiveModule('hs-classifier')
  }, [])

  // ═══ Batch mode ═══
  const [batchMode, setBatchMode] = useState(false)

  if (!ready) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-muted text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  const isMac = navigator.platform?.toLowerCase?.().includes('mac')
  const platformClass = isMac ? 'platform-darwin' : 'platform-win32'

  return (
    <div className={platformClass} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {!isMac && <TitleBar />}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ═══ Left Icon Rail ═══ */}
      <NavRail active={activeModule} onChange={setActiveModule} />

      {/* ═══ Context Panel (switches per module) ═══ */}
      {activeModule === 'declarations' && (
        <Sidebar
          declarations={filteredDeclarations}
          selectedId={selectedId}
          editingId={editingId}
          collapsed={sidebarCollapsed}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNewDeclaration={handleNewDeclaration}
          onExitDeclaration={handleExitEdit}
          onDelete={handleDelete}
        />
      )}

      {/* ═══ Workspace (switches per module) ═══ */}
      {activeModule === 'declarations' && (
        <Workspace
          declaration={editingDeclaration}
          selectedDeclaration={selectedDeclaration}
          onEnterEdit={() => selectedId && handleEnterEdit(selectedId)}
          isEditing={!!editingId}
          onNavigateToHs={navigateToHsClassifier}
          recentDeclarations={declarations}
          onSelectDeclaration={handleSelect}
          onNewDeclaration={handleNewDeclaration}
        />
      )}
      {activeModule === 'hs-classifier' && !batchMode && (
        <HsClassifier onBatchMode={() => setBatchMode(true)} />
      )}
      {activeModule === 'hs-classifier' && batchMode && (
        <BatchClassifier onBack={() => setBatchMode(false)} />
      )}
      {activeModule === 'settings' && (
        <Settings onShowAbout={() => setAboutOpen(true)} onShowLicense={() => setLicenseOpen(true)} />
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LicenseModal open={licenseOpen} onClose={() => setLicenseOpen(false)} />
      </div>
    </div>
  )
}
