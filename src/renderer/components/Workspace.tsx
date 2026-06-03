import { useState, useCallback } from 'react'
import type { DeclarationItem } from '../App'
import FileDropZone from './FileDropZone'
import CargoDetailsTable from './CargoDetailsTable'
import AiReviewPanel from './AiReviewPanel'

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
  field_path: string
  issue_type: string
  question: string
  severity: string
  suggestion: string
}

interface WorkspaceProps {
  declaration: DeclarationItem | null | undefined
}

export default function Workspace({ declaration }: WorkspaceProps) {
  const [files, setFiles] = useState<ImportedFileItem[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({
    entry_exit_transport_tool_name: '',
    voyage_flight_number: '',
    customs_transfer_method: '过境',
    domestic_transport_method: '铁路运输',
    pre_entry_number: '',
  })
  const [cargoDetails, setCargoDetails] = useState<CargoDetailData[]>([])
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleFilesImported = useCallback((newFiles: ImportedFileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles])
    showToast(`已添加 ${newFiles.length} 个文件`)
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
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
          setFormData({
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
          showToast('AI 提取完成，数据已填充')
        } else {
          showToast(`提取失败: ${result.error}`)
        }
      }
    } catch (err: any) {
      showToast(`错误: ${err.message}`)
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
      }
    } catch (err: any) {
      showToast(`审核错误: ${err.message}`)
    } finally {
      setIsReviewing(false)
    }
  }, [declaration])

  const handleReviewAnswer = useCallback(async (index: number, answer: string) => {
    // In a real app, this would call ai:answer IPC
    // For now just mark as answered locally
    showToast('已记录答复')
  }, [])

  const formFields = [
    { key: 'entry_exit_transport_tool_name', label: '进出境运输工具名称' },
    { key: 'voyage_flight_number', label: '航次/航班号' },
    { key: 'customs_transfer_method', label: '海关转运方式', type: 'select', options: ['过境', '中转', '通运', '直通'] },
    { key: 'domestic_transport_method', label: '境内运输方式', type: 'select', options: ['铁路运输', '公路运输', '航空运输', '水路运输'] },
    { key: 'pre_entry_number', label: '预录入编号' },
  ]

  if (!declaration) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-20">📑</div>
          <h3 className="text-lg font-semibold mb-2">选择一个申报单</h3>
          <p className="text-muted text-sm max-w-sm mx-auto">
            从左侧列表中选择一个申报单开始编辑，或点击「新建申报单」创建新的转关运输货物申报单。
          </p>
        </div>
      </main>
    )
  }

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    processing: 'AI 提取中',
    review: '待人工确认',
    done: '已完成',
    error: '有错误',
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 pb-0 shrink-0">
        <div>
          <h1 className="text-[28px] font-bold">转关运输货物申报单</h1>
          <p className="text-muted text-sm mt-1">
            预录入编号：{formData.pre_entry_number || '(待填写)'} · 状态：{statusLabels[declaration.status]}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button className="h-[38px] px-5 rounded-lg bg-white text-ink border border-gray-200 font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-surface transition-all">
            💾 保存草稿
          </button>
          <button
            onClick={handleAIExtract}
            disabled={isExtracting || files.length === 0}
            className={`h-[38px] px-5 rounded-lg text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${
              files.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 pulse-ai'
            }`}
          >
            {isExtracting ? '⏳ 提取中...' : '🤖 AI 提取数据'}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 flex-1">
        {/* File Drop Zone */}
        <FileDropZone
          onFilesImported={handleFilesImported}
          files={files}
          onRemoveFile={handleRemoveFile}
          isExtracting={isExtracting}
        />

        {/* Transport Info Form */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold">运输信息</h3>
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
                  <label className="text-[13px] font-medium text-muted uppercase tracking-wider">
                    {f.label}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      value={formData[f.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
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
                      value={formData[f.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      className="h-10 rounded-[10px] border border-gray-200 px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans"
                    />
                  )}
                </div>
              ))}
              {/* Document number — readonly */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted uppercase tracking-wider">
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
        />

        {/* AI Review Panel */}
        <AiReviewPanel
          issues={reviewIssues}
          onAnswer={handleReviewAnswer}
          isReviewing={isReviewing}
          onStartReview={handleAIReview}
        />

        <div className="pb-4" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white px-6 py-3 rounded-xl text-sm font-medium z-[100] shadow-[0_20px_48px_rgba(15,23,42,0.2)] flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}
    </main>
  )
}
