import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { DeclarationItem } from '../App'
import type { ReviewIssue } from '../../shared/types'
import FileDropZone from './FileDropZone'
import CargoDetailsTable from './CargoDetailsTable'
import DeclarationPreview from './DeclarationPreview'
import { IconSave, IconAI, IconDocument, IconChevronLeft } from './Icons'

interface TransportFormData {
  entry_exit_transport_tool_name: string
  voyage_flight_number: string
  customs_transfer_method: string
  domestic_transport_method: string
  pre_entry_number: string
}

interface ImportedFileItem {
  id?: string
  file_name: string
  extracted_text?: string
  error?: string
}

interface CargoDetailData {
  id: string
  declaration_id: string
  domestic_transport_tool_name: string | null
  bill_of_lading_number: string | null
  container_number: string | null
  cargo_name: string | null
  pieces: number
  weight: number
  customs_lock_number: string | null
  quantity: number
  sort_order: number
}

interface WorkspaceProps {
  declaration: DeclarationItem | null | undefined
  selectedDeclaration: DeclarationItem | null | undefined
  onEnterEdit: () => void
  isEditing: boolean
}

const formFields = [
  { key: 'entry_exit_transport_tool_name' as const, label: '进出境运输工具名称' },
  { key: 'voyage_flight_number' as const, label: '航次/航班号' },
  { key: 'customs_transfer_method' as const, label: '海关转运方式', type: 'select', options: ['过境', '中转', '通运', '直通'] },
  { key: 'domestic_transport_method' as const, label: '境内运输方式', type: 'select', options: ['铁路运输', '公路运输', '航空运输', '水路运输'] },
  { key: 'pre_entry_number' as const, label: '预录入编号' },
]

export default function Workspace({ declaration, selectedDeclaration, onEnterEdit, isEditing }: WorkspaceProps) {
  const statusLabels: Record<string, string> = {
    draft: '草稿', processing: 'AI 提取中', review: '待人工确认', done: '已完成', error: '有错误',
  }

  // Preview mode: selected but not editing → show full read-only details
  if (!isEditing && selectedDeclaration && !declaration) {
    return <DeclarationPreview declaration={selectedDeclaration} onEnterEdit={onEnterEdit} />
  }

  // No selection at all
  if (!declaration && !selectedDeclaration) {
    return (
      <main className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5EEFF 0%, #EEF4FF 45%, #FFF7ED 100%)' }}>
        <div className="text-center py-20">
          <div className="flex justify-center mb-4"><IconDocument /></div>
          <h3 className="text-lg font-semibold mb-2">选择一个申报单</h3>
          <p className="text-muted text-sm max-w-sm mx-auto">
            从左侧列表中选择一个申报单查看详情，或点击「新建申报单」创建新的转关运输货物申报单。
          </p>
        </div>
      </main>
    )
  }

  const [files, setFiles] = useState<ImportedFileItem[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const [transportForm, setTransportForm] = useState<TransportFormData>({
    entry_exit_transport_tool_name: '',
    voyage_flight_number: '',
    customs_transfer_method: '过境',
    domestic_transport_method: '铁路运输',
    pre_entry_number: '',
  })
  const [cargoDetails, setCargoDetails] = useState<CargoDetailData[]>([])
  const [confidenceMap, setConfidenceMap] = useState<Record<number, Record<string, string>>>({})
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([])
  const [resolvedIssues, setResolvedIssues] = useState<Set<number>>(new Set())
  const [showIssuesPanel, setShowIssuesPanel] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const dirtyRef = useRef(false)
  const transportSectionRef = useRef<HTMLDivElement>(null)
  const cargoSectionRef = useRef<HTMLDivElement>(null)

  const markDirty = useCallback(() => {
    dirtyRef.current = true
  }, [])

  // Load existing declaration data when switching declarations
  useEffect(() => {
    if (!declaration?.id) return
    let cancelled = false

    const loadData = async () => {
      // Reset state for the new declaration
      dirtyRef.current = false
      setFiles([])
      setConfidenceMap({})
      setReviewIssues([])
      setResolvedIssues(new Set())
      setShowIssuesPanel(false)

      try {
        if (window.api?.getDeclaration && window.api?.getFiles) {
          const [result, fileList] = await Promise.all([
            window.api.getDeclaration(declaration.id),
            window.api.getFiles(declaration.id),
          ])
          if (cancelled) return

          // Load files
          if (Array.isArray(fileList)) {
            setFiles(fileList.map((f: any) => ({
              id: f.id,
              file_name: f.file_name,
              extracted_text: f.extracted_text,
            })))
          }

          if (!result?.data) return
          const d = result.data
          setTransportForm({
            entry_exit_transport_tool_name: d.transport_info?.entry_exit_transport_tool_name || '',
            voyage_flight_number: d.transport_info?.voyage_flight_number || '',
            customs_transfer_method: d.transport_info?.customs_transfer_method || '过境',
            domestic_transport_method: d.transport_info?.domestic_transport_method || '铁路运输',
            pre_entry_number: d.pre_entry_number || '',
          })
          const details = result.cargo_details || []
          if (details.length > 0) {
            setCargoDetails(details)
          } else if (d.cargo_details?.length > 0) {
            setCargoDetails(d.cargo_details.map((cd: any, i: number) => ({
              ...cd, id: cd.id || '', declaration_id: declaration.id, sort_order: i,
            })))
          }

          // Build confidence map from extraction_notes
          if (d.extraction_notes) {
            const cmap: Record<number, Record<string, string>> = {}
            for (const note of d.extraction_notes) {
              const cargoMatch = note.field.match(/^cargo_details\[(\d+)\]\.(.+)$/)
              if (cargoMatch) {
                const idx = parseInt(cargoMatch[1])
                if (!cmap[idx]) cmap[idx] = {}
                cmap[idx][cargoMatch[2]] = note.confidence
              }
            }
            setConfidenceMap(cmap)
          }
        }
      } catch (err: any) {
        console.error('Failed to load declaration data:', err)
      }
    }
    loadData()

    return () => { cancelled = true }
  }, [declaration?.id])

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const buildDeclarationData = useCallback(() => {
    return {
      document_title: '中华人民共和国海关进口转关运输货物申报单',
      pre_entry_number: transportForm.pre_entry_number || null,
      document_number: null,
      transport_info: {
        entry_exit_transport_tool_name: transportForm.entry_exit_transport_tool_name || null,
        voyage_flight_number: transportForm.voyage_flight_number || null,
        customs_transfer_method: transportForm.customs_transfer_method || null,
        domestic_transport_method: transportForm.domestic_transport_method || null,
      },
      cargo_summary: {
        bill_of_lading_total: new Set(cargoDetails.map((d) => d.bill_of_lading_number).filter(Boolean)).size,
        cargo_total_pieces: cargoDetails.reduce((s, d) => s + (d.pieces || 0), 0),
        cargo_total_weight: cargoDetails.reduce((s, d) => s + (d.weight || 0), 0),
        container_total: new Set(cargoDetails.map((d) => d.container_number).filter(Boolean)).size,
        domestic_transport_tool: transportForm.domestic_transport_method || null,
      },
      cargo_details: cargoDetails.map((d) => ({
        domestic_transport_tool_name: d.domestic_transport_tool_name,
        bill_of_lading_number: d.bill_of_lading_number,
        container_number: d.container_number,
        cargo_name: d.cargo_name,
        pieces: d.pieces,
        weight: d.weight,
        customs_lock_number: d.customs_lock_number,
        quantity: d.quantity,
      })),
      extraction_notes: [],
    }
  }, [transportForm, cargoDetails])

  const handleSave = useCallback(async (retry = 0) => {
    if (!declaration || savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    const maxRetries = 2
    try {
      const data = buildDeclarationData()
      if (window.api?.updateDeclaration) {
        const result = await window.api.updateDeclaration(declaration.id, data)
        if (result.success) {
          dirtyRef.current = false
          showToast('保存成功')
        } else if (retry < maxRetries) {
          showToast(`保存失败，正在重试 (${retry + 1}/${maxRetries})...`, 'info')
          savingRef.current = false
          setIsSaving(false)
          setTimeout(() => handleSaveRef.current(retry + 1), 1000)
          return
        } else {
          showToast(`保存失败: ${result.error}`, 'error')
        }
      }
    } catch (err: any) {
      if (retry < maxRetries) {
        showToast(`保存出错，正在重试 (${retry + 1}/${maxRetries})...`, 'info')
        savingRef.current = false
        setIsSaving(false)
        setTimeout(() => handleSaveRef.current(retry + 1), 1000)
        return
      }
      showToast(`保存错误: ${err.message}`, 'error')
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [declaration, buildDeclarationData])

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Ctrl/Cmd+S keyboard shortcut for save (after handleSave defined)
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleFilesImported = useCallback((newFiles: ImportedFileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles])
    showToast(`已添加 ${newFiles.length} 个文件`)
  }, [])

  const handleRemoveFile = useCallback(async (index: number, fileId?: string) => {
    if (fileId && window.api?.deleteFile) {
      try { await window.api.deleteFile(fileId) } catch {}
    }
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAIExtract = useCallback(async () => {
    if (!declaration) return
    setIsExtracting(true)
    showToast('AI 提取中...')

    try {
      if (window.api?.aiExtract) {
        const result = await window.api.aiExtract(declaration.id)
        if (result.success && result.data) {
          const d = result.data
          setTransportForm({
            entry_exit_transport_tool_name: d.transport_info?.entry_exit_transport_tool_name || '',
            voyage_flight_number: d.transport_info?.voyage_flight_number || '',
            customs_transfer_method: d.transport_info?.customs_transfer_method || '过境',
            domestic_transport_method: d.transport_info?.domestic_transport_method || '铁路运输',
            pre_entry_number: d.pre_entry_number || '',
          })
          setCargoDetails(
            (d.cargo_details || []).map((cd: any, i: number) => ({
              id: '',
              declaration_id: declaration.id,
              ...cd,
              sort_order: i,
            }))
          )
          // Build confidence map from extraction_notes
          if (result.extraction_notes) {
            const cmap: Record<number, Record<string, string>> = {}
            for (const note of result.extraction_notes) {
              // Parse field path like "cargo_details[0].cargo_name" or "transport_info.voyage_flight_number"
              const match = note.field.match(/^cargo_details\[(\d+)\]\.(.+)$/)
              if (match) {
                const idx = parseInt(match[1])
                const field = match[2]
                if (!cmap[idx]) cmap[idx] = {}
                cmap[idx][field] = note.confidence
              }
            }
            setConfidenceMap(cmap)
          }
          // Store auto-review issues
          if (result.issues && result.issues.length > 0) {
            setReviewIssues(result.issues)
            setResolvedIssues(new Set())
            showToast(`AI 提取完成，发现 ${result.issues.length} 个待确认项`)
          } else {
            setReviewIssues([])
            showToast('AI 提取完成，数据已填充')
          }
        } else {
          showToast(`提取失败: ${result.error}`, 'error')
        }
      }
    } catch (err: any) {
      showToast(`错误: ${err.message}`, 'error')
    } finally {
      setIsExtracting(false)
    }
  }, [declaration])

  // Build issue maps: transport fields vs cargo detail cells
  const { transportIssues, cargoIssues } = useMemo(() => {
    const tMap: Record<string, ReviewIssue[]> = {}
    const cMap: Record<number, Record<string, ReviewIssue[]>> = {}
    for (const issue of reviewIssues) {
      // Transport info field: "transport_info.entry_exit_transport_tool_name"
      const tMatch = issue.field_path.match(/^transport_info\.(.+)$/)
      if (tMatch) {
        const field = tMatch[1]
        if (!tMap[field]) tMap[field] = []
        tMap[field].push(issue)
        continue
      }
      // Cargo detail cell: "cargo_details[0].cargo_name"
      const cMatch = issue.field_path.match(/^cargo_details\[(\d+)\]\.(.+)$/)
      if (cMatch) {
        const idx = parseInt(cMatch[1])
        const field = cMatch[2]
        if (!cMap[idx]) cMap[idx] = {}
        if (!cMap[idx][field]) cMap[idx][field] = []
        cMap[idx][field].push(issue)
      }
    }
    return { transportIssues: tMap, cargoIssues: cMap }
  }, [reviewIssues])

  const pendingCount = reviewIssues.length - resolvedIssues.size

  const resolveIssue = (index: number) => {
    const next = new Set(resolvedIssues)
    next.add(index)
    setResolvedIssues(next)
  }

  const resolveAll = () => {
    setResolvedIssues(new Set(reviewIssues.map((_, i) => i)))
  }

  const scrollToIssue = (index: number) => {
    const issue = reviewIssues[index]
    if (!issue) return
    if (issue.field_path.startsWith('transport_info')) {
      transportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      cargoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const sevBadge = (severity: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-50 text-red-600', medium: 'bg-amber-50 text-amber-600', low: 'bg-sky-50 text-sky-600',
    }
    const labels: Record<string, string> = { high: '高', medium: '中', low: '低' }
    return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[severity] || colors.medium}`}>{labels[severity] || severity}</span>
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 pb-0 shrink-0 drag-region workspace-header">
        <div>
          <h1 className="text-[28px] font-bold">转关运输货物申报单</h1>
          <p className="text-muted text-sm mt-1">
            预录入编号：{transportForm.pre_entry_number || '(待填写)'} · 状态：{statusLabels[declaration!.status]}
          </p>
        </div>
        <div className="flex gap-2.5 no-drag items-start">
          {pendingCount > 0 && (
            <button
              onClick={() => setShowIssuesPanel(!showIssuesPanel)}
              className={`h-[38px] px-3 rounded-sm border font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${
                showIssuesPanel
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50'
              }`}
            >
              <span className="text-base leading-none">&#9888;</span>
              <span>{pendingCount} 个待确认</span>
              <span style={{ transform: showIssuesPanel ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s', display: 'inline-block' }}><IconChevronLeft /></span>
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`h-[38px] px-5 rounded-sm bg-white text-ink border border-gray-200 font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-surface transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? '保存中...' : <><IconSave /><span>保存草稿</span><span className="text-[10px] opacity-40 ml-0.5">{navigator.platform?.toLowerCase?.().includes('mac') ? '⌘S' : 'Ctrl+S'}</span></>}
          </button>
          <button
            onClick={handleAIExtract}
            disabled={isExtracting || files.length === 0}
            title={files.length === 0 ? '请先导入单证文件' : ''}
            className={`h-[38px] px-5 rounded-sm text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${
              files.length === 0
                ? 'bg-primary-300 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 pulse-ai'
            }`}
          >
            {isExtracting ? '提取+审核中...' : <><IconAI /><span>AI 提取并审核</span></>}
          </button>
        </div>
      </div>

      {/* Issues dropdown panel */}
      {showIssuesPanel && pendingCount > 0 && (
        <div className="mx-8 mb-0 bg-white border border-amber-200 rounded-xl shadow-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
            <span className="text-sm font-semibold">待确认项 ({pendingCount})</span>
            <button
              onClick={resolveAll}
              className="h-6 px-3 rounded-sm text-xs font-medium border border-amber-200 bg-white text-amber-700 cursor-pointer hover:bg-amber-100 transition-all"
            >
              全部确认
            </button>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {reviewIssues.map((issue, i) => {
              if (resolvedIssues.has(i)) return null
              return (
                <div
                  key={i}
                  className="px-5 py-2.5 border-b border-slate-50 last:border-b-0 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-all"
                  onClick={() => { scrollToIssue(i); setShowIssuesPanel(false) }}
                >
                  {sevBadge(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{issue.field_path}</div>
                    <div className="text-[12px] text-muted truncate">{issue.question}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); resolveIssue(i) }}
                    className="shrink-0 h-6 px-2 rounded-sm text-[11px] font-medium border border-gray-200 bg-white text-muted hover:text-emerald-600 hover:border-emerald-300 cursor-pointer transition-all"
                  >
                    确认
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-8 py-6 flex flex-col gap-6 flex-1 max-w-[1200px] mx-auto w-full">
        {/* File Drop Zone */}
        <FileDropZone
          declarationId={declaration!.id}
          onFilesImported={handleFilesImported}
          files={files}
          onRemoveFile={handleRemoveFile}
          isExtracting={isExtracting}
        />

        {/* Transport Info Form */}
        <div ref={transportSectionRef} className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">运输信息</h3>
            {declaration!.status !== 'draft' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-500">
                <IconAI /><span className="ml-1">AI 已提取</span>
              </span>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-5">
              {formFields.map((f) => {
                const fieldIssues = transportIssues[f.key]
                const hasIssue = fieldIssues && fieldIssues.length > 0
                return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-muted uppercase tracking-wider">
                    {f.label}{f.key === 'entry_exit_transport_tool_name' || f.key === 'pre_entry_number' ? <span className="text-red-400 ml-0.5">*</span> : null}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      value={transportForm[f.key] || ''}
                      onChange={(e) => { markDirty(); setTransportForm({ ...transportForm, [f.key]: e.target.value }) }}
                      className={`h-10 rounded-[10px] border px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans ${hasIssue ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}
                    >
                      {(f.options || []).map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={transportForm[f.key] || ''}
                      onChange={(e) => { markDirty(); setTransportForm({ ...transportForm, [f.key]: e.target.value }) }}
                      className={`h-10 rounded-[10px] border px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans ${hasIssue ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}
                    />
                  )}
                  {hasIssue && (
                    <div className="flex flex-col gap-0.5">
                      {fieldIssues!.map((issue, ji) => (
                        <div key={ji} className="text-[11px] text-amber-700 flex items-center gap-1">
                          <span className="font-bold">&#9888;</span> {issue.question}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )})}
              {/* Document number — readonly */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-muted uppercase tracking-wider">
                  申报单编号
                </label>
                <input
                  type="text"
                  placeholder="海关填写"
                  disabled
                  className="h-10 rounded-[10px] border border-gray-200 px-3.5 text-sm bg-gray-50 opacity-50 font-sans"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cargo Details Table */}
        <div ref={cargoSectionRef}>
          <CargoDetailsTable
            details={cargoDetails}
            onUpdate={(details) => { markDirty(); setCargoDetails(details) }}
            confidenceMap={confidenceMap}
            cargoIssues={cargoIssues}
          />
        </div>

        <div className="pb-12" />
      </div>

      {/* Toast */}
      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white px-6 py-3 rounded-xl text-sm font-medium z-[100] shadow-[0_20px_48px_rgba(15,23,42,0.2)] flex items-center gap-2">
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </main>
  )
}
