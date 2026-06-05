import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { IconFile } from './Icons'

interface BatchResult {
  row_index: number
  product_info: string
  hs_code: string | null
  hs_description: string | null
  confidence: string | null
  mfn_rate: string | null
  vat_rate: string | null
  supervision_conditions: string | null
  rationale: string | null
  tariff_text: string | null
  assumptions: string | null
}

interface Props {
  onBack: () => void
}

export default function BatchClassifier({ onBack }: Props) {
  const { theme } = useTheme()
  const p = (alpha: number) => `rgba(${theme.primaryRgb},${alpha})`
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showStopConfirm, setShowStopConfirm] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // ESC to confirm stop during processing
  useEffect(() => {
    if (!processing) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowStopConfirm(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [processing])

  const processFile = useCallback(async (filePath: string) => {
    setProcessing(true)
    try {
      if (window.api?.hsBatchClassify) {
        const res = await window.api.hsBatchClassify(filePath)
        if (res.success && res.results) {
          setResults(res.results)
        } else {
          showToast(`归类失败: ${res.error || '未知错误'}`)
        }
      }
    } catch (err: any) { showToast(`错误: ${err.message}`) }
    finally { setProcessing(false) }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const f = files[0]
    try {
      const p = window.api.getFilePath(f)
      if (p) {
        const name = f.name || p.split('/').pop() || p.split('\\').pop() || ''
        setFileName(name)
        await processFile(p)
      }
    } catch (err: any) { console.error('Drop error:', err) }
  }, [processFile])

  const handleClick = async () => {
    if (!window.api?.hsOpenBatchFile) return
    const path = await window.api.hsOpenBatchFile()
    if (path) {
      setFileName(path.split('/').pop() || path.split('\\').pop() || '')
      await processFile(path)
    }
  }

  const handleExport = async () => {
    if (!window.api?.hsExportExcel) return
    const res = await window.api.hsExportExcel(results)
    if (res.success) showToast('已导出')
    else showToast(`导出失败: ${res.error}`)
  }

  const handleCopyTable = () => {
    const header = '序号\t商品信息\tHS编码\t货品名称\t置信度\t最惠国关税\t增值税\t监管条件\t归类依据\tAI假设'
    const rows = results.map(r => [
      r.row_index + 1, r.product_info, r.hs_code || '', r.hs_description || '',
      r.confidence === 'high' ? '高' : '低', r.mfn_rate || '', r.vat_rate || '',
      r.supervision_conditions || '', (r.rationale || '').slice(0, 200), r.assumptions || '',
    ].join('\t'))
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    showToast('已复制表格')
  }

  const highCount = results.filter(r => r.confidence === 'high').length
  const lowCount = results.filter(r => r.confidence !== 'high').length

  // ═══ Empty/Upload ═══
  if (!processing && !results.length) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-surface">
        <div className="w-full max-w-[600px] px-8 -mt-16 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${p(0.1)}, ${p(0.03)})` }}>
            <IconFile />
          </div>
          <h1 className="text-[22px] font-bold mb-2 text-ink">批量归类</h1>
          <p className="text-[13px] text-muted mb-8">上传 Excel 清单，一次性处理多个品名的 HS 编码归类</p>

          <div
            className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors ${
              dragOver ? 'border-primary-500 border-solid bg-primary-50' : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-primary-50/30'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="mb-3 opacity-30"><IconFile /></div>
            <div className="font-semibold text-[15px] mb-1">拖拽 Excel 文件到此处</div>
            <div className="text-[13px] text-muted">或点击选择文件 · 支持 .xlsx / .xls</div>
          </div>

          <p className="text-[12px] mt-5" style={{ color: '#94a3b8' }}>
            AI 将自动识别表头中的品名列和辅助信息列，无需手动指定列顺序。
          </p>

          <button onClick={onBack} className="mt-8 h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink cursor-pointer transition-colors no-drag">← 返回</button>
        </div>
      </main>
    )
  }

  // ═══ Processing ═══
  if (processing) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-surface">
        <div className="flex flex-col items-center -mt-8">
          <div className="text-sm font-semibold mb-4 px-4 py-2 rounded-xl" style={{ background: p(0.05), color: theme.primary }}>{fileName}</div>
          <div className="w-48 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: p(0.08) }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.accentForeground})`, width: '60%' }} />
          </div>
          <div className="text-sm text-muted">正在检索税则并分析归类... 按 ESC 取消</div>
        </div>

        {/* Stop confirmation dialog */}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.3)' }} onClick={() => setShowStopConfirm(false)}>
            <div className="bg-white rounded-2xl shadow-panel p-6 mx-8 max-w-[360px] w-full" onClick={e => e.stopPropagation()}>
              <div className="text-[15px] font-semibold mb-2">确认停止批量归类？</div>
              <div className="text-[13px] text-muted mb-5">当前处理进度将丢失，已返回的结果不会保存。</div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowStopConfirm(false)}
                  className="h-9 px-4 rounded-lg text-[13px] font-medium cursor-pointer bg-white border border-gray-200 text-muted hover:bg-surface transition-colors"
                >取消</button>
                <button onClick={onBack}
                  className="h-9 px-4 rounded-sm text-[13px] font-semibold cursor-pointer text-white border-none transition-colors hover:opacity-90"
                  style={{ background: theme.primary }}
                >停止并返回</button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // ═══ Results ═══
  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      <div className="px-8 pt-5 pb-3 shrink-0 drag-region flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="no-drag h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink cursor-pointer transition-colors">← 返回</button>
          <div>
            <h2 className="text-lg font-semibold">批量归类</h2>
            <p className="text-xs text-muted">{fileName} · {results.length} 行 · 高置信 {highCount} · 低置信 {lowCount}</p>
          </div>
        </div>
        <div className="flex gap-2 no-drag">
          <button onClick={handleCopyTable} className="h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink cursor-pointer transition-colors">复制表格</button>
          <button onClick={handleExport} className="h-7 px-3 rounded-full text-[12px] text-white border-none font-medium cursor-pointer transition-colors"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accentForeground})` }}>导出 Excel</button>
        </div>
      </div>

      <div className="px-8 pb-12 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: '#1E293B' }}>
              {['#', '商品信息', 'HS编码', '置信度', '关税', '增值税', '监管', '依据摘要'].map(h => (
                <th key={h} className="px-3 py-2.5 text-[11px] font-semibold text-left uppercase tracking-wider" style={{ color: '#e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const isLow = r.confidence !== 'high'
              const expanded = expandedRow === i
              return (
                <>
                  <tr key={i}
                    onClick={() => setExpandedRow(expanded ? null : i)}
                    className={`cursor-pointer transition-colors ${isLow ? '' : 'hover:bg-slate-50'}`}
                    style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td className="px-3 py-2.5 text-xs text-muted">{r.row_index + 1}</td>
                    <td className="px-3 py-2.5 text-[13px] max-w-[240px] truncate" title={r.product_info}>{r.product_info}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[13px] font-mono font-semibold" style={{ color: theme.primary }}>{r.hs_code || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isLow ? '' : ''}`}
                        style={isLow ? { background: '#FFF7ED', color: '#C2410C' } : { background: p(0.08), color: theme.primary }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLow ? '#F97316' : theme.primary }} />{isLow ? '低' : '高'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">{r.mfn_rate || '—'}</td>
                    <td className="px-3 py-2.5 text-[13px]">{r.vat_rate || '—'}</td>
                    <td className="px-3 py-2.5 text-[13px]">{r.supervision_conditions || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted max-w-[200px] truncate">{(r.rationale || '').slice(0, 80)}</td>
                  </tr>
                  {expanded && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={8} className="px-4 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid #e2e8f0' }}>
                        <div className="text-[13px] space-y-2">
                          <div><span className="font-semibold text-muted">商品信息：</span>{r.product_info}</div>
                          {r.rationale && <div><span className="font-semibold text-muted">归类依据：</span><span style={{ color: '#475569' }}>{r.rationale}</span></div>}
                          {r.tariff_text && <div><span className="font-semibold text-muted">税则原文：</span><pre className="text-[12px] mt-1 p-2 rounded-lg font-mono whitespace-pre-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}>{r.tariff_text}</pre></div>}
                          {isLow && r.assumptions && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                              <span className="text-amber-600 font-bold text-xs shrink-0 mt-0.5">!</span>
                              <div><span className="text-xs font-semibold" style={{ color: '#C2410C' }}>AI 假设：</span><span className="text-[12px]" style={{ color: '#9A3412' }}>{r.assumptions}</span></div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100] toast-enter" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
    </main>
  )
}
