import { useState, useEffect, useRef, useCallback } from 'react'

export interface Entry {
  id: string; title: string; content: string; hs_code: string | null
  tags: string; source_type: string; is_pinned: number
  created_at: string; updated_at: string; file_count: number
}
export interface AttachedFile { id?: string; file_name: string; file_path?: string; file_size?: number }
export interface DbTag { name: string; color: string | null }
export interface RelatedEntry { id: string; title: string; hs_code: string; tags: string }

export function parseTags(t: string): string[] {
  try { return JSON.parse(t) } catch { return [] }
}

const api = (window as any).api

export function useKnowledge(onDirtyChange?: (dirty: boolean) => void) {
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
  const [relatedNotes, setRelatedNotes] = useState<RelatedEntry[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [autoSaved, setAutoSaved] = useState(false)
  const savedForm = useRef({ title: '', content: '', tags: '', hs_code: '' })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const tagManagerRef = useRef<HTMLDivElement>(null)

  const isDirty = useCallback(() => {
    const s = savedForm.current
    return form.title !== s.title || form.content !== s.content || form.tags !== s.tags || form.hs_code !== s.hs_code
  }, [form])

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  const loadEntries = useCallback(async (tag?: string, q?: string) => {
    if (!api?.knowledgeList) return
    const list = await api.knowledgeList({ tag, search: q })
    if (Array.isArray(list)) {
      setEntries(list)
      const tagSet = new Set<string>()
      for (const e of list) for (const t of parseTags(e.tags)) tagSet.add(t)
      setAllTags(Array.from(tagSet))
    }
  }, [])

  const loadDbTags = useCallback(async () => {
    if (api?.knowledgeTags) {
      const tags = await api.knowledgeTags()
      if (Array.isArray(tags)) setDbTags(tags)
    }
  }, [])

  useEffect(() => { loadDbTags() }, [loadDbTags])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadEntries(activeTag, search || undefined), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, activeTag, loadEntries])

  // Auto-save: 2s after last edit
  useEffect(() => {
    if (!dirty || !form.title.trim() || !editing) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const tagArr = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      try {
        const res = await api.knowledgeSave({
          id: selectedEntry?.id, title: form.title.trim(), content: form.content,
          tags: JSON.stringify(tagArr), hs_code: form.hs_code.trim() || null,
          is_pinned: selectedEntry?.is_pinned || 0,
        })
        if (res?.success) {
          savedForm.current = { ...form }
          setDirty(false); setAutoSaved(true)
          setTimeout(() => setAutoSaved(false), 1500)
          if (res.id) { setSelectedId(res.id); if (!selectedEntry?.id) await loadEntry(res.id) }
          await loadEntries(activeTag, search || undefined)
        }
      } catch {}
    }, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form, dirty, editing])

  useEffect(() => {
    const s = savedForm.current
    setDirty(form.title !== s.title || form.content !== s.content || form.tags !== s.tags || form.hs_code !== s.hs_code)
  }, [form])

  useEffect(() => {
    if (selectedEntry?.hs_code && api?.knowledgeRelated) {
      api.knowledgeRelated(selectedEntry.hs_code).then((related: RelatedEntry[]) => {
        if (Array.isArray(related)) setRelatedNotes(related.filter((r: RelatedEntry) => r.id !== selectedEntry.id))
      }).catch(() => setRelatedNotes([]))
    } else { setRelatedNotes([]) }
  }, [selectedEntry?.hs_code, selectedEntry?.id])

  const loadEntry = async (id: string) => {
    if (!api?.knowledgeGet) return
    const entry = await api.knowledgeGet(id)
    setSelectedEntry(entry)
    const f = { title: entry.title, content: entry.content, tags: parseTags(entry.tags).join(', '), hs_code: entry.hs_code || '' }
    setForm(f); savedForm.current = f
    if (api?.knowledgeFilesList) {
      const fl = await api.knowledgeFilesList(id)
      if (Array.isArray(fl)) setFiles(fl); else setFiles([])
    }
    setDirty(false)
  }

  const confirmDiscard = (): boolean => {
    if (!isDirty()) return true
    return confirm('你有未保存的更改，确定要离开吗？')
  }

  const handleSelect = (id: string) => {
    if (!confirmDiscard()) return
    setSelectedId(id); setEditing(false); loadEntry(id)
  }

  const handleNew = () => {
    if (!confirmDiscard()) return
    setSelectedId(null); setSelectedEntry(null); setEditing(true)
    const f = { title: '', content: '', tags: '', hs_code: '' }
    setForm(f); savedForm.current = f; setFiles([])
    setDirty(false); setRelatedNotes([])
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
        savedForm.current = { ...form }
        await loadEntries(activeTag, search || undefined)
        setEditing(false); setDirty(false)
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
      setSelectedId(null); setSelectedEntry(null); setDirty(false); setRelatedNotes([])
      await loadEntries(activeTag, search || undefined)
    }
  }

  const ensureEntry = async (): Promise<string | null> => {
    if (selectedEntry?.id) return selectedEntry.id
    let title = form.title.trim()
    if (!title) {
      const unnamed = entries.filter(e => /^未命名\d*$/.test(e.title))
      if (unnamed.length === 0) { title = '未命名' }
      else {
        const nums = unnamed.map(e => { const m = e.title.match(/^未命名(\d+)$/); return m ? parseInt(m[1]) : 0 })
        title = `未命名${Math.max(...nums, 0) + 1}`
      }
      setForm(prev => ({ ...prev, title }))
    }
    const tagArr = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    const res = await api.knowledgeSave({
      title, content: form.content, tags: JSON.stringify(tagArr), hs_code: form.hs_code.trim() || null,
    })
    if (!res?.success || !res.id) return null
    savedForm.current = { ...form, title }
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
    const newContent = form.content ? form.content + '\n' + mdLink : mdLink
    setForm(prev => ({ ...prev, content: newContent }))
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
    setForm(prev => ({ ...prev, tags: value }))
    const parts = value.split(/[,，]/)
    const lastPart = parts[parts.length - 1].trim().toLowerCase()
    if (lastPart.length > 0) {
      const existing = parts.map(p => p.trim())
      const matches = dbTags
        .filter(t => t.name.toLowerCase().includes(lastPart) && !existing.includes(t.name))
        .map(t => t.name).slice(0, 5)
      setTagSuggestions(matches)
      setShowTagSuggestions(matches.length > 0)
    } else { setShowTagSuggestions(false) }
  }

  const insertTagSuggestion = (tag: string) => {
    const parts = form.tags.split(/[,，]/).map(t => t.trim())
    parts[parts.length - 1] = tag
    setForm(prev => ({ ...prev, tags: parts.join(', ') }))
    setShowTagSuggestions(false)
    tagInputRef.current?.focus()
  }

  const handleToggleEditing = (enter: boolean) => {
    if (!enter && isDirty()) {
      if (!confirm('你有未保存的更改，确定要离开编辑模式吗？')) return
    }
    setEditing(enter)
    if (!enter) setDirty(false)
  }

  const handleAddDbTag = async () => {
    if (!newTagName.trim() || !api?.knowledgeTagAdd) return
    await api.knowledgeTagAdd(newTagName.trim())
    setNewTagName('')
    await loadDbTags()
  }

  const handleDeleteDbTag = async (name: string) => {
    if (!api?.knowledgeTagDelete) return
    await api.knowledgeTagDelete(name)
    await loadDbTags()
  }

  return {
    entries, selectedId, selectedEntry, search, setSearch, activeTag, setActiveTag, allTags,
    editing, form, setForm, saving, files, linkUrl, setLinkUrl, linkTitle, setLinkTitle,
    dragOver, setDragOver, dirty, dbTags, tagSuggestions, showTagSuggestions,
    relatedNotes, showTagManager, setShowTagManager, newTagName, setNewTagName, autoSaved,
    tagInputRef, tagDropdownRef, tagManagerRef,
    handleSelect, handleNew, handleSave, handleDelete, handleFilePick, handleDrop,
    handleAddLink, handleRemoveFile, handleOpenFile, togglePin,
    handleTagInputChange, insertTagSuggestion, handleToggleEditing,
    handleAddDbTag, handleDeleteDbTag, loadEntries,
    savedForm,
  }
}
