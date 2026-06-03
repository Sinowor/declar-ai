import { useState } from 'react'
import type { DeclarationItem } from '../App'
import Logo from './Logo'
import ThemeColorPicker from './ThemeColorPicker'
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
  selectedId: string | null
  editingId: string | null
  collapsed: boolean
  searchQuery: string
  onSearchChange: (v: string) => void
  onSelect: (id: string) => void
  onToggleCollapse: () => void
  onNewDeclaration: () => void
  onExitDeclaration: () => void
  onShowAbout: () => void
  onDelete: (id: string) => void
}

export default function Sidebar({
  declarations,
  selectedId,
  editingId,
  collapsed,
  searchQuery,
  onSearchChange,
  onSelect,
  onToggleCollapse,
  onNewDeclaration,
  onExitDeclaration,
  onShowAbout,
  onDelete,
}: SidebarProps) {
  const isLocked = editingId !== null
  const [showSettings, setShowSettings] = useState(false)

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
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 drag-region sidebar-header">
        {!collapsed && (
          <div className="flex items-center gap-2.5 font-bold text-lg whitespace-nowrap">
            <Logo size={34} />
            <span>DeclarAI</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-xs text-muted hover:bg-surface shrink-0 no-drag"
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
          <div className="px-4 pb-3 shrink-0">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted flex items-center justify-center pointer-events-none">
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
              const isActive = d.id === selectedId
              const isEditing = d.id === editingId
              return (
                <div
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={`px-3.5 py-3 rounded-md cursor-pointer transition-all mb-1 group relative ${
                    isEditing
                      ? 'bg-primary-50 ring-1 ring-primary-200'
                      : isActive
                        ? 'bg-gray-100'
                        : 'hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm min-w-0 flex-1">
                      {d.displayNumber || d.preEntryNumber || '(未编号)'}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定删除申报单「${d.displayNumber || d.preEntryNumber || '未编号'}」吗？此操作不可撤销。`)) {
                            onDelete(d.id)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all shrink-0 ml-2"
                        title="删除申报单"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1 flex gap-2 items-center">
                    {d.preEntryNumber && d.displayNumber !== d.preEntryNumber && (
                      <span className="text-[10px] text-muted opacity-60">预录入: {d.preEntryNumber}</span>
                    )}
                    <span>{d.transportName}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
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

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-4 pb-3 border-t border-gray-200 pt-3">
              <ThemeColorPicker />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={onShowAbout}
                  className="flex-1 h-8 rounded-sm border border-gray-200 bg-white text-xs text-muted font-medium cursor-pointer hover:bg-surface transition-all"
                >
                  关于 DeclarAI
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 shrink-0 flex gap-2">
            {!isLocked && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`w-10 h-10 rounded-sm border border-gray-200 flex items-center justify-center cursor-pointer transition-all shrink-0 ${showSettings ? 'bg-primary-50 border-primary-500 text-primary-500' : 'bg-white text-muted hover:bg-surface'}`}
                title="系统设置"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
            <div className="flex-1">
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
          </div>
        </>
      )}
    </aside>
  )
}
