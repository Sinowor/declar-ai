import { useState, useEffect, useRef, useCallback } from 'react'
import { IconDocument } from './Icons'

interface FileEntry {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  category: 'uploaded' | 'generated'
  tags: string | null  // JSON array string
  purpose: string | null
  output_type: string | null
  created_at: string
}

interface Props {
  declarationId: string
  refreshKey?: number
}

const TAG_OPTIONS = ['箱单', '发票', '合同', '提单', '运单', '原产地证', '报关单', '其他']

function parseTags(raw: string | null): string[] {
  if (!raw) return ['其他']
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length > 0 ? arr : ['其他']
  } catch {
    return ['其他']
  }
}

function fileTypeIcon(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'PDF', xlsx: 'XLS', xls: 'XLS', docx: 'DOC', doc: 'DOC',
    txt: 'TXT', csv: 'CSV', zip: 'ZIP', jpg: 'IMG', jpeg: 'IMG', png: 'IMG',
  }
  return map[ext.toLowerCase()] || 'FILE'
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

export default function AttachmentPanel({ declarationId, refreshKey }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editFileId, setEditFileId] = useState<string | null>(null)
  const [customTag, setCustomTag] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const loadFiles = useCallback(async () => {
    if (!window.api?.listAllFiles) return
    setLoading(true)
    try {
      const result = await window.api.listAllFiles(declarationId)
      if (Array.isArray(result)) { setFiles(result); setError(false) }
    } catch { setError(true) } finally {
      setLoading(false)
    }
  }, [declarationId])

  useEffect(() => { loadFiles() }, [loadFiles, refreshKey])

  // Close popover on outside click
  useEffect(() => {
    if (!editFileId) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditFileId(null)
        setCustomTag('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editFileId])

  const handleUpdateTags = async (fileId: string, tags: string[]) => {
    if (tags.length === 0) return
    if (window.api?.updateFileTags) {
      await window.api.updateFileTags(fileId, tags)
    }
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, tags: JSON.stringify(tags) } : f))
  }

  const addTag = async (fileId: string, tag: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    const currentTags = parseTags(file.tags)
    if (currentTags.length >= 2) return
    if (currentTags.includes(tag)) return
    const newTags = [...currentTags, tag]
    await handleUpdateTags(fileId, newTags)
    setEditFileId(null)
    setCustomTag('')
  }

  const removeTag = async (fileId: string, tag: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    const currentTags = parseTags(file.tags)
    if (currentTags.length <= 1) return
    await handleUpdateTags(fileId, currentTags.filter(t => t !== tag))
  }

  const handleCustomTag = async (fileId: string) => {
    if (!customTag.trim()) return
    await addTag(fileId, customTag.trim())
  }

  const handleOpen = async (fileId: string) => {
    if (window.api?.openFile) {
      const res = await window.api.openFile(fileId)
      if (!res.success) console.warn('Open file failed:', res.error)
    }
  }

  const handleReveal = async (fileId: string) => {
    if (window.api?.revealFile) {
      const res = await window.api.revealFile(fileId)
      if (!res.success) console.warn('Reveal file failed:', res.error)
    }
  }

  const uploadedFiles = files.filter(f => f.category === 'uploaded')
  const generatedFiles = files.filter(f => f.category === 'generated')

  const renderTagChips = (file: FileEntry) => {
    const tags = parseTags(file.tags)
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {tags.map(tag => (
          <span key={tag}
            onClick={(e) => {
              e.stopPropagation()
              setEditFileId(editFileId === file.id ? null : file.id)
              setCustomTag('')
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors select-none"
          >
            {tag}
            {tags.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTag(file.id, tag) }}
                className="ml-0.5 text-primary-400 hover:text-red-500 cursor-pointer leading-none text-[10px]"
              >×</button>
            )}
          </span>
        ))}
        {tags.length < 2 && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditFileId(file.id); setCustomTag('') }}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] text-muted hover:text-primary-500 hover:bg-primary-50 cursor-pointer transition-colors border border-dashed border-gray-300"
            title="添加标签"
          >+</button>
        )}
        {/* Tag editor popover */}
        {editFileId === file.id && (
          <div ref={popoverRef}
            className="absolute z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-panel p-2 min-w-[160px]"
            style={{ top: '100%', left: 0 }}
          >
            <div className="flex flex-wrap gap-1 mb-2">
              {TAG_OPTIONS.filter(t => !tags.includes(t)).map(opt => (
                <button key={opt}
                  onClick={() => addTag(file.id, opt)}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer bg-surface border border-gray-200 dark:border-gray-700 text-muted hover:text-primary-500 hover:border-primary-300 transition-colors"
                >{opt}</button>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomTag(file.id) }}
                placeholder="自定义标签"
                className="flex-1 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 font-sans"
                autoFocus
              />
              <button
                onClick={() => handleCustomTag(file.id)}
                disabled={!customTag.trim()}
                className="h-7 px-2 rounded-md text-[11px] font-semibold cursor-pointer bg-primary-500 text-white border-none disabled:opacity-40 hover:bg-primary-600 transition-colors"
              >确定</button>
            </div>
            <button
              onClick={() => { setEditFileId(null); setCustomTag('') }}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink cursor-pointer text-[14px] border-none bg-transparent active:scale-90"
            >×</button>
          </div>
        )}
      </div>
    )
  }

  const FileRow = ({ file }: { file: FileEntry }) => {
    const ext = file.file_name.split('.').pop() || ''
    const typeLabel = fileTypeIcon(ext)

    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group">
        {/* File type badge */}
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-bold shrink-0 ${
          typeLabel === 'PDF' ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
          typeLabel === 'XLS' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
          typeLabel === 'DOC' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
          typeLabel === 'IMG' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
          'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>{typeLabel}</span>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate" title={file.file_name}>{file.file_name}</span>
            {file.purpose && <span className="text-[11px] text-muted shrink-0">{file.purpose}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {file.category === 'uploaded' ? (
              <div className="relative">{renderTagChips(file)}</div>
            ) : (
              <span className="text-[11px] text-muted">{file.output_type || '生成文件'}</span>
            )}
            <span className="text-[11px] text-muted/60">{formatTime(file.created_at)}</span>
            {file.file_size > 0 && <span className="text-[11px] text-muted/50">{formatSize(file.file_size)}</span>}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => handleOpen(file.id)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent"
            title="打开文件"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
          <button onClick={() => handleReveal(file.id)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent"
            title="在文件夹中显示"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="2"/><path d="M12 11v4"/><path d="M10 13h4"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
        <div className="flex items-center px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">附件管理</h3>
        </div>
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-muted">加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
        <div className="flex items-center px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">附件管理</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-sm text-muted">
          加载失败，请刷新页面重试
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
      <div className="flex items-center px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">附件管理</h3>
        <span className="ml-2 text-[11px] text-muted">{files.length} 个文件</span>
      </div>

      {/* Uploaded files */}
      {uploadedFiles.length > 0 ? (
        <div>
          <div className="px-6 py-2.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted">
            上传文件 ({uploadedFiles.length})
          </div>
          <div className="px-3 pb-2">
            {uploadedFiles.map(f => <FileRow key={f.id} file={f} />)}
          </div>
        </div>
      ) : files.length > 0 ? (
        <div>
          <div className="px-6 py-2.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted">上传文件</div>
          <div className="px-6 py-8 text-center text-[13px] text-muted">
            在「① 导入单证」中上传单证文件。
          </div>
        </div>
      ) : null}

      {/* Generated files */}
      {generatedFiles.length > 0 && (
        <div className={`${uploadedFiles.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
          <div className="px-6 py-2.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted">
            生成文件 ({generatedFiles.length})
          </div>
          <div className="px-3 pb-2">
            {generatedFiles.map(f => <FileRow key={f.id} file={f} />)}
          </div>
        </div>
      )}

      {/* Overall empty state */}
      {files.length === 0 && (
        <div className="px-6 py-10 text-center text-[13px] text-muted">
          <div className="flex justify-center mb-2 opacity-30"><IconDocument /></div>
          暂无文件。在「① 导入单证」中上传单证文件。
        </div>
      )}
    </div>
  )
}
