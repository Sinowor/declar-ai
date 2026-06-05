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
}

export type { ModuleId }

const isMac = navigator.platform?.toLowerCase?.().includes('mac')

export default function NavRail({ active, onChange }: Props) {
  const renderItem = (item: NavItem) => {
    const isActive = active === item.id
    const Icon = item.icon
    return (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        title={item.label}
        className="relative w-full h-11 flex items-center justify-center cursor-pointer border-none bg-transparent"
        style={{ color: isActive ? 'var(--primary)' : '#94a3b8' }}
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
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  )
}
