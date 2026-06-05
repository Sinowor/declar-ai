import type { FC } from 'react'
import Logo from './Logo'
import { IconDocNav, IconSearchNav, IconGearNav } from './Icons'

type ModuleId = 'declarations' | 'hs-classifier' | 'settings'

interface NavItem {
  id: ModuleId
  label: string
  shortLabel: string
  icon: FC
}

const navItems: NavItem[] = [
  { id: 'declarations', label: 'DeclarAI 制单', shortLabel: '制单', icon: IconDocNav },
  { id: 'hs-classifier', label: 'DeclarAI 归类', shortLabel: '归类', icon: IconSearchNav },
]

const bottomItems: NavItem[] = [
  { id: 'settings', label: '设置', shortLabel: '设置', icon: IconGearNav },
]

interface Props {
  active: ModuleId
  onChange: (id: ModuleId) => void
  editing?: boolean
  onExitEdit?: () => void
  onToggleSidebar?: () => void
  onLogoClick?: () => void
}

export type { ModuleId }

const isMac = navigator.platform?.toLowerCase?.().includes('mac')

export default function NavRail({ active, onChange, editing, onExitEdit, onToggleSidebar, onLogoClick }: Props) {
  const renderItem = (item: NavItem) => {
    const isActive = active === item.id
    const Icon = item.icon
    return (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        title={item.label}
        className="w-full flex flex-col items-center gap-0.5 py-2 cursor-pointer border-none bg-transparent hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }}
      >
        <Icon />
        <span className={`text-[10px] font-medium leading-none ${isActive ? '' : 'opacity-70'}`}>{item.shortLabel}</span>
      </button>
    )
  }

  return (
    <nav
      className="flex flex-col shrink-0 items-center bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-20 drag-region"
      style={{ width: 74 }}
    >
      {/* Spacing below titleBarOverlay */}
      <div style={{ height: isMac ? 6 : 8 }} className="shrink-0" />

      {/* Logo + app name */}
      <button onClick={onLogoClick} title="关于 DeclarAI"
        className="flex flex-col items-center gap-0.5 pb-3 w-full no-drag cursor-pointer border-none bg-transparent hover:opacity-80 transition-opacity">
        <Logo size={22} />
        <span className="text-[11px] font-semibold text-ink leading-none">DeclarAI</span>
      </button>

      {/* Divider */}
      <div className="w-10 h-px bg-gray-200 dark:bg-gray-700 mb-2" />

      {/* Main nav items */}
      <div className="flex flex-col items-center gap-1 px-2 no-drag w-full">
        {navItems.map(renderItem)}
      </div>
      <div style={{ flex: '1 1 55%' }} />

      {/* Edit mode actions */}
      {editing && (
        <div className="flex flex-col items-center gap-1 px-2 pb-2 no-drag w-full">
          <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mb-1" />
          <button onClick={onToggleSidebar} title="展开侧栏"
            className="w-full flex flex-col items-center gap-0.5 py-2 cursor-pointer border-none bg-transparent hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" />
            </svg>
            <span className="text-[10px] font-medium leading-none opacity-70">侧栏</span>
          </button>
          <button onClick={onExitEdit} title="退出编辑"
            className="w-full flex flex-col items-center gap-0.5 py-2 cursor-pointer border-none bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-[10px] font-medium leading-none" style={{ color: '#EF4444' }}>退出</span>
          </button>
        </div>
      )}

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-1 px-2 pb-4 no-drag w-full">
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  )
}
