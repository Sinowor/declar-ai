import ReactMarkdown from 'react-markdown'
import { useKnowledge, parseTags } from '../../hooks/useKnowledge'
import type { Entry, AttachedFile } from '../../hooks/useKnowledge'
import KnowledgeSidebar from './KnowledgeSidebar'

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}小时前`
  return `${Math.floor(hr / 24)}天前`
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
}

export default function KnowledgeBase({ sidebarCollapsed, onToggleSidebar, onDirtyChange }: {
  sidebarCollapsed: boolean; onToggleSidebar: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const k = useKnowledge(onDirtyChange)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <KnowledgeSidebar
        sidebarCollapsed={sidebarCollapsed}
        entries={k.entries}
        selectedId={k.selectedId}
        search={k.search}
        onSearchChange={k.setSearch}
        activeTag={k.activeTag}
        onActiveTagChange={k.setActiveTag}
        allTags={k.allTags}
        showTagManager={k.showTagManager}
        onToggleTagManager={() => k.setShowTagManager(!k.showTagManager)}
        newTagName={k.newTagName}
        onNewTagNameChange={k.setNewTagName}
        dbTags={k.dbTags}
        onAddDbTag={k.handleAddDbTag}
        onDeleteDbTag={k.handleDeleteDbTag}
        onSelect={k.handleSelect}
        onNew={k.handleNew}
        onTogglePin={k.togglePin}
        tagManagerRef={k.tagManagerRef}
      />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto flex flex-col bg-surface">
        {!k.selectedEntry && !k.editing ? (
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
            <div className="px-8 pt-6 pb-4 drag-region flex items-start justify-between">
              <div className="flex flex-col gap-1 min-w-0 flex-1 mr-4">
                <div className="flex items-center gap-2 text-[12px] text-muted flex-wrap">
                  {k.selectedEntry && (
                    <button onClick={() => k.selectedEntry && k.togglePin(k.selectedEntry)}
                      className="cursor-pointer text-[13px] hover:scale-110 transition-transform shrink-0"
                      title={k.selectedEntry?.is_pinned ? '取消置顶' : '置顶'}>
                      {k.selectedEntry?.is_pinned ? '📌' : '📍'}
                    </button>
                  )}
                  {k.selectedEntry && <span className="truncate">{parseTags(k.selectedEntry.tags).join(' · ') || '未分类'}</span>}
                  {k.selectedEntry?.hs_code && <span className="font-mono text-[11px] bg-surface dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">HS: {k.selectedEntry.hs_code}</span>}
                  {k.selectedEntry && <span className="shrink-0">{timeAgo(k.selectedEntry.updated_at)}</span>}
                </div>
                {(k.autoSaved || k.saving) && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {k.autoSaved && <span className="text-green-500">已自动保存</span>}
                    {k.saving && <span className="text-muted">保存中...</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 no-drag shrink-0">
                {k.editing ? (
                  <button onClick={() => k.handleToggleEditing(false)}
                    className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-transparent text-muted hover:text-ink transition-colors">预览</button>
                ) : (
                  <button onClick={() => k.handleToggleEditing(true)}
                    className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-transparent text-muted hover:text-ink transition-colors">编辑</button>
                )}
              </div>
            </div>

            {k.editing ? (
              <div className="px-8 pb-12 flex-1 flex flex-col space-y-3">
                <input value={k.form.title} onChange={e => k.setForm({ ...k.form, title: e.target.value })} placeholder="标题"
                  className="w-full text-[22px] font-bold outline-none border-none bg-transparent text-ink placeholder:text-muted/40" />
                <div className="flex gap-3">
                  <div className="flex-1 relative" ref={k.tagDropdownRef}>
                    <input ref={k.tagInputRef} value={k.form.tags} onChange={e => k.handleTagInputChange(e.target.value)}
                      onFocus={() => { const parts = k.form.tags.split(/[,，]/); const last = parts[parts.length - 1].trim(); if (last) k.handleTagInputChange(k.form.tags) }}
                      placeholder="标签，逗号分隔（如：归类经验, 口岸须知）"
                      className="w-full h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 placeholder:text-muted/40" />
                    {k.showTagSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 overflow-hidden">
                        {k.tagSuggestions.map(t => (
                          <button key={t} onMouseDown={e => { e.preventDefault(); k.insertTagSuggestion(t) }}
                            className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface dark:hover:bg-gray-700 cursor-pointer transition-colors">{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={k.form.hs_code} onChange={e => k.setForm({ ...k.form, hs_code: e.target.value })} placeholder="HS编码（可选）"
                    className="w-40 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-mono placeholder:text-muted/40" />
                </div>
                <textarea value={k.form.content} onChange={e => k.setForm({ ...k.form, content: e.target.value })} placeholder="输入正文（支持 Markdown）..."
                  className="w-full min-h-[300px] h-[400px] rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-[14px] leading-relaxed outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans resize-y placeholder:text-muted/40" />

                <div>
                  <div className="text-[11px] font-medium text-muted mb-2">附件 · 拖拽文件到此处</div>
                  <div className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${k.dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                    onDragOver={e => { e.preventDefault(); k.setDragOver(true) }}
                    onDragLeave={() => k.setDragOver(false)}
                    onDrop={k.handleDrop}>
                    <div className="flex flex-wrap gap-2">
                      {k.files.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                          {isImageFile(f.file_name) ? (
                            <span className="w-5 h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                              <img src={`file://${f.file_path}`} className="w-full h-full object-cover" alt="" />
                            </span>
                          ) : null}
                          <span className="cursor-pointer hover:text-primary-500 hover:underline" onClick={() => k.handleOpenFile(f.id)}>{f.file_name}</span>
                          {f.file_size ? <span className="text-[10px] text-muted/50">{formatSize(f.file_size)}</span> : null}
                          <button onClick={() => k.handleRemoveFile(i)} className="text-muted hover:text-red-500 cursor-pointer text-xs leading-none">×</button>
                        </span>
                      ))}
                      {k.files.length === 0 && <span className="text-[12px] text-muted/60">拖拽文件到此处，或点击下方按钮选择</span>}
                    </div>
                  </div>
                  <button onClick={k.handleFilePick}
                    className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink transition-colors">+ 添加附件</button>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-muted mb-2">添加链接</div>
                  <div className="flex gap-2">
                    <input value={k.linkTitle} onChange={e => k.setLinkTitle(e.target.value)} placeholder="标题（可选）"
                      className="w-28 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 placeholder:text-muted/40" />
                    <input value={k.linkUrl} onChange={e => k.setLinkUrl(e.target.value)} placeholder="https://..."
                      className="flex-1 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 placeholder:text-muted/40"
                      onKeyDown={e => { if (e.key === 'Enter') k.handleAddLink() }} />
                    <button onClick={k.handleAddLink}
                      className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink transition-colors shrink-0">添加</button>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button onClick={k.handleSave} disabled={k.saving}
                    className="h-8 px-5 rounded-sm text-white border-none font-semibold text-xs cursor-pointer active:scale-[0.97] transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary-500/20" style={{ background: "var(--gradient)" }}>{k.saving ? '保存中...' : '保存'}</button>
                  {k.selectedEntry && <button onClick={k.handleDelete}
                    className="h-8 px-3 rounded-sm text-xs cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-red-500 transition-colors">删除</button>}
                </div>
              </div>
            ) : (
              <div className="px-8 pb-12 flex-1 max-w-[800px]">
                {k.selectedEntry && (
                  <>
                    <h1 className="text-[26px] font-bold tracking-tight mb-6">{k.selectedEntry.title}</h1>
                    {k.selectedEntry.content.trim() ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{k.selectedEntry.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="mt-6 py-12 text-center text-[13px] text-muted/50 italic border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        暂无内容，点击上方「编辑」开始书写
                      </div>
                    )}
                    {k.files.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">附件 ({k.files.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {k.files.map((f, i) => (
                            <span key={i} onClick={() => k.handleOpenFile(f.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-700 hover:underline transition-colors">
                              {isImageFile(f.file_name) ? (
                                <span className="w-5 h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                                  <img src={`file://${f.file_path}`} className="w-full h-full object-cover" alt="" />
                                </span>
                              ) : null}
                              {f.file_name}
                              {f.file_size ? <span className="text-[10px] text-muted/50">{formatSize(f.file_size)}</span> : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {k.relatedNotes.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">相关笔记</div>
                        <div className="space-y-1">
                          {k.relatedNotes.map(r => (
                            <button key={r.id} onClick={() => k.handleSelect(r.id)}
                              className="block w-full text-left px-3 py-2 rounded-md text-[13px] hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                              <span className="font-medium">{r.title}</span>
                              {r.hs_code && <span className="ml-2 text-[11px] font-mono text-muted">HS: {r.hs_code}</span>}
                            </button>
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
