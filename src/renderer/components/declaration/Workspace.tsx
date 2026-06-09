import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { DeclarationItem } from '../../App'
import type { ReviewIssue, FileWarning, FieldMapping, DeclarationTypeConfig, DeclarationTypeKey, FieldSection } from '../../../shared/types'
import { FIELD_LABELS, CARGO_FIELD_LABELS, SECTION_LABELS } from '../../../shared/types'
import FileDropZone from './FileDropZone'
import CargoDetailsTable from './CargoDetailsTable'
import ContainerDetailsTable from './ContainerDetailsTable'
import AttachmentPanel from './AttachmentPanel'
import DeclarationPreview from './DeclarationPreview'
import { IconSave, IconAI, IconDocument } from '../shared/Icons'

interface WorkspaceProps {
  declaration: DeclarationItem | null | undefined
  selectedDeclaration: DeclarationItem | null | undefined
  onEnterEdit: () => void
  isEditing: boolean
  onNavigateToHs?: () => void
  recentDeclarations?: DeclarationItem[]
  onSelectDeclaration?: (id: string) => void
  onNewDeclaration?: () => void
}

const SECTION_ORDER: FieldSection[] = ['header', 'transport', 'party', 'port', 'trade', 'customs', 'package']

function TemplateLoader({ selectedType, onLoad }: { selectedType: string | null; onLoad: (data: Record<string, any>) => void }) {
  const [templates, setTemplates] = useState<any[]>([])
  useEffect(() => {
    if (window.api?.templatesList) {
      window.api.templatesList(selectedType || undefined).then((list: any[]) => {
        if (Array.isArray(list)) setTemplates(list)
      }).catch(() => {})
    }
  }, [selectedType])

  if (templates.length === 0) return null
  return (
    <div className="relative">
      <select
        value=""
        onChange={(e) => {
          const t = templates.find(tm => tm.id === e.target.value)
          if (t) {
            try { onLoad(JSON.parse(t.template_data)) } catch {}
          }
        }}
        className="h-[34px] rounded-md border border-gray-200 dark:border-gray-700 pl-2.5 pr-7 text-[12px] font-medium outline-none bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 cursor-pointer appearance-none"
      >
        <option value="">加载模板...</option>
        {templates.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted pointer-events-none">&#9660;</span>
    </div>
  )
}

export default function Workspace({ declaration, selectedDeclaration, onEnterEdit, isEditing, onNavigateToHs, recentDeclarations, onSelectDeclaration, onNewDeclaration }: WorkspaceProps) {
  const statusLabels: Record<string, string> = {
    draft: '草稿', processing: 'AI 提取中', review: '待人工确认', done: '已完成', error: '有错误',
  }

  if (!isEditing && selectedDeclaration && !declaration) {
    return <DeclarationPreview declaration={selectedDeclaration} onEnterEdit={onEnterEdit} />
  }

  if (!declaration && !selectedDeclaration) {
    return (
      <main className="flex-1 flex items-center justify-center overflow-y-auto" style={{ background: `linear-gradient(135deg, rgba(var(--primary-rgb), 0.04) 0%, rgba(var(--primary-rgb), 0.02) 50%, var(--surface) 100%)` }}>
        <div className="text-center py-16 px-8 w-full max-w-[480px]">
          <div className="flex justify-center mb-5">
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-100">
              <IconDocument />
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2">准备开始制单</h3>
          <p className="text-muted text-sm mb-8">从左侧选择申报单，或创建新的申报单</p>
          <button onClick={onNewDeclaration}
            className="h-10 px-6 rounded-sm text-white border-none font-semibold text-sm cursor-pointer transition-colors hover:opacity-90 active:scale-[0.98] mb-10"
            style={{ background: 'var(--gradient)' }}
          >新建申报单</button>
          {(recentDeclarations || []).slice(0, 5).length > 0 && (
            <div className="text-left">
              <div className="text-[12px] uppercase tracking-[0.12em] font-semibold mb-3 text-muted">最近使用</div>
              <div className="space-y-1">
                {(recentDeclarations || []).slice(0, 5).map(d => (
                  <button key={d.id}
                    onClick={() => onSelectDeclaration?.(d.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left cursor-pointer bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 border border-white/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-[background-color,border-color,box-shadow]"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      d.status === 'done' ? 'bg-emerald-400' : d.status === 'review' ? 'bg-amber-400' : d.status === 'draft' ? 'bg-slate-300' : 'bg-sky-400'
                    }`} />
                    <span className="flex-1 text-[13px] font-medium truncate">{d.displayName}</span>
                    <span className="text-[12px] text-muted">{d.cargoCount} 行</span>
                    <span className="text-[12px] text-muted">{d.updatedAt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  // ═══ State ═══
  const [files, setFiles] = useState<{ id?: string; file_name: string; extracted_text?: string; error?: string }[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [showDropZone, setShowDropZone] = useState(false)
  const [attachRefreshKey, setAttachRefreshKey] = useState(0)
  const savingRef = useRef(false)
  const [fields, setFields] = useState<Record<string, any>>({})
  const [cargoDetails, setCargoDetails] = useState<Record<string, any>[]>([])
  const [containerDetails, setContainerDetails] = useState<Record<string, any>[]>([])
  const [extractionCompleted, setExtractionCompleted] = useState(false)
  const [fileWarnings, setFileWarnings] = useState<FileWarning[]>([])
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([])
  const [resolvedIssues, setResolvedIssues] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [relatedNotes, setRelatedNotes] = useState<{ id: string; title: string; hs_code: string; tags: string }[]>([])
  const [selectedType, setSelectedType] = useState<DeclarationTypeKey | null>(null)
  const [typeConfigs, setTypeConfigs] = useState<DeclarationTypeConfig[]>([])
  const [enterprises, setEnterprises] = useState<any[]>([])
  const [customsOffices, setCustomsOffices] = useState<any[]>([])
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

  // Load enterprises + customs offices for selector
  const enterpriseAutoFilled = useRef(false)
  useEffect(() => {
    if (window.api?.enterprisesList) {
      window.api.enterprisesList().then((list: any[]) => {
        if (Array.isArray(list)) setEnterprises(list)
      }).catch(() => {})
    }
    if (window.api?.customsOfficesList) {
      window.api.customsOfficesList().then((list: any[]) => {
        if (Array.isArray(list)) setCustomsOffices(list)
      }).catch(() => {})
    }
  }, [])

  // Auto-fill default enterprise after declaration data loads (avoids race)
  useEffect(() => {
    if (enterpriseAutoFilled.current) return
    const def = enterprises.find((e: any) => e.is_default) || enterprises[0]
    if (def && !fields.declaration_unit_name) {
      enterpriseAutoFilled.current = true
      setFields(prev => ({
        ...prev,
        declaration_unit_name: def.name,
        declaration_unit_credit_code: def.credit_code || '',
        declaration_unit_customs_code: def.customs_code || '',
      }))
    }
  }, [enterprises, fields.declaration_unit_name])

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
      enterpriseAutoFilled.current = false
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
            setContainerDetails(d.container_details || [])
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
    container_details: containerDetails,
    extraction_notes: [],
    file_warnings: fileWarnings,
  }), [fields, cargoDetails, containerDetails, fileWarnings])

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
          setSaveDone(true)
          setTimeout(() => setSaveDone(false), 1800)
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

  // ── Related knowledge base notes ──
  useEffect(() => {
    const hsCodes = [...new Set(cargoDetails.map((d: any) => d.hs_code).filter(Boolean))]
    if (hsCodes.length === 0 || !window.api?.knowledgeRelated) { setRelatedNotes([]); return }
    Promise.all(hsCodes.map((code: string) =>
      window.api.knowledgeRelated(code).then((r: any[]) => Array.isArray(r) ? r : []).catch(() => [])
    )).then((results: any[][]) => {
      const seen = new Set<string>()
      const merged: { id: string; title: string; hs_code: string; tags: string }[] = []
      for (const arr of results) {
        for (const n of arr) {
          if (!seen.has(n.id)) { seen.add(n.id); merged.push(n) }
        }
      }
      setRelatedNotes(merged)
    })
  }, [cargoDetails])

  // ═══ File handlers ═══
  const handleFilesImported = useCallback((newFiles: { file_name: string }[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setAttachRefreshKey(k => k + 1)
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
          setContainerDetails(result.data.container_details || [])
          setExtractionCompleted(true)
          setAttachRefreshKey(k => k + 1)
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

  const containerColumns = useMemo(() => {
    if (selectedConfig?.container_column_mappings) return selectedConfig.container_column_mappings
    return undefined
  }, [selectedConfig])

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
    return <span className={`inline-flex px-1.5 py-0.5 rounded text-[12px] font-semibold ${colors[severity] || colors.medium}`}>{labels[severity] || severity}</span>
  }

  // ═══ Render ═══
  const blockTransition = 'transition-[opacity,transform] duration-300 ease-out'

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 pb-2 shrink-0 drag-region workspace-header">
        <div>
          <h1 className="text-[28px] font-bold">报关单数据</h1>
          <p className="text-muted text-sm mt-1">
            {fields.invoice_number || fields.contract_number || '(未命名)'} · 状态：{statusLabels[declaration!.status]}
          </p>
        </div>
      </div>
      {/* Step progress */}
      <div className="px-8 pb-3 shrink-0 flex items-center gap-2">
        {(() => {
          const activeIdx = extractionCompleted ? 2 : 0
          const steps = [
            { n: 1, label: '导入', done: extractionCompleted },
            { n: 2, label: '提取', done: extractionCompleted },
            { n: 3, label: '编辑', done: false },
          ]
          return steps.map((step, i) => {
            const isActive = i === activeIdx
            return (
              <div key={step.n} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: step.done ? '#22C55E' : isActive ? 'var(--primary)' : undefined }}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${
                    step.done ? 'bg-emerald-400' : isActive ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>{step.done ? '✓' : step.n}</span>
                  {step.label}
                </span>
                {i < 2 && <span className={`w-5 h-px ${extractionCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            )
          })
        })()}
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[1200px] mx-auto w-full">

        {/* ═══ Block ①: File Import ═══ */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">① 导入单证</h3>
            {extractionCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">&#10003; 已完成</span>
            )}
          </div>
          <div className={extractionCompleted ? 'p-4' : 'p-6'}>
            {extractionCompleted ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 flex-1 min-w-0 items-center">
                    {files.length > 0 ? files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] bg-surface border border-gray-200 dark:border-gray-700">
                        {f.file_name}
                        <button className="text-muted text-sm leading-none cursor-pointer hover:text-red-500" onClick={() => handleRemoveFile(i, f.id)}>&times;</button>
                      </span>
                    )) : <span className="text-muted text-sm">暂未导入文件</span>}
                    <button
                      onClick={() => setShowDropZone(v => !v)}
                      className={`h-[30px] px-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${showDropZone ? 'border-primary-300 text-primary-500 bg-primary-50' : 'border-dashed border-gray-300 text-muted hover:border-gray-400 hover:text-ink'}`}
                      title="追加文件"
                    >+ 添加文件</button>
                  </div>
                  <button onClick={handleAIExtract} disabled={isExtracting || files.length === 0}
                    title={files.length === 0 ? '请先导入单证文件' : ''}
                    className={`shrink-0 ml-4 h-[34px] px-4 rounded-sm text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-1.5 transition-colors ${files.length === 0 ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'}`}
                  >
                    {isExtracting ? '提取+审核中...' : <><IconAI /><span>重新提取</span></>}
                  </button>
                </div>
                {showDropZone && (
                  <div className="mt-3">
                    <FileDropZone embedded declarationId={declaration!.id} onFilesImported={(newFiles) => { handleFilesImported(newFiles); setShowDropZone(false) }} files={[]} onRemoveFile={() => {}} isExtracting={false} />
                  </div>
                )}
              </div>
            ) : (
              <FileDropZone declarationId={declaration!.id} onFilesImported={handleFilesImported} files={files} onRemoveFile={handleRemoveFile} isExtracting={isExtracting} />
            )}
            {!extractionCompleted && files.length > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleAIExtract} disabled={isExtracting}
                  className={`h-[38px] px-5 rounded-sm text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-colors ${isExtracting ? 'bg-primary-300 cursor-not-allowed' : 'transition-all hover:shadow-lg hover:shadow-primary-500/20 pulse-ai" style={{ background: "var(--gradient) }}'}`}
                >
                  {isExtracting ? '提取+审核中...' : <><IconAI /><span>AI 提取并审核</span></>}
                </button>
              </div>
            )}
            {isExtracting && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: `linear-gradient(135deg, rgba(var(--primary-rgb), 0.06), rgba(var(--primary-rgb), 0.02), var(--surface))`, borderColor: `rgba(var(--primary-rgb), 0.12)` }}>
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-muted">AI 正在提取单证数据并审核，请稍候...</div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Block ②: AI Extraction Results ═══ */}
        <div className={`${blockTransition} overflow-hidden`}
          style={{ transform: extractionCompleted ? 'translateY(0)' : 'translateY(-8px)', opacity: extractionCompleted ? 1 : 0, pointerEvents: extractionCompleted ? 'auto' : 'none' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
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
                  <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-gray-100 dark:border-gray-800">
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
                      {pendingCount > 0 && <button onClick={resolveAll} className="h-7 px-3 rounded-sm text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted hover:text-emerald-600 hover:border-emerald-300 cursor-pointer transition-colors">全部确认</button>}
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {reviewIssues.map((issue, i) => {
                      const isResolved = resolvedIssues.has(i)
                      return (
                        <div key={i}
                          className={`flex items-start gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-50 dark:hover:bg-gray-800 dark:bg-gray-800 ${isResolved ? 'opacity-40' : ''}`}
                        >
                          <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold ${
                            isResolved ? 'bg-emerald-100 text-emerald-600' : issue.severity === 'high' ? 'bg-red-100 text-red-600' : issue.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
                          }`}>
                            {isResolved ? '✓' : '!'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium">{issue.field_path}</span>
                              {sevBadge(issue.severity)}
                            </div>
                            <div className={`text-[12px] mt-0.5 ${isResolved ? 'text-muted line-through' : 'text-muted'}`}>{issue.question}</div>
                            {issue.suggestion && !isResolved && (
                              <div className="text-[12px] text-sky-600 mt-0.5">→ {issue.suggestion}</div>
                            )}
                          </div>
                          {!isResolved && (
                            <button onClick={() => resolveIssue(i)}
                              className="shrink-0 h-6 px-2 rounded-sm text-[12px] font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted hover:text-emerald-600 hover:border-emerald-300 cursor-pointer transition-colors"
                            >确认</button>
                          )}
                        </div>
                      )
                    })}
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
          <div ref={transportSectionRef} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">③ 申报单数据</h3>
              <div className="flex items-center gap-2 no-drag">
                {/* Enterprise selector */}
                {enterprises.length > 0 && (
                  <div className="relative">
                    <select
                      value=""
                      onChange={(e) => {
                        const ent = enterprises.find(en => en.id === e.target.value)
                        if (ent) {
                          markDirty()
                          setFields(prev => ({
                            ...prev,
                            declaration_unit_name: ent.name,
                            declaration_unit_credit_code: ent.credit_code || '',
                            declaration_unit_customs_code: ent.customs_code || '',
                          }))
                        }
                      }}
                      className="h-[34px] rounded-md border border-gray-200 dark:border-gray-700 pl-2.5 pr-7 text-[12px] font-medium outline-none bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 cursor-pointer appearance-none"
                    >
                      <option value="">选择申报单位...</option>
                      {enterprises.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.short_name || e.name}{e.is_default ? ' (默认)' : ''}</option>
                      ))}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted pointer-events-none">&#9660;</span>
                  </div>
                )}
                {/* Type selector */}
                <div className="relative">
                  <select
                    value={selectedType || '__universal'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="h-[34px] rounded-md border border-gray-200 dark:border-gray-700 pl-3 pr-8 text-[13px] font-medium outline-none bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 cursor-pointer appearance-none"
                  >
                  <option value="__universal">通用视图（全部字段）</option>
                  {typeConfigs.map(tc => (
                    <option key={tc.type} value={tc.type}>{tc.title}</option>
                  ))}
                </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted pointer-events-none">&#9660;</span>
                </div>
                {/* Export buttons — transit only */}
                {selectedType === 'transit_transport' && (
                  <>
                    <button
                      onClick={async () => {
                        if (!window.api?.exportTransitExcel) return
                        showToast('正在导出 Excel...')
                        const res = await window.api.exportTransitExcel(declaration!.id)
                        if (res.success) showToast('Excel 已导出')
                        else showToast(`导出失败: ${res.error}`, 'error')
                      }}
                      className="h-[34px] px-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted text-[13px] font-medium cursor-pointer hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                      title="导出 Excel"
                    >导出 Excel</button>
                    <button
                      onClick={async () => {
                        if (!window.api?.exportTransitPdf) return
                        showToast('正在导出 PDF...')
                        const res = await window.api.exportTransitPdf(declaration!.id)
                        if (res.success) showToast('PDF 已导出')
                        else showToast(`导出失败: ${res.error}`, 'error')
                      }}
                      className="h-[34px] px-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted text-[13px] font-medium cursor-pointer hover:text-red-500 hover:border-red-300 transition-colors"
                      title="导出 PDF"
                    >导出 PDF</button>
                    <span className="w-px h-5 bg-gray-200" />
                  </>
                )}
                {/* Template selector */}
                <TemplateLoader
                  selectedType={selectedType}
                  onLoad={(data) => { markDirty(); setFields(prev => ({ ...prev, ...data })); showToast('模板已加载') }}
                />
                {/* Save as template */}
                <button
                  onClick={async () => {
                    const name = prompt('模板名称（如：天津→二连 转关）')
                    if (!name?.trim() || !window.api?.templatesSave) return
                    const templateKeys = [
                      'customs_declaration_port', 'entry_exit_port', 'declaration_unit_name',
                      'declaration_unit_credit_code', 'declaration_unit_customs_code',
                      'domestic_transport_mode', 'domestic_transport_tool_name', 'carrier_name',
                      'transport_mode', 'vessel_name_en', 'consignee_name', 'notes',
                    ]
                    const templateData: Record<string, any> = {}
                    for (const k of templateKeys) {
                      if (fields[k] !== undefined && fields[k] !== null && fields[k] !== '') {
                        templateData[k] = fields[k]
                      }
                    }
                    await window.api.templatesSave({ name: name.trim(), type_key: selectedType || 'transit_transport', template_data: JSON.stringify(templateData) })
                    showToast('模板已保存')
                  }}
                  className="h-[34px] px-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted text-[13px] font-medium cursor-pointer hover:text-ink hover:bg-surface dark:hover:bg-gray-800 transition-colors"
                  title="保存当前基本信息为模板"
                >存为模板</button>
                <button onClick={() => handleSave()} disabled={isSaving}
                  className={`h-[34px] px-4 rounded-sm text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-1.5 transition-colors ${saveDone ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-primary-500 hover:bg-primary-600'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? '保存中...' : saveDone ? <><span>✓</span><span>已保存</span></> : <><IconSave /><span>保存草稿</span><span className="text-[12px] opacity-40 ml-0.5">{navigator.platform?.toLowerCase?.().includes('mac') ? '⌘S' : 'Ctrl+S'}</span></>}
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
                      <span className="text-[12px] text-muted">
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
                              className={`h-9 rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] dark:bg-gray-800 focus:bg-white dark:bg-gray-900 font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                              <option value="">—</option>
                              {(m.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : m.field_type === 'number' ? (
                            <input type="number"
                              value={value ?? ''}
                              onChange={(e) => { markDirty(); setFields({ ...fields, [m.source_key]: parseFloat(e.target.value) || 0 }) }}
                              className={`h-9 rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] dark:bg-gray-800 focus:bg-white dark:bg-gray-900 font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 dark:border-gray-700'}`}
                            />
                          ) : m.field_type === 'readonly' ? (
                            <input type="text" value={value || ''} disabled
                              className="h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-sm bg-gray-50 opacity-50 font-sans"
                            />
                          ) : (
                            <input type="text"
                              value={value || ''}
                              onChange={(e) => { markDirty(); setFields({ ...fields, [m.source_key]: e.target.value }) }}
                              list={(m.source_key === 'customs_declaration_port' || m.source_key === 'entry_exit_port') ? 'customs-offices' : undefined}
                              className={`h-9 rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] dark:bg-gray-800 focus:bg-white dark:bg-gray-900 font-sans ${isMissing ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 dark:border-gray-700'}`}
                            />
                          )}
                          {isMissing && <div className="text-[12px] text-amber-600">"{selectedConfig!.title}" 必填项</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedFields).length === 0 && (
                <div className="text-center py-12 text-muted text-sm">暂无提取数据。导入文件后点击「AI 提取并审核」。</div>
              )}
              {customsOffices.length > 0 && (
                <datalist id="customs-offices">
                  {customsOffices.map((o: any) => (
                    <option key={o.code} value={`${o.name} (${o.code})`} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          {/* Container Details — only for transit declaration */}
          {containerColumns && containerColumns.length > 0 && (
            <div className="mt-6">
              <ContainerDetailsTable
                details={containerDetails}
                onUpdate={(details) => { markDirty(); setContainerDetails(details) }}
                containerColumns={containerColumns}
              />
            </div>
          )}

          {/* Cargo Details */}
          <div ref={cargoSectionRef} className="mt-6">
            <CargoDetailsTable
              details={cargoDetails}
              onUpdate={(details) => { markDirty(); setCargoDetails(details) }}
              cargoColumns={cargoColumns}
            />
          </div>

          {/* Attachment Management */}
          <div className="mt-6">
            <AttachmentPanel declarationId={declaration!.id} refreshKey={attachRefreshKey} />
          </div>

          {/* Related Knowledge Base Notes */}
          {relatedNotes.length > 0 && (
            <div className="mt-6 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-800/50">
              <div className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-3">相关知识库笔记</div>
              <div className="space-y-1">
                {relatedNotes.slice(0, 5).map(n => (
                  <div key={n.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="font-medium truncate flex-1">{n.title}</span>
                    {n.hs_code && <span className="text-[12px] font-mono text-muted shrink-0">HS: {n.hs_code}</span>}
                    {(() => { try { const tags = JSON.parse(n.tags); return tags.slice(0, 2).map((t: string, i: number) => <span key={i} className="text-[12px] text-muted bg-gray-100 dark:bg-gray-700 px-1 rounded shrink-0">{t}</span>) } catch { return null } })()}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white px-6 py-3 rounded-xl text-sm font-medium z-[100] toast-enter shadow-[0_20px_48px_rgba(15,23,42,0.2)] flex items-center gap-2">
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </main>
  )
}
