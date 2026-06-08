import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

interface Entry {
  id: string; title: string; content: string; hs_code: string | null
  tags: string; source_type: string; is_pinned: number
  created_at: string; updated_at: string
}
interface AttachedFile { id?: string; file_name: string; file_path?: string }
interface DbTag { name: string; color: string | null }

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

export default function KnowledgeBase({ sidebarCollapsed, onToggleSidebar, onDirtyChange }: {
  sidebarCollapsed: boolean; onToggleSidebar: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', tags: '', hs_code: '' })
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [dbTags, setDbTags] = useState<DbTag[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const api = (window as any).api

  const loadEntries = useCallback(async (tag?: string, q?: string) => {
    if (!api?.knowledgeList) return
    const list = await api.knowledgeList({ tag, search: q })
    if (Array.isArray(list)) {
      setEntries(list)
      const tagSet = new Set<string>()
      for (const e of list) {
        for (const t of parseTags(e.tags)) tagSet.add(t)
      }
      setAllTags(Array.from(tagSet))
    }
  }, [])

  // Load DB tags on mount
  useEffect(() => {
    if (api?.knowledgeTags) {
      api.knowledgeTags().then((tags: DbTag[]) => { if (Array.isArray(tags)) setDbTags(tags) }).catch(() => {})
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadEntries(activeTag, search || undefined), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, activeTag, loadEntries])

  // Propagate dirty state to parent
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const loadEntry = async (id: string) => {
    if (!api?.knowledgeGet) return
    const entry = await api.knowledgeGet(id)
    setSelectedEntry(entry)
    setForm({ title: entry.title, content: entry.content, tags: parseTags(entry.tags).join(', '), hs_code: entry.hs_code || '' })
    if (api?.knowledgeFilesList) {
      const fl = await api.knowledgeFilesList(id)
      if (Array.isArray(fl)) setFiles(fl)
      else setFiles([])
    }
    setDirty(false)
  }

  const confirmDiscard = (): boolean => {
    if (!dirty) return true
    return confirm('你有未保存的更改，确定要离开吗？')
  }

  const handleSelect = (id: string) => {
    if (!confirmDiscard()) return
    setSelectedId(id); setEditing(false); loadEntry(id)
  }

  const handleNew = () => {
    if (!confirmDiscard()) return
    setSelectedId(null); setSelectedEntry(null); setEditing(true)
    setForm({ title: '', content: '', tags: '', hs_code: '' }); setFiles([])
    setDirty(false)
  }

  const markDirty = (patch: typeof form) => {
    setForm(patch)
    setDirty(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const tagArr = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    try {
      const res = await api.knowledgeSave({
        id: selectedEntry?.id, title: form.title.trim(), content: form.content,
        tags: JSON.stringify(tagArr), hs_code: form.hs_code.trim() || null,
        is_pinned: selectedEntry?.is_pinned || 0,
      })
      if (res?.success) {
        await loadEntries(activeTag, search || undefined)
        setEditing(false)
        setDirty(false)
        if (res.id) { setSelectedId(res.id); await loadEntry(res.id) }
        else if (selectedEntry) await loadEntry(selectedEntry.id)
      }
    } catch (e) { console.error('Save failed:', e) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!selectedEntry || !confirm('确定删除这条笔记？')) return
    if (api?.knowledgeDelete) {
      await api.knowledgeDelete(selectedEntry.id)
      setSelectedId(null); setSelectedEntry(null); setDirty(false)
      await loadEntries(activeTag, search || undefined)
    }
  }

  const ensureEntry = async (): Promise<string | null> => {
    if (selectedEntry?.id) return selectedEntry.id
    let title = form.title.trim()
    if (!title) {
      const unnamed = entries.filter(e => /^未命名\d*$/.test(e.title))
      if (unnamed.length === 0) {
        title = '未命名'
      } else {
        const nums = unnamed.map(e => {
          const m = e.title.match(/^未命名(\d+)$/)
          return m ? parseInt(m[1]) : 0
        })
        title = `未命名${Math.max(...nums, 0) + 1}`
      }
      setForm(prev => ({ ...prev, title }))
    }
    const tagArr = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    const res = await api.knowledgeSave({
      title, content: form.content,
      tags: JSON.stringify(tagArr), hs_code: form.hs_code.trim() || null,
    })
    if (!res?.success || !res.id) return null
    setSelectedId(res.id); setDirty(false)
    await loadEntry(res.id)
    await loadEntries(activeTag, search || undefined)
    return res.id
  }

  const handleFilePick = async () => {
    if (!api?.knowledgeFileAdd) return
    const entryId = await ensureEntry()
    if (!entryId) return
    const imported = await api.knowledgeFileAdd(entryId)
    if (Array.isArray(imported)) setFiles(prev => [...prev, ...imported])
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (!api?.getFilePath || !api?.knowledgeFileAddByPaths) return
    const entryId = await ensureEntry()
    if (!entryId) return
    const paths: string[] = []
    for (const f of Array.from(e.dataTransfer.files)) {
      try { const p = api.getFilePath(f); if (p) paths.push(p) } catch { console.warn('Failed to get file path for dropped file:', f.name) }
    }
    if (paths.length > 0) {
      const imported = await api.knowledgeFileAddByPaths(entryId, paths)
      if (Array.isArray(imported)) setFiles(prev => [...prev, ...imported])
    }
  }

  const handleAddLink = () => {
    if (!linkUrl.trim()) return
    const mdLink = linkTitle.trim() ? `[${linkTitle.trim()}](${linkUrl.trim()})` : linkUrl.trim()
    setForm(prev => ({ ...prev, content: prev.content ? prev.content + '\n' + mdLink : mdLink }))
    setDirty(true)
    setLinkUrl(''); setLinkTitle('')
  }

  const handleRemoveFile = async (idx: number) => {
    const f = files[idx]
    if (f.id && api?.knowledgeFileDelete) await api.knowledgeFileDelete(f.id)
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleOpenFile = (fileId?: string) => {
    if (fileId && api?.knowledgeFileOpen) api.knowledgeFileOpen(fileId)
  }

  const togglePin = async (entry: Entry) => {
    const newPinned = entry.is_pinned ? 0 : 1
    await api.knowledgeSave({
      id: entry.id, title: entry.title, content: entry.content,
      tags: entry.tags, hs_code: entry.hs_code, is_pinned: newPinned,
    })
    await loadEntries(activeTag, search || undefined)
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry({ ...selectedEntry, is_pinned: newPinned })
    }
  }

  const handleTagInputChange = (value: string) => {
    setForm({ ...form, tags: value })
    setDirty(true)
    // Show suggestions based on last partial tag
    const parts = value.split(/[,，]/)
    const lastPart = parts[parts.length - 1].trim().toLowerCase()
    if (lastPart.length > 0) {
      const matches = dbTags
        .filter(t => t.name.toLowerCase().includes(lastPart) && !parts.map(p => p.trim()).includes(t.name))
        .map(t => t.name)
        .slice(0, 5)
      setTagSuggestions(matches)
      setShowTagSuggestions(matches.length > 0)
    } else {
      setShowTagSuggestions(false)
    }
  }

  const insertTagSuggestion = (tag: string) => {
    const parts = form.tags.split(/[,，]/).map(t => t.trim())
    parts[parts.length - 1] = tag
    const newTags = parts.join(', ')
    setForm({ ...form, tags: newTags })
    setDirty(true)
    setShowTagSuggestions(false)
    tagInputRef.current?.focus()
  }

  const handleToggleEditing = (enter: boolean) => {
    if (!enter && dirty) {
      if (!confirm('你有未保存的更改，确定要离开编辑模式吗？')) return
    }
    setEditing(enter)
    if (!enter) setDirty(false)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <aside style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}
        className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">
        <div className="px-4 pt-4 pb-3 drag-region"><div className="text-[15px] font-semibold">知识库</div></div>
        <div className="px-4 pb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索笔记..."
            className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] outline-none focus:border-primary-500 bg-surface dark:bg-gray-800 font-sans" />
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          <button onClick={() => setActiveTag('')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border transition-colors ${!activeTag ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>全部</button>
          {allTags.map(t => (
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg cursor-pointer border-none transition-colors group ${selectedId === e.id ? 'bg-surface dark:bg-gray-800' : 'bg-transparent hover:bg-surface dark:hover:bg-gray-800'}`}>
                  <div className="flex items-center gap-1.5">
                    {e.is_pinned ? <span className="text-[10px] shrink-0">📌</span> : null}
                    <div className="text-[13px] font-medium truncate flex-1">{e.title}</div>
                    <button onClick={(ev) => { ev.stopPropagation(); togglePin(e); }}
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
            <div className="px-8 pt-6 pb-4 drag-region flex items-center justify-between">
              <div className="flex items-center gap-3 text-[12px] text-muted">
                {selectedEntry && (
                  <button onClick={() => selectedEntry && togglePin(selectedEntry)}
                    className="cursor-pointer text-[13px] hover:scale-110 transition-transform"
                    title={selectedEntry?.is_pinned ? '取消置顶' : '置顶'}>
                    {selectedEntry?.is_pinned ? '📌' : '📍'}
                  </button>
                )}
                {selectedEntry && <span>{parseTags(selectedEntry.tags).join(' · ') || '未分类'}</span>}
                {selectedEntry?.hs_code && <span className="font-mono text-[11px] bg-surface dark:bg-gray-800 px-1.5 py-0.5 rounded">HS: {selectedEntry.hs_code}</span>}
                {selectedEntry && <span>{timeAgo(selectedEntry.updated_at)}</span>}
              </div>
              <div className="flex items-center gap-2 no-drag">
                <button onClick={() => handleToggleEditing(true)}
                  className={`h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border transition-colors ${editing ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>编辑</button>
                <button onClick={() => handleToggleEditing(false)}
                  className={`h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border transition-colors ${!editing ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'}`}>预览</button>
              </div>
            </div>

            {editing ? (
              <div className="px-8 pb-12 flex-1 space-y-3">
                <input value={form.title} onChange={e => markDirty({ ...form, title: e.target.value })} placeholder="标题"
                  className="w-full text-[22px] font-bold outline-none border-none bg-transparent text-ink placeholder:text-muted" />
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input ref={tagInputRef} value={form.tags} onChange={e => handleTagInputChange(e.target.value)}
                      onFocus={() => { const parts = form.tags.split(/[,，]/); const last = parts[parts.length - 1].trim(); if (last) handleTagInputChange(form.tags) }}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                      placeholder="标签，逗号分隔（如：归类经验, 口岸须知）"
                      className="w-full h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
                    {showTagSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 overflow-hidden">
                        {tagSuggestions.map(t => (
                          <button key={t} onMouseDown={e => { e.preventDefault(); insertTagSuggestion(t) }}
                            className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface dark:hover:bg-gray-700 cursor-pointer transition-colors">{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={form.hs_code} onChange={e => markDirty({ ...form, hs_code: e.target.value })} placeholder="HS编码（可选）"
                    className="w-40 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-mono" />
                </div>
                <textarea value={form.content} onChange={e => markDirty({ ...form, content: e.target.value })} placeholder="输入正文（支持 Markdown）..."
                  className="w-full flex-1 min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-[14px] leading-relaxed outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans resize-y" />

                {/* File attachments */}
                <div>
                  <div className="text-[11px] font-medium text-muted mb-2">附件 · 拖拽文件到此处</div>
                  <div className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}>
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                          <span className="cursor-pointer hover:text-primary-500 hover:underline" onClick={() => handleOpenFile(f.id)}>{f.file_name}</span>
                          <button onClick={() => handleRemoveFile(i)} className="text-muted hover:text-red-500 cursor-pointer text-xs leading-none">×</button>
                        </span>
                      ))}
                      {files.length === 0 && <span className="text-[12px] text-muted/50">拖拽文件到此处，或点击按钮选择</span>}
                    </div>
                  </div>
                  <button onClick={handleFilePick}
                    className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink transition-colors">+ 添加附件</button>
                </div>

                {/* Link input */}
                <div>
                  <div className="text-[11px] font-medium text-muted mb-2">添加链接</div>
                  <div className="flex gap-2">
                    <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="链接标题"
                      className="w-32 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
                    <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                      className="flex-1 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }} />
                    <button onClick={handleAddLink}
                      className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink transition-colors shrink-0">添加</button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="h-8 px-5 rounded-sm text-white border-none font-semibold text-xs cursor-pointer bg-primary-500 hover:bg-primary-600 active:scale-[0.97] transition-colors disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                  {selectedEntry && <button onClick={handleDelete}
                    className="h-8 px-3 rounded-sm text-xs cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-red-500 transition-colors">删除</button>}
                </div>
              </div>
            ) : (
              <div className="px-8 pb-12 flex-1 max-w-[800px]">
                {selectedEntry && (
                  <>
                    <h1 className="text-[26px] font-bold tracking-tight mb-6">{selectedEntry.title}</h1>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">附件 ({files.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {files.map((f, i) => (
                            <span key={i} onClick={() => handleOpenFile(f.id)}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-700 hover:underline transition-colors">
                              {f.file_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
