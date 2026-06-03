import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'

export interface DeclarationItem {
  id: string
  preEntryNumber: string | null
  transportName: string
  status: 'draft' | 'processing' | 'review' | 'done' | 'error'
  updatedAt: string
}

const mockDeclarations: DeclarationItem[] = [
  {
    id: '1',
    preEntryNumber: '2002029999509318',
    transportName: 'COSCO HAIFA / 072N',
    status: 'review',
    updatedAt: '2 分钟前',
  },
  {
    id: '2',
    preEntryNumber: '3104202300001234',
    transportName: 'EVER FORTUNE / 128W',
    status: 'done',
    updatedAt: '3 小时前',
  },
  {
    id: '3',
    preEntryNumber: '4403202300005678',
    transportName: 'CSCL ARCTIC / 045S',
    status: 'draft',
    updatedAt: '1 天前',
  },
]

export default function App() {
  const [declarations] = useState<DeclarationItem[]>(mockDeclarations)
  const [activeId, setActiveId] = useState<string | null>('1')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const activeDeclaration = activeId
    ? declarations.find((d) => d.id === activeId)
    : null

  const filteredDeclarations = searchQuery
    ? declarations.filter(
        (d) =>
          (d.preEntryNumber || '').includes(searchQuery) ||
          d.transportName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : declarations

  const handleExitDeclaration = () => {
    setActiveId(null)
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
        onNewDeclaration={() => {
          const newId = String(Date.now())
          alert('已创建新申报单（草稿）')
        }}
        onExitDeclaration={handleExitDeclaration}
      />
      <Workspace declaration={activeDeclaration} />
    </div>
  )
}
