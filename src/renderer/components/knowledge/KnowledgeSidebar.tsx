import type { Entry, DbTag } from '../../hooks/useKnowledge'
import { parseTags } from '../../hooks/useKnowledge'

interface Props {
  sidebarCollapsed: boolean
  entries: Entry[]
  selectedId: string | null
  search: string
  onSearchChange: (v: string) => void
  activeTag: string
  onActiveTagChange: (v: string) => void
  allTags: string[]
  showTagManager: boolean
  onToggleTagManager: () => void
  newTagName: string
  onNewTagNameChange: (v: string) => void
  dbTags: DbTag[]
  onAddDbTag: () => void
  onDeleteDbTag: (name: string) => void
  onSelect: (id: string) => void
  onNew: () => void
  onTogglePin: (entry: Entry) => void
  tagManagerRef: React.RefObject<HTMLDivElement | null>
}

export default function KnowledgeSidebar({
  sidebarCollapsed, entries, selectedId, search, onSearchChange,
  activeTag, onActiveTagChange, allTags,
  showTagManager, onToggleTagManager, newTagName, onNewTagNameChange,
  dbTags, onAddDbTag, onDeleteDbTag,
  onSelect, onNew, onTogglePin, tagManagerRef,
}: Props) {
  return (
    <aside style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}
      className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">
      <div className="px-4 pt-4 pb-3 drag-region"><div className="text-[15px] font-semibold">知识库</div></div>
      <div className="px-4 pb-3">
        <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="搜索笔记..."
          className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans placeholder:text-muted/50" />
      </div>
      <div className="px-4 pb-2 max-h-[72px] overflow-y-auto flex flex-wrap gap-1">
        <button onClick={() => onActiveTagChange('')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border transition-colors shrink-0 ${!activeTag ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>全部</button>
        {allTags.map(t => (
          <button key={t} onClick={() => onActiveTagChange(activeTag === t ? '' : t)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border transition-colors shrink-0 ${activeTag === t ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>{t}</button>
        ))}
        <div className="relative shrink-0" ref={tagManagerRef}>
          <button onClick={onToggleTagManager}
            className="px-2 py-0.5 rounded text-[11px] text-muted cursor-pointer border border-dashed border-gray-200 dark:border-gray-700 hover:text-ink hover:border-gray-400 transition-colors"
            title="管理标签">+</button>
          {showTagManager && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 p-2.5">
              <div className="flex gap-1 mb-2">
                <input value={newTagName} onChange={e => onNewTagNameChange(e.target.value)} placeholder="新标签名"
                  className="flex-1 h-6 rounded border border-gray-200 dark:border-gray-700 px-2 text-[11px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800"
                  onKeyDown={e => { if (e.key === 'Enter') onAddDbTag() }} />
                <button onClick={onAddDbTag}
                  className="h-6 px-2 rounded text-[10px] font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 transition-colors shrink-0">添加</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {dbTags.length === 0 && <span className="text-[10px] text-muted/50">暂无预设标签</span>}
                {dbTags.map(t => (
                  <span key={t.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-surface dark:bg-gray-700 border border-gray-200 dark:border-gray-600 group">
                    {t.name}
                    <button onClick={() => onDeleteDbTag(t.name)}
                      className="text-muted hover:text-red-500 cursor-pointer leading-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button onClick={onNew}
        className="mx-4 mb-3 h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors">+ 新建笔记</button>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-muted">暂无笔记</div>
        ) : (
          <div className="space-y-0.5">
            {entries.map(e => (
              <button key={e.id} onClick={() => onSelect(e.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg cursor-pointer border-none transition-colors group ${selectedId === e.id ? 'bg-surface dark:bg-gray-800' : 'bg-transparent hover:bg-surface dark:hover:bg-gray-800'}`}>
                <div className="flex items-center gap-1.5">
                  {e.is_pinned ? <span className="text-[10px] shrink-0">📌</span> : null}
                  <div className="text-[13px] font-medium truncate flex-1">{e.title}</div>
                  {e.file_count > 0 && <span className="text-[10px] text-muted/40 shrink-0" title={`${e.file_count} 个附件`}>📎</span>}
                  <button onClick={(ev) => { ev.stopPropagation(); onTogglePin(e) }}
                    className="opacity-0 group-hover:opacity-100 text-[11px] text-muted hover:text-amber-500 cursor-pointer shrink-0 transition-opacity"
                    title={e.is_pinned ? '取消置顶' : '置顶'}>📌</button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {parseTags(e.tags).map(t => <span key={t} className="text-[10px] text-muted bg-surface dark:bg-gray-800 px-1 rounded">{t}</span>)}
                  <span className="text-[10px] text-muted/50 ml-auto">{timeAgo(e.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}小时前`
  return `${Math.floor(hr / 24)}天前`
}
