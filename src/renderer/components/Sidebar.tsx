import type { DeclarationItem } from '../App'
import { IconSearch, IconChevronLeft, IconPlus, IconList } from './Icons'

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-500' },
  processing: { label: 'AI提取中', className: 'bg-sky-50 text-sky-500 animate-pulse' },
  review: { label: '待确认', className: 'bg-amber-50 text-amber-600' },
  done: { label: '已完成', className: 'bg-emerald-50 text-emerald-600' },
  error: { label: '有错误', className: 'bg-red-50 text-red-500' },
}

interface SidebarProps {
  declarations: DeclarationItem[]
  activeId: string | null
  collapsed: boolean
  searchQuery: string
  onSearchChange: (v: string) => void
  onSelect: (id: string) => void
  onToggleCollapse: () => void
  onNewDeclaration: () => void
  onExitDeclaration: () => void
}

export default function Sidebar({
  declarations,
  activeId,
  collapsed,
  searchQuery,
  onSearchChange,
  onSelect,
  onToggleCollapse,
  onNewDeclaration,
  onExitDeclaration,
}: SidebarProps) {
  const isLocked = activeId !== null

  return (
    <aside
      style={{
        width: collapsed ? 48 : 280,
        minWidth: collapsed ? 48 : 280,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="flex flex-col bg-white border-r border-gray-200 z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 font-bold text-lg whitespace-nowrap">
            <div className="w-[34px] h-[34px] rounded-md bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-[15px]">
              D
            </div>
            <span>DeclarAI</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-xs text-muted hover:bg-surface shrink-0"
          title={collapsed ? '展开侧栏' : '折叠侧栏'}
        >
          <span
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s',
              display: 'inline-block',
            }}
          >
            <IconChevronLeft />
          </span>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="px-4 pb-3 shrink-0 relative">
            <span className="absolute left-7 top-1/2 -translate-y-1/2 text-muted">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="搜索申报单..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 pl-8 pr-3 text-[13px] bg-surface outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          {/* List */}
          <div className="px-3 pb-1 text-xs text-muted">
            共 {declarations.length} 份申报单
          </div>
          <div
            className={`flex-1 overflow-y-auto px-3 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isLocked && (
              <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 当前正在编辑中
              </div>
            )}
            {declarations.map((d) => {
              const badge = statusBadge[d.status]
              const isActive = d.id === activeId
              return (
                <div
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={`px-3.5 py-3 rounded-md cursor-pointer transition-all mb-1 border border-transparent ${
                    isActive
                      ? 'bg-primary-50 border-primary-500 shadow-[inset_3px_0_0_#6D5EF7]'
                      : 'hover:bg-surface'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    {d.preEntryNumber || '(未编号)'}
                  </div>
                  <div className="text-xs text-muted mt-1 flex gap-2 items-center">
                    <span>{d.transportName}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              )
            })}
            {declarations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted text-sm gap-2">
                <IconList />
                <span>暂无申报单</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 shrink-0">
            {isLocked ? (
              <button
                onClick={onExitDeclaration}
                className="w-full h-10 rounded-sm border border-gray-200 bg-white text-muted font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 hover:bg-surface transition-all"
              >
                ← 退出当前申报单
              </button>
            ) : (
              <button
                onClick={onNewDeclaration}
                className="w-full h-10 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 hover:bg-primary-600 transition-all"
              >
                <IconPlus /><span>新建申报单</span>
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
