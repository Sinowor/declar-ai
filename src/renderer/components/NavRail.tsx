import type { FC } from 'react'
import { IconDocNav, IconSearchNav, IconGearNav } from './Icons'

type ModuleId = 'declarations' | 'hs-classifier' | 'settings'

interface NavItem {
  id: ModuleId
  label: string
  icon: FC
}

const navItems: NavItem[] = [
  { id: 'declarations', label: 'DeclarAI 制单', icon: IconDocNav },
  { id: 'hs-classifier', label: 'DeclarAI 归类', icon: IconSearchNav },
]

const bottomItems: NavItem[] = [
  { id: 'settings', label: '设置', icon: IconGearNav },
]

interface Props {
  active: ModuleId
  onChange: (id: ModuleId) => void
  editing?: boolean
  onExitEdit?: () => void
}

export type { ModuleId }

const isMac = navigator.platform?.toLowerCase?.().includes('mac')

export default function NavRail({ active, onChange, editing, onExitEdit }: Props) {
  const renderItem = (item: NavItem) => {
    const isActive = active === item.id
    const Icon = item.icon
    return (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        title={item.label}
        className="relative w-full h-11 flex items-center justify-center cursor-pointer border-none bg-transparent"
        style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }}
      >
        <span className="transition-colors duration-150">
          <Icon />
        </span>
      </button>
    )
  }

  return (
    <nav
      className="flex flex-col shrink-0 items-center bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-20 drag-region"
      style={{ width: 56 }}
    >
      {/* macOS traffic light clearance */}
      <div style={{ height: isMac ? 44 : 8 }} className="shrink-0" />

      {/* Center items — slightly above center */}
      <div style={{ flex: '1 1 35%' }} />

      <div className="flex flex-col items-center gap-0.5 no-drag">
        {navItems.map(renderItem)}
      </div>

      <div style={{ flex: '1 1 65%' }} />

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-0.5 pb-3 no-drag">
        {editing && onExitEdit && (
          <button
            onClick={onExitEdit}
            title="退出编辑"
            className="w-full h-11 flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  )
}
