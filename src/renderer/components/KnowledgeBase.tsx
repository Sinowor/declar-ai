import { useState, useEffect } from 'react'

interface Entry {
  id: string; title: string; content: string; hs_code: string | null
  tags: string; source_type: string; is_pinned: number
  created_at: string; updated_at: string
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}小时前`
  return `${Math.floor(hr / 24)}天前`
}

function parseTags(t: string): string[] {
  try { return JSON.parse(t) } catch { return [] }
}

export default function KnowledgeBase({ sidebarCollapsed, onToggleSidebar }: { sidebarCollapsed: boolean; onToggleSidebar: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', hs_code: '', tags: '' })
  const [saved, setSaved] = useState(false)

  const api = (window as any).api

  const loadEntries = async (tag?: string, q?: string) => {
    if (!api?.knowledgeList) return
    const list = await api.knowledgeList({ tag, search: q })
    if (Array.isArray(list)) setEntries(list)
  }

  useEffect(() => { loadEntries(activeTag, search || undefined) }, [activeTag, search])
  useEffect(() => { api?.knowledgeTags?.().then((t: any[]) => { if (Array.isArray(t)) setTags(t.map(x => x.name)) }).catch(() => {}) }, [])

  const loadEntry = async (id: string) => {
    if (!api?.knowledgeGet) return
    const entry = await api.knowledgeGet(id)
    setSelectedEntry(entry)
    setForm({ title: entry.title, content: entry.content, hs_code: entry.hs_code || '', tags: (parseTags(entry.tags)).join(', ') })
  }

  const handleSelect = (id: string) => {
    setSelectedId(id); setEditing(false); setPreview(true); loadEntry(id)
  }

  const handleNew = () => {
    setSelectedId(null); setSelectedEntry(null); setEditing(true); setPreview(false)
    setForm({ title: '', content: '', hs_code: '', tags: '' })
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const tagArr = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    if (api?.knowledgeSave) {
      const res = await api.knowledgeSave({
        id: selectedEntry?.id, title: form.title.trim(), content: form.content,
        hs_code: form.hs_code.trim() || undefined, tags: JSON.stringify(tagArr),
      })
      if (res.success) {
        loadEntries(activeTag, search || undefined)
        setEditing(false); setPreview(true); setSaved(true); setTimeout(() => setSaved(false), 1500)
        if (res.id && !selectedEntry) { setSelectedId(res.id); loadEntry(res.id) }
        else if (selectedEntry) loadEntry(selectedEntry.id)
      }
    }
  }

  const handleDelete = async () => {
    if (!selectedEntry || !confirm('确定删除这条笔记？')) return
    if (api?.knowledgeDelete) { await api.knowledgeDelete(selectedEntry.id); setSelectedId(null); setSelectedEntry(null); loadEntries(activeTag, search || undefined) }
  }

  const renderMd = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-[22px] font-bold mt-6 mb-3">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="text-[17px] font-semibold mt-5 mb-2">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="text-[14px] font-semibold mt-4 mb-1.5">{line.slice(4)}</h3>
      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-[14px] leading-relaxed list-disc">{line.slice(2)}</li>
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-primary-300 dark:border-primary-700 pl-3 text-[13px] text-muted italic my-2">{line.slice(2)}</blockquote>
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-[14px] leading-relaxed">{line}</p>
    })
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <aside style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}
        className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">
        <div className="px-4 pt-4 pb-3 drag-region">
          <div className="text-[15px] font-semibold">知识库</div>
        </div>
        <div className="px-4 pb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索笔记..."
            className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] outline-none focus:border-primary-500 bg-surface dark:bg-gray-800 font-sans" />
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          <button onClick={() => setActiveTag('')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border transition-colors ${!activeTag ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>全部</button>
          {tags.map(t => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? '' : t)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border transition-colors ${activeTag === t ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>{t}</button>
          ))}
        </div>
        <button onClick={handleNew}
          className="mx-4 mb-3 h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors">+ 新建笔记</button>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-muted">暂无笔记</div>
          ) : (
            <div className="space-y-0.5">
              {entries.map(e => (
                <button key={e.id} onClick={() => handleSelect(e.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg cursor-pointer border-none transition-colors ${selectedId === e.id ? 'bg-surface dark:bg-gray-800' : 'bg-transparent hover:bg-surface dark:hover:bg-gray-800'}`}>
                  <div className="text-[13px] font-medium truncate">{e.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.hs_code && <span className="text-[10px] font-mono text-primary-500">{e.hs_code}</span>}
                    {parseTags(e.tags).slice(0, 2).map(t => <span key={t} className="text-[10px] text-muted">{t}</span>)}
                    <span className="text-[10px] text-muted/60 ml-auto">{timeAgo(e.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto flex flex-col bg-surface">
        {!selectedEntry && !editing ? (
          <div className="flex-1 flex items-center justify-center text-muted">
            <div className="text-center -mt-10">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-3 opacity-20">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <div className="text-[15px] font-medium">选择或创建笔记</div>
              <div className="text-[13px] mt-1">点击左侧「新建笔记」开始记录</div>
            </div>
          </div>
        ) : (
          <>
            {/* Metadata bar */}
            <div className="px-8 pt-6 pb-4 drag-region flex items-center justify-between">
              <div className="flex items-center gap-3 text-[12px] text-muted">
                {selectedEntry?.hs_code && <span className="font-mono text-primary-500">{selectedEntry.hs_code}</span>}
                {selectedEntry && <span>{parseTags(selectedEntry.tags).join(' · ') || '未分类'}</span>}
                {selectedEntry && <span>{timeAgo(selectedEntry.updated_at)}</span>}
              </div>
              <div className="flex items-center gap-2 no-drag">
                <button onClick={() => { setEditing(true); setPreview(false) }}
                  className={`h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border transition-colors ${!editing ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>编辑</button>
                <button onClick={() => { setEditing(false); setPreview(true) }}
                  className={`h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border transition-colors ${!editing ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>预览</button>
              </div>
            </div>

            {editing ? (
              /* Edit mode */
              <div className="px-8 pb-12 flex-1 space-y-3">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="标题"
                  className="w-full text-[22px] font-bold outline-none border-none bg-transparent text-ink" />
                <div className="flex gap-3">
                  <input value={form.hs_code} onChange={e => setForm({ ...form, hs_code: e.target.value })} placeholder="HS 编码 (可选)"
                    className="w-40 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] font-mono outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
                  <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="标签，逗号分隔"
                    className="flex-1 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
                </div>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Markdown 正文..."
                  className="w-full flex-1 min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-4 text-[14px] leading-relaxed outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleSave}
                    className="h-8 px-5 rounded-sm text-white border-none font-semibold text-xs cursor-pointer bg-primary-500 hover:bg-primary-600 active:scale-[0.97] transition-colors">{saved ? '已保存' : '保存'}</button>
                  {selectedEntry && <button onClick={handleDelete}
                    className="h-8 px-3 rounded-sm text-xs cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-red-500 transition-colors">删除</button>}
                </div>
              </div>
            ) : (
              /* Preview mode */
              <div className="px-8 pb-12 flex-1 max-w-[800px]">
                {selectedEntry && (
                  <>
                    <h1 className="text-[26px] font-bold tracking-tight mb-6">{selectedEntry.title}</h1>
                    <div className="prose">{renderMd(selectedEntry.content)}</div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
