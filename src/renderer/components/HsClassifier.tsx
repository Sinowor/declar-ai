import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'
import { IconSearchNav } from './Icons'

interface HsResult {
  id: string; product_description: string; hs_code: string | null
  hs_description: string | null; confidence: string | null
  mfn_rate: string | null; vat_rate: string | null
  supervision_conditions: string | null; rationale: string | null
  alternatives: string | null; tariff_text: string | null
  code_verified: boolean; created_at: string
}

const confLabel: Record<string, string> = { high: '高置信度', medium: '中置信度', low: '低置信度' }
const placeholders = [
  '例如：真空泵，不锈钢材质，-30psi真空度，1L/min，134.4W，医疗用途',
  '例如：汽车发动机零件，金属，适用于轿车进气系统',
  '例如：LED灯泡，家用照明，10W，E27螺口，色温3000K',
]
const shortcuts = ['真空泵', 'LED灯泡', '汽车配件', '棉制T恤', '不锈钢阀门']
const processingSteps = ['提取商品关键词', '检索税则数据库', 'AI 归类分析']

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  return `${Math.floor(hr / 24)} 天前`
}

export default function HsClassifier({ onBatchMode }: { onBatchMode?: () => void }) {
  const { theme } = useTheme()
  const p = (alpha: number) => `rgba(${theme.primaryRgb},${alpha})`
  const confDot: Record<string, string> = { high: theme.primary, medium: p(0.45), low: '#cbd5e1' }

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [result, setResult] = useState<HsResult | null>(null)
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [aiQuestion, setAiQuestion] = useState('')
  const [infoAssumed, setInfoAssumed] = useState(false)
  const [assumptions, setAssumptions] = useState('')
  const [history, setHistory] = useState<HsResult[]>([])
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    if (window.api?.hsHistory) {
      window.api.hsHistory().then((data: HsResult[]) => {
        if (Array.isArray(data)) setHistory(data.slice(0, 20))
      }).catch(() => {})
    }
  }, [result])

  useEffect(() => {
    if (input || focused) return
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % placeholders.length), 3000)
    return () => clearInterval(t)
  }, [input, focused])

  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }
  }, [input])

  const doClassify = async (skipInfo = false) => {
    if (!input.trim() || analyzing) return
    setAnalyzing(true); setProcessingStep(0); setNeedsMoreInfo(false); setInfoAssumed(false); setAssumptions(''); setShowAllHistory(false)
    const s1 = setTimeout(() => setProcessingStep(1), 700)
    const s2 = setTimeout(() => setProcessingStep(2), 1500)
    try {
      if (window.api?.hsClassify) {
        const res = await window.api.hsClassify(input.trim(), skipInfo)
        clearTimeout(s1); clearTimeout(s2); setProcessingStep(3)
        await new Promise(r => setTimeout(r, 400))
        if (res.needsMoreInfo) {
          setNeedsMoreInfo(true)
          setMissingFields(res.missingFields || [])
          setAiQuestion(res.question || '')
        } else if (res.success && res.result) {
          setResult(res.result)
          setInfoAssumed(res.infoAssumed || false)
          setAssumptions(res.assumptions || '')
        } else {
          showToast(`归类失败: ${res.error || '未知错误'}`)
        }
      }
    } catch (err: any) { showToast(`错误: ${err.message}`) }
    finally { setAnalyzing(false); setProcessingStep(0) }
  }

  const handleCopyCode = () => {
    if (result?.hs_code) { navigator.clipboard.writeText(result.hs_code); showToast('HS 编码已复制') }
  }

  const handleHistoryClick = (item: HsResult) => {
    setResult(item); setInput(item.product_description); setShowAllHistory(false); setNeedsMoreInfo(false)
  }

  const handleNewQuery = () => {
    setResult(null); setInput(''); setShowAllHistory(false); setNeedsMoreInfo(false); setInfoAssumed(false); setAssumptions('')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ═══ Processing ═══
  if (analyzing) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 45%, ${p(0.08)} 0%, transparent 60%)` }}>
        <style>{`
          @keyframes logoRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes logoPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.04); opacity: 1; } }
          @keyframes ringExpand { 0% { transform: scale(0.85); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
          @keyframes stepIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
          .logo-orbit { animation: logoRotate 20s linear infinite; }
          .logo-core { animation: logoPulse 3s ease-in-out infinite; }
          .step-enter { animation: stepIn 0.4s ease-out both; }
        `}</style>

        {/* Ambient rings */}
        <div className="absolute" style={{ width: 160, height: 160 }}>
          <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${p(0.1)}`, animation: 'ringExpand 3s ease-out infinite' }} />
          <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${p(0.08)}`, animation: 'ringExpand 3s ease-out 1s infinite' }} />
          <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${p(0.06)}`, animation: 'ringExpand 3s ease-out 2s infinite' }} />
        </div>

        {/* Animated Logo */}
        <div className="logo-core relative z-10 mb-8">
          <div className="logo-orbit">
            <Logo size={64} />
          </div>
        </div>

        {/* Product name */}
        <div className="relative z-10 text-[15px] font-semibold mb-10 px-5 py-2 rounded-xl" style={{ background: p(0.05), color: theme.primary }}>
          {input.length > 50 ? input.slice(0, 50) + '...' : input}
        </div>

        {/* Steps — subtle, refined */}
        <div className="relative z-10 flex flex-col gap-2">
          {processingSteps.map((label, i) => {
            const done = processingStep > i; const active = processingStep === i
            return (
              <div key={label} className="step-enter flex items-center gap-3 justify-center" style={{ animationDelay: `${i * 0.12}s` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-500"
                  style={done ? { background: p(0.12), color: theme.primary } : active ? { background: theme.primary, color: '#fff' } : { color: '#cbd5e1' }}>
                  {done ? '✓' : active ? '' : i + 1}
                </span>
                <span className="text-[13px] transition-colors duration-500"
                  style={{ color: done ? theme.primary : active ? theme.primary : '#94a3b8' }}>
                  {label}
                </span>
                {active && (
                  <span className="flex gap-1 ml-0.5">
                    <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary }} />
                    <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: '0.2s' }} />
                    <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: '0.4s' }} />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </main>
    )
  }

  // ═══ Supplement view — AI needs more info ═══
  if (needsMoreInfo) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-surface">
        <div className="w-full max-w-[640px] px-8 -mt-12">
          {/* AI question card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5" style={{ boxShadow: `0 0 48px ${p(0.08)}, 0 1px 3px rgba(15,23,42,0.04)` }}>
            <div className="flex items-start gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${p(0.12)}, ${p(0.04)})` }}>
                <span className="text-sm">🧠</span>
              </span>
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: theme.primary }}>AI 需要更多信息</div>
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#475569' }}>{aiQuestion}</div>
              </div>
            </div>
            {missingFields.length > 0 && (
              <div className="flex gap-2 flex-wrap ml-12">
                {missingFields.map(f => (
                  <span key={f} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium" style={{ background: p(0.06), color: theme.primary }}>{f}</span>
                ))}
              </div>
            )}
          </div>

          {/* Edit area */}
          <div className="bg-white border-2 border-gray-200 focus-within:border-primary-500 rounded-2xl transition-[border-color,box-shadow] duration-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doClassify() }}
              placeholder="在此补充商品信息..."
              className="w-full min-h-[80px] resize-none border-0 outline-none text-[15px] leading-relaxed font-sans bg-transparent px-5 py-4"
              style={{ color: '#1e293b' }} autoFocus
            />
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
              <button onClick={() => doClassify(true)}
                className="h-9 px-4 rounded-lg text-[13px] font-medium cursor-pointer transition-colors bg-white border"
                style={{ borderColor: p(0.2), color: theme.primary }}
              >跳过，直接归类</button>
              <button onClick={() => doClassify(false)}
                className="h-9 px-5 rounded-sm text-white border-none font-semibold text-[13px] cursor-pointer transition-colors hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accentForeground})` }}
              >补充信息并归类</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ═══ History full view ═══
  if (showAllHistory) {
    return (
      <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
        <div className="px-8 pt-5 pb-3 shrink-0 drag-region flex items-center justify-between">
          <h2 className="text-lg font-semibold">归类历史</h2>
          <button onClick={() => setShowAllHistory(false)} className="no-drag h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink cursor-pointer transition-colors">返回</button>
        </div>
        <div className="px-8 pb-12 flex-1 max-w-[900px] mx-auto w-full">
          {history.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted text-sm">暂无归类记录</div>
          ) : (
            <div className="space-y-1">
              {history.map(item => (
                <button key={item.id} onClick={() => handleHistoryClick(item)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-left cursor-pointer bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-[background-color,border-color,box-shadow]"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: confDot[item.confidence || 'low'] }} />
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">{item.product_description}</span>
                  <span className="text-[13px] font-mono font-semibold shrink-0" style={{ color: theme.primary }}>{item.hs_code || '—'}</span>
                  <span className="text-[11px] text-muted shrink-0 w-16 text-right">{timeAgo(item.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ═══ Empty State ═══
  if (!result) {
    const recentHistory = history.slice(0, 5)
    return (
      <main className="flex-1 overflow-y-auto flex flex-col items-center bg-surface" style={{ paddingTop: '14vh' }}>
        <div className="w-full max-w-[600px] px-8">
          <h1 className="text-center text-[24px] font-bold mb-2 text-ink">AI 预归类</h1>
          <p className="text-center text-[13px] text-muted mb-8">智能检索《进出口税则》，结果仅供参考</p>

          <div className={`bg-white border-2 rounded-2xl transition-[border-color,box-shadow] duration-200 ${
            focused ? 'border-primary-500 shadow-[0_0_0_4px_var(--primary-rgb)_0.06]' : 'border-gray-200 shadow-card'
          }`} style={focused ? { boxShadow: `0 0 0 4px ${p(0.06)}` } : {}}>
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doClassify() }}
              placeholder={input || focused ? '描述商品名称、材质、用途、参数...' : placeholders[placeholderIdx]}
              className="w-full min-h-[100px] resize-none border-0 outline-none text-[15px] leading-relaxed font-sans bg-transparent px-5 py-4 hs-ph"
              style={{ color: '#1e293b' }} autoFocus
            />
            <style>{`
              @keyframes phFade { 0%,100%{opacity:0} 15%,85%{opacity:0.35} }
              .hs-ph::placeholder { animation: phFade 3s ease-in-out infinite }
              .hs-ph:focus::placeholder { animation: none; opacity: 0.3 }
            `}</style>
            <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100">
              <button onClick={() => doClassify()} disabled={!input.trim()}
                className="h-9 px-5 rounded-sm text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-2 transition-colors hover:opacity-90 active:scale-[0.98]"
                style={{ background: input.trim() ? `linear-gradient(135deg, ${theme.primary}, ${theme.accentForeground})` : '#94a3b8' }}
              >开始归类分析 <span className="text-[10px] opacity-40 ml-0.5">⌘↵</span></button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <span className="text-[12px]" style={{ color: '#94a3b8' }}>
              试试{' '}
              {shortcuts.map((s, i) => (
                <span key={s}>
                  <button onClick={() => { setInput(s); textareaRef.current?.focus() }}
                    className="cursor-pointer bg-transparent border-none p-0 hover:text-primary-500 transition-colors"
                    style={{ color: '#94a3b8' }}>{s}</button>
                  {i < shortcuts.length - 1 && <span style={{ color: '#cbd5e1' }}> · </span>}
                </span>
              ))}
            </span>
          </div>

          {recentHistory.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: '#94a3b8' }}>最近归类</span>
                {history.length > 5 && (
                  <button onClick={() => setShowAllHistory(true)} className="text-[11px] bg-transparent border-none cursor-pointer hover:text-primary-500 transition-colors" style={{ color: '#94a3b8' }}>查看全部 →</button>
                )}
              </div>
              <div className="space-y-0.5">
                {recentHistory.map(item => (
                  <button key={item.id} onClick={() => handleHistoryClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left cursor-pointer bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-[background-color,border-color,box-shadow]"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: confDot[item.confidence || 'low'] }} />
                    <span className="flex-1 min-w-0 text-[13px] font-medium truncate">{item.product_description}</span>
                    <span className="text-[13px] font-mono font-semibold shrink-0" style={{ color: theme.primary }}>{item.hs_code || '—'}</span>
                    <span className="text-[11px] text-muted shrink-0 w-14 text-right">{timeAgo(item.created_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[11px] mt-8" style={{ color: '#cbd5e1' }}>
            基于 AI 大语言模型对《中华人民共和国进出口税则》进行检索与解析，归类结果仅供报关参考，最终以海关认定为准
          </p>

          {onBatchMode && (
            <button onClick={onBatchMode}
              className="w-full mt-5 flex items-center justify-between px-5 py-3.5 rounded-xl cursor-pointer border transition-[border-color,background-color] hover:shadow-sm text-left"
              style={{ background: `linear-gradient(135deg, ${p(0.04)}, ${p(0.01)})`, borderColor: p(0.12) }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = p(0.25); (e.target as HTMLElement).style.background = `linear-gradient(135deg, ${p(0.07)}, ${p(0.02)})` }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = p(0.12); (e.target as HTMLElement).style.background = `linear-gradient(135deg, ${p(0.04)}, ${p(0.01)})` }}
            >
              <div>
                <div className="text-[13px] font-semibold" style={{ color: theme.primary }}>批量归类</div>
                <div className="text-[12px] text-muted mt-0.5">上传 Excel 清单，一次性处理多个品名</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: theme.primary, opacity: 0.5 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
          )}
        </div>

        {toast && (
          <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100] toast-enter" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
            <span className="text-emerald-400">✓</span> {toast}
          </div>
        )}
      </main>
    )
  }

  // ═══ Results ═══
  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      <div className="px-8 pt-5 pb-3 shrink-0 drag-region flex items-center gap-3">
        <button onClick={handleNewQuery} className="no-drag shrink-0 h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink hover:border-gray-300 cursor-pointer transition-colors inline-flex items-center gap-1">← 返回</button>
        <div className="flex items-center gap-2 min-w-0 flex-1"><span className="text-sm text-muted truncate">{result.product_description}</span></div>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-4 flex-1 max-w-[960px] mx-auto w-full">
        <style>{`
          @keyframes resultIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .result-enter { animation: resultIn 0.45s ease-out both; }
        `}</style>

        <div className="result-enter bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden" style={{ animationDelay: '0s' }}>
          <div className="p-6 flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-3">推荐 HS 编码</div>
              <div className="flex items-baseline gap-3">
                <span className="text-[48px] font-bold tracking-tight font-mono" style={{ color: theme.primary, letterSpacing: '-0.03em' }}>{result.hs_code || '—'}</span>
                {result.confidence && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: p(0.08), color: theme.primary }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: confDot[result.confidence] || confDot.low }} />{confLabel[result.confidence] || result.confidence}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted mt-2">{result.hs_description || '—'}</div>
              {!result.code_verified && (
                <div className="flex items-center gap-1.5 mt-3 text-[12px] px-3 py-1.5 rounded-lg" style={{ background: p(0.06), color: theme.primary }}>
                  <span className="font-bold">!</span> 该编码未在税则原文中精确匹配，请人工核实
                </div>
              )}
              {infoAssumed && assumptions && (
                <div className="mt-3 text-[12px] leading-relaxed px-4 py-3 rounded-xl border" style={{ borderColor: p(0.15), background: p(0.03), color: '#475569' }}>
                  <div className="font-semibold mb-1.5" style={{ color: theme.primary }}>基于 AI 假设信息归类</div>
                  <div className="whitespace-pre-wrap">{assumptions}</div>
                  <div className="mt-2 text-[11px]" style={{ color: '#94a3b8' }}>以上信息非用户提供的真实完整数据，归类仅供报关参考</div>
                </div>
              )}
            </div>
            <button onClick={handleCopyCode} className="h-9 px-4 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors shrink-0"
              style={{ borderColor: p(0.2), color: theme.primary, background: p(0.03) }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = p(0.07) }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = p(0.03) }}>复制编码</button>
          </div>

          <div className="grid grid-cols-4 border-t border-gray-100">
            {[{ label: '最惠国关税', value: result.mfn_rate || '—' },{ label: '增值税率', value: result.vat_rate || '—' },{ label: '监管条件', value: result.supervision_conditions || '—' },{ label: '法定单位', value: '—' }].map((item, i) => (
              <div key={item.label} className={`px-6 py-4 ${i < 3 ? 'border-r border-gray-100' : ''}`}>
                <div className="text-[11px] text-muted uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            ))}
          </div>

          {result.rationale && (
            <div className="border-t border-gray-100 px-6 py-4"><div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">归类推导过程</div><div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#475569' }}>{result.rationale}</div></div>
          )}
          {result.alternatives && (
            <div className="border-t border-gray-100 px-6 py-4"><div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">候选编码与排除理由</div><div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#475569' }}>{result.alternatives}</div></div>
          )}
          {result.tariff_text && (
            <div className="border-t border-gray-100 px-6 py-4"><div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">税则原文参考</div><div className="text-[13px] leading-relaxed font-mono rounded-xl p-4 border whitespace-pre-wrap" style={{ background: '#F8FAFC', borderColor: '#e2e8f0', color: '#475569', maxHeight: 320, overflowY: 'auto' }}>{result.tariff_text}</div></div>
          )}
        </div>

        <p className="result-enter text-center text-[11px] mt-2" style={{ color: '#cbd5e1', animationDelay: '0.4s' }}>基于 AI 大语言模型对《中华人民共和国进出口税则》进行检索与解析，归类结果仅供报关参考，最终以海关认定为准</p>
      </div>

      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100] toast-enter" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
    </main>
  )
}
