import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../../animations/variants'
import type { DeclarationItem } from '../../App'
import { IconSearch, IconChevronLeft, IconPlus, IconList } from '../shared/Icons'

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
  onDelete,
}: SidebarProps) {
  const isLocked = editingId !== null
  const [typeNames, setTypeNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (window.api?.getSchemaAll) {
      window.api.getSchemaAll().then((configs: any[]) => {
        if (Array.isArray(configs)) {
          const map: Record<string, string> = {}
          for (const c of configs) {
            if (c.type && c.title) map[c.type] = c.title
          }
          setTypeNames(map)
        }
      }).catch(() => {})
    }
  }, [])

  return (
    <aside
      style={{
        width: collapsed ? 0 : 280,
        minWidth: collapsed ? 0 : 280,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
      className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10"
    >
      {/* Header — collapse button + divider */}
      <div className="shrink-0 drag-region sidebar-header">
        <div className="flex items-center justify-end px-4 pt-4 pb-2">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center cursor-pointer text-xs text-muted hover:bg-surface dark:hover:bg-gray-800 shrink-0 no-drag"
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
        <div className="px-4"><div className="h-px bg-gray-200 dark:bg-gray-700" /></div>
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
                className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 pl-8 pr-3 text-[13px] bg-surface outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="px-4 pb-1 text-xs text-muted">
            共 {declarations.length} 份申报单
          </div>
          <div
            className={`flex-1 overflow-y-auto px-4 transition-opacity duration-300 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isLocked && (
              <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 当前正在编辑中
              </div>
            )}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" key={declarations.length}>
            {declarations.map((d, i) => {
              const badge = statusBadge[d.status]
              const isActive = d.id === selectedId
              const isEditing = d.id === editingId
              return (
                <motion.div
                  key={d.id} variants={staggerItem} custom={i}
                  onClick={() => onSelect(d.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.id) } }}
                  tabIndex={0} role="button"
                  className={`px-3.5 py-3 rounded-md cursor-pointer transition-colors mb-1 group relative focus-visible:ring-2 focus-visible:ring-primary-300 dark:focus-visible:ring-primary-600 focus-visible:outline-none ${
                    isEditing
                      ? 'bg-primary-50 ring-1 ring-primary-200'
                      : isActive
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'hover:bg-surface dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{d.displayName}</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {d.type && typeNames[d.type] ? `${typeNames[d.type]} · ` : ''}{d.updatedAt}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                        <span>{d.cargoCount} 行货物</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定删除申报单「${d.displayName}」吗？此操作不可撤销。`)) {
                            onDelete(d.id)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors shrink-0 ml-2 mt-0.5"
                        title="删除申报单"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
            </motion.div>
            {declarations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted text-sm gap-2">
                <IconList />
                <span>暂无申报单</span>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 flex gap-2">
            <div className="flex-1">
              {isLocked ? (
                <button
                  onClick={onExitDeclaration}
                  className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 hover:bg-surface dark:hover:bg-gray-800 transition-colors"
                >
                  ← 退出当前申报单
                </button>
              ) : (
                <button
                  onClick={onNewDeclaration}
                  className="w-full h-10 rounded-md bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors"
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
