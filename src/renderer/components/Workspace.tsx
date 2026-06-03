import { useState, useCallback, useEffect, useRef } from 'react'
import type { DeclarationItem } from '../App'
import FileDropZone from './FileDropZone'
import CargoDetailsTable from './CargoDetailsTable'
import AiReviewPanel from './AiReviewPanel'
import { IconSave, IconAI, IconDocument } from './Icons'

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

interface ReviewIssue {
  id?: string
  field_path: string
  issue_type: string
  question: string
  severity: string
  suggestion: string
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

  // Preview mode: selected but not editing
  if (!isEditing && selectedDeclaration && !declaration) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center py-20 max-w-md">
          <div className="flex justify-center mb-4"><IconDocument /></div>
          <h3 className="text-lg font-semibold mb-2">{selectedDeclaration.preEntryNumber || '未编号申报单'}</h3>
          <p className="text-muted text-sm mb-2">{selectedDeclaration.transportName}</p>
          <p className="text-muted text-xs mb-6">状态：{statusLabels[selectedDeclaration.status]}</p>
          <button
            onClick={onEnterEdit}
            className="h-10 px-6 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-2 hover:bg-primary-600 transition-all"
          >
            进入编辑
          </button>
        </div>
      </main>
    )
  }

  // No selection at all
  if (!declaration && !selectedDeclaration) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
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
  const [isReviewing, setIsReviewing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [transportForm, setTransportForm] = useState<TransportFormData>({
    entry_exit_transport_tool_name: '',
    voyage_flight_number: '',
    customs_transfer_method: '过境',
    domestic_transport_method: '铁路运输',
    pre_entry_number: '',
  })
  const [cargoDetails, setCargoDetails] = useState<CargoDetailData[]>([])
  const [confidenceMap, setConfidenceMap] = useState<Record<number, Record<string, string>>>({})
  const [reviewCompleted, setReviewCompleted] = useState(false)
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Load existing declaration data when switching declarations
  useEffect(() => {
    if (!declaration?.id) return
    let cancelled = false

    const loadData = async () => {
      // Reset state for the new declaration
      setFiles([])
      setConfidenceMap({})
      setReviewIssues([])

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

  const handleSave = useCallback(async () => {
    if (!declaration || isSaving) return
    setIsSaving(true)
    try {
      const data = buildDeclarationData()
      if (window.api?.updateDeclaration) {
        const result = await window.api.updateDeclaration(declaration.id, data)
        if (result.success) {
          showToast('保存成功')
        } else {
          showToast(`保存失败: ${result.error}`, 'error')
        }
      }
    } catch (err: any) {
      showToast(`保存错误: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }, [declaration, isSaving, buildDeclarationData])

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
            (d.cargo_details || []).map((cd, i) => ({
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
          showToast('AI 提取完成，数据已填充')
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

  const handleAIReview = useCallback(async () => {
    if (!declaration) return
    setIsReviewing(true)

    try {
      if (window.api?.aiReview) {
        const result = await window.api.aiReview(declaration.id)
        if (result.success && result.issues) {
          setReviewIssues(result.issues)
          showToast(`发现 ${result.issues.length} 个问题`)
        } else {
          showToast('审核完成，未发现问题')
          setReviewIssues([])
        }
        setReviewCompleted(true)
      }
    } catch (err: any) {
      showToast(`审核错误: ${err.message}`, 'error')
    } finally {
      setIsReviewing(false)
    }
  }, [declaration])

  const handleConfirmAll = useCallback(async () => {
    // Confirm all pending issues with a default answer
    for (let i = 0; i < reviewIssues.length; i++) {
      if (!reviewIssues[i].id) continue
      try {
        if (window.api?.aiAnswer) {
          await window.api.aiAnswer(reviewIssues[i].id!, '已确认，数据无误')
        }
      } catch {}
    }
    showToast('全部问题已确认')
  }, [reviewIssues])

  const handleReviewAnswer = useCallback(async (index: number, answer: string) => {
    const issue = reviewIssues[index]
    if (!issue?.id) return
    try {
      if (window.api?.aiAnswer) {
        const result = await window.api.aiAnswer(issue.id, answer)
        if (result.success) {
          showToast('答复已记录')
        } else {
          showToast(`保存失败: ${result.error}`, 'error')
        }
      }
    } catch (err: any) {
      showToast(`保存答复失败: ${err.message}`, 'error')
    }
  }, [reviewIssues])

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 pb-0 shrink-0 drag-region workspace-header">
        <div>
          <h1 className="text-[28px] font-bold">转关运输货物申报单</h1>
          <p className="text-muted text-sm mt-1">
            预录入编号：{transportForm.pre_entry_number || '(待填写)'} · 状态：{statusLabels[declaration.status]}
          </p>
        </div>
        <div className="flex gap-2.5 no-drag">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`h-[38px] px-5 rounded-sm bg-white text-ink border border-gray-200 font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-surface transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? '保存中...' : <><IconSave /><span>保存草稿</span></>}
          </button>
          <button
            onClick={handleAIExtract}
            disabled={isExtracting || files.length === 0}
            title={files.length === 0 ? '请先导入单证文件' : ''}
            className={`h-[38px] px-5 rounded-sm text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${
              files.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 pulse-ai'
            }`}
          >
            {isExtracting ? '提取中...' : <><IconAI /><span>AI 提取数据</span></>}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 flex-1">
        {/* File Drop Zone */}
        <FileDropZone
          declarationId={declaration.id}
          onFilesImported={handleFilesImported}
          files={files}
          onRemoveFile={handleRemoveFile}
          isExtracting={isExtracting}
        />

        {/* Transport Info Form */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">运输信息</h3>
            {declaration.status !== 'draft' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-500">
                🤖 AI 已提取
              </span>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-5">
              {formFields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-muted uppercase tracking-wider">
                    {f.label}{f.key === 'entry_exit_transport_tool_name' || f.key === 'pre_entry_number' ? <span className="text-red-400 ml-0.5">*</span> : null}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      value={transportForm[f.key] || ''}
                      onChange={(e) => setTransportForm({ ...transportForm, [f.key]: e.target.value })}
                      className="h-10 rounded-[10px] border border-gray-200 px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans"
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
                      onChange={(e) => setTransportForm({ ...transportForm, [f.key]: e.target.value })}
                      className="h-10 rounded-[10px] border border-gray-200 px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans"
                    />
                  )}
                </div>
              ))}
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
        <CargoDetailsTable
          details={cargoDetails}
          onUpdate={setCargoDetails}
          confidenceMap={confidenceMap}
        />

        {/* AI Review Panel */}
        <AiReviewPanel
          issues={reviewIssues}
          onAnswer={handleReviewAnswer}
          isReviewing={isReviewing}
          onStartReview={handleAIReview}
          reviewCompleted={reviewCompleted}
          onConfirmAll={handleConfirmAll}
        />

        <div className="pb-4" />
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
