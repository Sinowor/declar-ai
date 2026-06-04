import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { DeclarationItem } from '../App'
import type { ReviewIssue, FileWarning, FieldMapping, DeclarationTypeConfig, DeclarationTypeKey, FieldSection } from '../../shared/types'
import { FIELD_LABELS, CARGO_FIELD_LABELS, SECTION_LABELS } from '../../shared/types'
import FileDropZone from './FileDropZone'
import CargoDetailsTable from './CargoDetailsTable'
import DeclarationPreview from './DeclarationPreview'
import { IconSave, IconAI, IconDocument } from './Icons'

interface WorkspaceProps {
  declaration: DeclarationItem | null | undefined
  selectedDeclaration: DeclarationItem | null | undefined
  onEnterEdit: () => void
  isEditing: boolean
}

const SECTION_ORDER: FieldSection[] = ['header', 'transport', 'party', 'port', 'trade', 'customs', 'package']

export default function Workspace({ declaration, selectedDeclaration, onEnterEdit, isEditing }: WorkspaceProps) {
  const statusLabels: Record<string, string> = {
    draft: '草稿', processing: 'AI 提取中', review: '待人工确认', done: '已完成', error: '有错误',
  }

  if (!isEditing && selectedDeclaration && !declaration) {
    return <DeclarationPreview declaration={selectedDeclaration} onEnterEdit={onEnterEdit} />
  }

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

  // ═══ State ═══
  const [files, setFiles] = useState<{ id?: string; file_name: string; extracted_text?: string; error?: string }[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const [fields, setFields] = useState<Record<string, any>>({})
  const [cargoDetails, setCargoDetails] = useState<Record<string, any>[]>([])
  const [extractionCompleted, setExtractionCompleted] = useState(false)
  const [fileWarnings, setFileWarnings] = useState<FileWarning[]>([])
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([])
  const [resolvedIssues, setResolvedIssues] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [selectedType, setSelectedType] = useState<DeclarationTypeKey | null>(null)
  const [typeConfigs, setTypeConfigs] = useState<DeclarationTypeConfig[]>([])
  const dirtyRef = useRef(false)
  const transportSectionRef = useRef<HTMLDivElement>(null)
  const cargoSectionRef = useRef<HTMLDivElement>(null)

  const markDirty = useCallback(() => { dirtyRef.current = true }, [])

  // Load type registry
  useEffect(() => {
    if (window.api?.getSchemaAll) {
      window.api.getSchemaAll().then((configs: DeclarationTypeConfig[]) => {
        if (Array.isArray(configs)) setTypeConfigs(configs)
      }).catch(() => {})
    }
  }, [])

  const selectedConfig = useMemo(() =>
    selectedType ? typeConfigs.find(c => c.type === selectedType) : null,
    [selectedType, typeConfigs]
  )

  // Load existing declaration data
  useEffect(() => {
    if (!declaration?.id) return
    let cancelled = false
    const loadData = async () => {
      dirtyRef.current = false
      setExtractionCompleted(declaration!.status !== 'draft')
      setFileWarnings([])
      setFiles([])
      setReviewIssues([])
      setResolvedIssues(new Set())
      setSelectedType((declaration!.type as DeclarationTypeKey) || null)

      try {
        if (window.api?.getDeclaration && window.api?.getFiles) {
          const [result, fileList] = await Promise.all([
            window.api.getDeclaration(declaration.id),
            window.api.getFiles(declaration.id),
          ])
          if (cancelled) return

          if (Array.isArray(fileList)) {
            setFiles(fileList.map((f: any) => ({
              id: f.id, file_name: f.file_name, extracted_text: f.extracted_text,
            })))
          }

          if (result?.data) {
            const d = result.data
            setFields(d.fields || {})
            setCargoDetails(d.cargo_details || [])
            setFileWarnings(d.file_warnings || [])
          }
        }
      } catch (err: any) {
        console.error('Failed to load declaration data:', err)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [declaration?.id])

  // ═══ Toast ═══
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ═══ Save ═══
  const buildDeclarationData = useCallback(() => ({
    fields,
    cargo_details: cargoDetails,
    extraction_notes: [],
    file_warnings: fileWarnings,
  }), [fields, cargoDetails, fileWarnings])

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
          savingRef.current = false; setIsSaving(false)
          setTimeout(() => handleSaveRef.current(retry + 1), 1000)
          return
        } else {
          showToast(`保存失败: ${result.error}`, 'error')
        }
      }
    } catch (err: any) {
      if (retry < maxRetries) {
        showToast(`保存出错，正在重试 (${retry + 1}/${maxRetries})...`, 'info')
        savingRef.current = false; setIsSaving(false)
        setTimeout(() => handleSaveRef.current(retry + 1), 1000)
        return
      }
      showToast(`保存错误: ${err.message}`, 'error')
    } finally {
      savingRef.current = false; setIsSaving(false)
    }
  }, [declaration, buildDeclarationData])

  // beforeunload + Ctrl+S
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveRef.current() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ═══ File handlers ═══
  const handleFilesImported = useCallback((newFiles: { file_name: string }[]) => {
    setFiles(prev => [...prev, ...newFiles])
    showToast(`已添加 ${newFiles.length} 个文件`)
  }, [])

  const handleRemoveFile = useCallback(async (index: number, fileId?: string) => {
    if (fileId && window.api?.deleteFile) { try { await window.api.deleteFile(fileId) } catch {} }
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ═══ AI Extract ═══
  const handleAIExtract = useCallback(async () => {
    if (!declaration) return
    setIsExtracting(true)
    showToast('AI 提取中...')
    try {
      if (window.api?.aiExtract) {
        const result = await window.api.aiExtract(declaration.id)
        if (result.success && result.data) {
          setFields(result.data.fields || {})
          setCargoDetails(result.data.cargo_details || [])
          setExtractionCompleted(true)
          setFileWarnings(result.data.file_warnings || [])
          if (result.issues && result.issues.length > 0) {
            setReviewIssues(result.issues)
            setResolvedIssues(new Set())
            showToast(`AI 提取完成，发现 ${result.issues.length} 个待确认项`)
          } else {
            setReviewIssues([])
            showToast(`AI 提取完成，已提取 ${Object.keys(result.data.fields).length} 个字段、${result.data.cargo_details.length} 行货物`)
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

  // ═══ Issue handling ═══
  const pendingCount = reviewIssues.length - resolvedIssues.size
  const resolveIssue = (index: number) => { const next = new Set(resolvedIssues); next.add(index); setResolvedIssues(next) }
  const resolveAll = () => setResolvedIssues(new Set(reviewIssues.map((_, i) => i)))

  // ═══ Type selection ═══
  const handleTypeChange = async (typeKey: string) => {
    const newType = typeKey === '__universal' ? null : (typeKey as DeclarationTypeKey)
    setSelectedType(newType)
    if (newType && declaration?.id && window.api?.setDeclarationType) {
      try { await window.api.setDeclarationType(declaration.id, newType) } catch {}
    }
  }

  // ═══ Computed: visible fields based on selected type ═══
  const visibleFields = useMemo(() => {
    if (selectedConfig) {
      return selectedConfig.field_mappings
    }
    // Universal view: show ALL extracted fields, grouped by inferred section
    const allMappings: FieldMapping[] = []
    // Build a lookup of section-per-key from all configs
    const sectionLookup: Record<string, string> = {}
    for (const c of typeConfigs) {
      for (const m of c.field_mappings) {
        if (!sectionLookup[m.source_key]) sectionLookup[m.source_key] = m.section
      }
    }
    for (const section of SECTION_ORDER) {
      for (const [key] of Object.entries(FIELD_LABELS)) {
        if (fields[key] !== undefined) {
          const inferredSection = sectionLookup[key] || 'header'
          if (inferredSection === section) {
            allMappings.push({
              source_key: key, display_label: FIELD_LABELS[key], section: inferredSection as FieldSection,
              required: false, editable: true, field_type: 'text',
            })
          }
        }
      }
    }
    return allMappings
  }, [selectedConfig, fields, typeConfigs])

  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldMapping[]> = {}
    for (const m of visibleFields) {
      if (!groups[m.section]) groups[m.section] = []
      groups[m.section].push(m)
    }
    return groups
  }, [visibleFields])

  const cargoColumns = useMemo(() => {
    if (selectedConfig) return selectedConfig.cargo_column_mappings
    // Universal: show common cargo columns
    return typeConfigs.length > 0
      ? typeConfigs[0].cargo_column_mappings
      : Object.keys(CARGO_FIELD_LABELS).slice(0, 8).map(k => ({
          source_key: k, display_label: CARGO_FIELD_LABELS[k], section: 'cargo' as FieldSection,
          required: false, editable: true, field_type: 'text' as const,
        }))
  }, [selectedConfig, typeConfigs])

  // Missing required fields
  const missingFields = useMemo(() => {
    if (!selectedConfig) return []
    return selectedConfig.field_mappings
      .filter(m => m.required && (fields[m.source_key] === undefined || fields[m.source_key] === null || (typeof fields[m.source_key] === 'string' && fields[m.source_key].trim() === '')))
      .map(m => m.display_label)
  }, [selectedConfig, fields])

  const sevBadge = (severity: string) => {
    const colors: Record<string, string> = { high: 'bg-red-50 text-red-600', medium: 'bg-amber-50 text-amber-600', low: 'bg-sky-50 text-sky-600' }
    const labels: Record<string, string> = { high: '高', medium: '中', low: '低' }
    return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[severity] || colors.medium}`}>{labels[severity] || severity}</span>
  }

  // ═══ Render ═══
  const blockTransition = 'transition-[opacity,transform] duration-300 ease-out'

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 pb-4 shrink-0 drag-region workspace-header">
        <div>
          <h1 className="text-[28px] font-bold">报关单数据</h1>
          <p className="text-muted text-sm mt-1">
            {fields.invoice_number || fields.contract_number || '(未命名)'} · 状态：{statusLabels[declaration!.status]}
          </p>
        </div>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[1200px] mx-auto w-full">

        {/* ═══ Block ①: File Import ═══ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">① 导入单证</h3>
            {extractionCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">&#10003; 已完成</span>
            )}
          </div>
          <div className={extractionCompleted ? 'p-4' : 'p-6'}>
            {extractionCompleted ? (
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                  {files.length > 0 ? files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] bg-surface border border-gray-200">
                      {f.file_name}
                      <button className="text-muted text-sm leading-none cursor-pointer hover:text-red-500" onClick={() => handleRemoveFile(i, f.id)}>&times;</button>
                    </span>
                  )) : <span className="text-muted text-sm">暂未导入文件</span>}
                </div>
                <button onClick={handleAIExtract} disabled={isExtracting || files.length === 0}
                  title={files.length === 0 ? '请先导入单证文件' : ''}
                  className={`shrink-0 ml-4 h-[34px] px-4 rounded-sm text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-1.5 transition-all ${files.length === 0 ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'}`}
                >
                  {isExtracting ? '提取+审核中...' : <><IconAI /><span>重新提取</span></>}
                </button>
              </div>
            ) : (
              <FileDropZone declarationId={declaration!.id} onFilesImported={handleFilesImported} files={files} onRemoveFile={handleRemoveFile} isExtracting={isExtracting} />
            )}
            {!extractionCompleted && files.length > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleAIExtract} disabled={isExtracting}
                  className={`h-[38px] px-5 rounded-sm text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${isExtracting ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 pulse-ai'}`}
                >
                  {isExtracting ? '提取+审核中...' : <><IconAI /><span>AI 提取并审核</span></>}
                </button>
              </div>
            )}
            {isExtracting && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 via-blue-50 to-[#FAFAFE] border border-violet-100">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-muted">AI 正在提取单证数据并审核，请稍候...</div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Block ②: AI Extraction Results ═══ */}
        <div className={`${blockTransition} overflow-hidden`}
          style={{ transform: extractionCompleted ? 'translateY(0)' : 'translateY(-8px)', opacity: extractionCompleted ? 1 : 0, pointerEvents: extractionCompleted ? 'auto' : 'none' }}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
              <h3 className="text-lg font-semibold">② AI 提取结果</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-500">
                <IconAI /><span className="ml-1">AI 已处理</span>
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5 text-sm">
                <span className="text-emerald-600 font-semibold">&#10003; 提取完成</span>
                <span className="text-muted">·</span>
                <span className="text-muted">{Object.keys(fields).length} 个字段</span>
                <span className="text-muted">·</span>
                <span className="text-muted">{cargoDetails.length} 行货物</span>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  { label: '总件数', value: String(cargoDetails.reduce((s: number, d: any) => s + (Number(d.package_count) || 0), 0) || fields.package_count || '—') },
                  { label: '总毛重(KG)', value: String(cargoDetails.reduce((s: number, d: any) => s + (Number(d.gross_weight) || 0), 0) || fields.gross_weight || '—') },
                  { label: '集装箱数', value: String(new Set(cargoDetails.map((d: any) => d.container_number).filter(Boolean)).size || fields.container_count || '—') },
                  { label: '提单数', value: String(new Set(cargoDetails.map((d: any) => d.bill_of_lading_number).filter(Boolean)).size || '—') },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-muted mb-1">{kpi.label}</div>
                    <div className="text-xl font-bold text-ink tabular-nums">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* File warnings */}
              {fileWarnings.length > 0 && (
                <div className="mb-5">
                  <div className="text-sm font-semibold mb-2"><span className="text-red-500">&#9888;</span> 文件提醒 ({fileWarnings.length})</div>
                  <div className="space-y-1.5">
                    {fileWarnings.map((fw, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-[13px]">
                        <span className="text-red-500 font-bold shrink-0 mt-0.5">&#9888;</span>
                        <div><span className="font-medium text-red-700">{fw.file_name}</span><span className="text-red-600"> — {fw.reason}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {reviewIssues.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold"><span className="text-amber-600">&#9888;</span> {pendingCount > 0 ? `${pendingCount} 个待确认项` : '全部已确认'}</span>
                    <div className="flex gap-2">
                      {pendingCount > 0 && <button onClick={resolveAll} className="h-7 px-3 rounded-sm text-xs font-medium border border-gray-200 bg-white text-muted hover:text-emerald-600 hover:border-emerald-300 cursor-pointer transition-all">全部确认</button>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl"><span className="font-bold">&#10003;</span> 未发现明显问题，数据质量良好</div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Block ③: Declaration Form ═══ */}
        <div className={`${blockTransition} overflow-hidden`}
          style={{ transform: extractionCompleted ? 'translateY(0)' : 'translateY(-8px)', opacity: extractionCompleted ? 1 : 0, pointerEvents: extractionCompleted ? 'auto' : 'none' }}>
          <div ref={transportSectionRef} className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
              <h3 className="text-lg font-semibold">③ 申报单数据</h3>
              <div className="flex items-center gap-2 no-drag">
                {/* Type selector */}
                <div className="relative">
                  <select
                    value={selectedType || '__universal'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="h-[34px] rounded-[10px] border border-gray-200 pl-3 pr-8 text-[13px] font-medium outline-none bg-white focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 cursor-pointer appearance-none"
                  >
                  <option value="__universal">通用视图（全部字段）</option>
                  {typeConfigs.map(tc => (
                    <option key={tc.type} value={tc.type}>{tc.title}</option>
                  ))}
                </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none">&#9660;</span>
                </div>
                <button onClick={() => handleSave()} disabled={isSaving}
                  className={`h-[34px] px-4 rounded-sm bg-primary-500 text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-1.5 hover:bg-primary-600 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? '保存中...' : <><IconSave /><span>保存草稿</span><span className="text-[10px] opacity-40 ml-0.5">{navigator.platform?.toLowerCase?.().includes('mac') ? '⌘S' : 'Ctrl+S'}</span></>}
                </button>
              </div>
            </div>

            {selectedConfig && missingFields.length > 0 && (
              <div className="mx-6 mt-4 flex items-center gap-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
                <span className="font-bold">&#9888;</span>
                <span>"{selectedConfig.title}" 必填项缺失: {missingFields.join('、')}</span>
              </div>
            )}

            <div className="p-6">
              {Object.entries(groupedFields).map(([section, mappings]) => (
                <div key={section} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-ink">{SECTION_LABELS[section as FieldSection] || section}</h4>
                    {selectedConfig && (
                      <span className="text-[11px] text-muted">
                        已填 {mappings.filter(m => fields[m.source_key] !== undefined && fields[m.source_key] !== null && !(typeof fields[m.source_key] === 'string' && fields[m.source_key].trim() === '')).length}/{mappings.length}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {mappings.map(m => {
                      const value = fields[m.source_key]
                      const isMissing = selectedConfig && m.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))
                      return (
                        <div key={m.source_key} className="flex flex-col gap-1">
                          <label className="text-[13px] font-medium text-muted">
                            {m.display_label}
                            {m.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          {m.field_type === 'select' ? (
                            <select
                              value={value || ''}
                              onChange={(e) => { markDirty(); setFields({ ...fields, [m.source_key]: e.target.value }) }}
                              className={`h-9 rounded-[10px] border px-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}
                            >
                              <option value="">—</option>
                              {(m.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : m.field_type === 'number' ? (
                            <input type="number"
                              value={value ?? ''}
                              onChange={(e) => { markDirty(); setFields({ ...fields, [m.source_key]: parseFloat(e.target.value) || 0 }) }}
                              className={`h-9 rounded-[10px] border px-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}
                            />
                          ) : m.field_type === 'readonly' ? (
                            <input type="text" value={value || ''} disabled
                              className="h-9 rounded-[10px] border border-gray-200 px-3 text-sm bg-gray-50 opacity-50 font-sans"
                            />
                          ) : (
                            <input type="text"
                              value={value || ''}
                              onChange={(e) => { markDirty(); setFields({ ...fields, [m.source_key]: e.target.value }) }}
                              className={`h-9 rounded-[10px] border px-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}
                            />
                          )}
                          {isMissing && <div className="text-[11px] text-amber-600">"{selectedConfig!.title}" 必填项</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedFields).length === 0 && (
                <div className="text-center py-12 text-muted text-sm">暂无提取数据。导入文件后点击「AI 提取并审核」。</div>
              )}
            </div>
          </div>

          {/* Cargo Details */}
          <div ref={cargoSectionRef} className="mt-6">
            <CargoDetailsTable
              details={cargoDetails}
              onUpdate={(details) => { markDirty(); setCargoDetails(details) }}
              cargoColumns={cargoColumns}
            />
          </div>

        </div>
      </div>

      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white px-6 py-3 rounded-xl text-sm font-medium z-[100] shadow-[0_20px_48px_rgba(15,23,42,0.2)] flex items-center gap-2">
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </main>
  )
}
