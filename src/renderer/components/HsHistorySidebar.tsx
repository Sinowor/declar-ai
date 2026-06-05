import { useState } from 'react'

interface HsHistoryItem {
  id: string
  product_description: string
  hs_code: string | null
  confidence: string | null
  created_at: string
}

interface Props {
  items: HsHistoryItem[]
  onSelect: (item: any) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  return `${Math.floor(hr / 24)} 天前`
}

export default function HsHistorySidebar({ items, onSelect, collapsed, onToggleCollapse }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? items.filter(i =>
        i.product_description.toLowerCase().includes(search.toLowerCase()) ||
        (i.hs_code || '').includes(search)
      )
    : items

  return (
    <aside
      style={{
        width: collapsed ? 0 : 280,
        minWidth: collapsed ? 0 : 280,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
      className="flex flex-col bg-white dark:bg-gray-900 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 drag-region">
        <div className="text-sm font-semibold whitespace-nowrap">归类历史 · {items.length}</div>
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center cursor-pointer text-xs text-muted hover:bg-surface dark:hover:bg-gray-800 shrink-0 no-drag"
          title="折叠侧栏" aria-label="折叠侧栏"
        >
          <span style={{ transform: 'rotate(180deg)', display: 'inline-block', transition: 'transform 0.25s' }}>◂</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted flex items-center justify-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            placeholder="搜索商品或HS编码..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 pl-8 pr-3 text-[13px] bg-surface dark:bg-gray-800 outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-colors font-sans"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted text-sm gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>{search ? '无匹配结果' : '暂无归类记录'}</span>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer bg-transparent hover:bg-surface dark:hover:bg-gray-800 transition-colors border-none"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.confidence === 'high' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{item.product_description}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    <span className="font-mono text-primary-500">{item.hs_code || '—'}</span>
                    <span className="mx-1.5">·</span>
                    {timeAgo(item.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
