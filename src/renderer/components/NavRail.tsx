type ModuleId = 'declarations' | 'hs-classifier' | 'settings'

interface NavItem {
  id: ModuleId
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'declarations', label: '申报制单', icon: '📋' },
  { id: 'hs-classifier', label: 'HS 归类', icon: '🔍' },
]

const bottomItems: NavItem[] = [
  { id: 'settings', label: '设置', icon: '⚙' },
]

interface Props {
  active: ModuleId
  onChange: (id: ModuleId) => void
}

export type { ModuleId }

export default function NavRail({ active, onChange }: Props) {
  const renderItem = (item: NavItem) => {
    const isActive = active === item.id
    return (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        title={item.label}
        className={`relative w-full h-11 flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${
          isActive ? 'text-primary-500' : 'text-muted hover:text-ink'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary-500 rounded-r-sm" />
        )}
        <span className="text-xl leading-none">{item.icon}</span>
      </button>
    )
  }

  return (
    <nav
      className="flex flex-col shrink-0 items-center bg-white border-r border-gray-200 z-20"
      style={{ width: 48 }}
    >
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Center items */}
      <div className="flex flex-col items-center gap-1">
        {navItems.map(renderItem)}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col items-center pb-3 gap-1">
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  )
}
