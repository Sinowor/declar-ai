import type { FC } from 'react'
import { IconDocNav, IconSearchNav, IconGearNav } from './Icons'

type ModuleId = 'declarations' | 'hs-classifier' | 'settings'

interface NavItem {
  id: ModuleId
  label: string
  icon: FC
}

const navItems: NavItem[] = [
  { id: 'declarations', label: '申报制单', icon: IconDocNav },
  { id: 'hs-classifier', label: 'HS 归类', icon: IconSearchNav },
]

const bottomItems: NavItem[] = [
  { id: 'settings', label: '设置', icon: IconGearNav },
]

interface Props {
  active: ModuleId
  onChange: (id: ModuleId) => void
}

export type { ModuleId }

export default function NavRail({ active, onChange }: Props) {
  const renderItem = (item: NavItem) => {
    const isActive = active === item.id
    const Icon = item.icon
    return (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        title={item.label}
        className="relative w-full h-10 flex items-center justify-center cursor-pointer border-none bg-transparent group"
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
      className="flex flex-col shrink-0 items-center bg-white border-r border-gray-200 z-20"
      style={{ width: 48 }}
    >
      {/* Top spacer — slightly smaller than bottom to place icons above center */}
      <div style={{ flex: '1 1 40%' }} />

      {/* Center items */}
      <div className="flex flex-col items-center gap-0.5">
        {navItems.map(renderItem)}
      </div>

      {/* Bottom spacer — larger to push icons above center */}
      <div style={{ flex: '1 1 60%' }} />

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-0.5 pb-3">
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  )
}
