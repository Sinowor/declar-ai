import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'

export interface DeclarationItem {
  id: string
  preEntryNumber: string | null
  transportName: string
  status: 'draft' | 'processing' | 'review' | 'done' | 'error'
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
  {
    id: '1',
    preEntryNumber: '2002029999509318',
    transportName: 'COSCO HAIFA / 072N',
    status: 'review',
    updatedAt: '2 分钟前',
  },
]

export default function App() {
  const [declarations, setDeclarations] = useState<DeclarationItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ready, setReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const loadDeclarations = useCallback(async () => {
    if (isElectron()) {
      try {
        const result = await window.api.getDeclarations(debouncedSearch || undefined)
        if (Array.isArray(result)) {
          setDeclarations(
            result.map((r: any) => ({
              id: r.id,
              preEntryNumber: r.preEntryNumber,
              transportName: r.transportName || '',
              status: r.status,
              updatedAt: formatRelativeTime(r.updated_at),
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load declarations:', err)
        setDeclarations(mockDeclarations)
      }
    } else {
      // Running in browser (dev without Electron) — use mock data
      setDeclarations(mockDeclarations)
    }
    setReady(true)
  }, [debouncedSearch])

  useEffect(() => {
    loadDeclarations()
  }, [loadDeclarations])

  const activeDeclaration = activeId
    ? declarations.find((d) => d.id === activeId) || null
    : null

  const filteredDeclarations = searchQuery
    ? declarations.filter(
        (d) =>
          (d.preEntryNumber || '').includes(searchQuery) ||
          d.transportName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : declarations

  const handleNewDeclaration = async () => {
    if (isElectron()) {
      try {
        const result = await window.api.createDeclaration()
        if (result?.id) {
          await loadDeclarations()
          setActiveId(result.id)
        }
      } catch (err) {
        console.error('Failed to create declaration:', err)
      }
    } else {
      const newId = String(Date.now())
      setActiveId(newId)
    }
  }

  // ESC key to exit declaration lock mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeId) {
        setActiveId(null)
        loadDeclarations()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeId])

  const handleExitDeclaration = async () => {
    setActiveId(null)
    await loadDeclarations()
  }

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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        declarations={filteredDeclarations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelect={(id) => setActiveId(id)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewDeclaration={handleNewDeclaration}
        onExitDeclaration={handleExitDeclaration}
      />
      <Workspace declaration={activeDeclaration} />
    </div>
  )
}
