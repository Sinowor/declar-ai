import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
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

export default function HsClassifier() {
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

  const doClassify = async () => {
    if (!input.trim() || analyzing) return
    setAnalyzing(true); setProcessingStep(0); setNeedsMoreInfo(false); setShowAllHistory(false)
    const s1 = setTimeout(() => setProcessingStep(1), 700)
    const s2 = setTimeout(() => setProcessingStep(2), 1500)
    try {
      if (window.api?.hsClassify) {
        const res = await window.api.hsClassify(input.trim())
        clearTimeout(s1); clearTimeout(s2); setProcessingStep(3)
        await new Promise(r => setTimeout(r, 400))
        if (res.needsMoreInfo) {
          setNeedsMoreInfo(true)
          setMissingFields(res.missingFields || [])
          setAiQuestion(res.question || '')
        } else if (res.success && res.result) {
          setResult(res.result)
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
    setResult(null); setInput(''); setShowAllHistory(false); setNeedsMoreInfo(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ═══ Processing ═══
  if (analyzing) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-surface">
        <style>{`
          @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          @keyframes stepIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes progressBar { from { width: 0%; } to { width: 100%; } }
          .float-icon { animation: float 3s ease-in-out infinite; }
          .step-enter { animation: stepIn 0.4s ease-out both; }
        `}</style>

        <div className="flex flex-col items-center -mt-8 max-w-[420px] w-full px-8">
          {/* Animated icon */}
          <div className="float-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accentForeground})`, boxShadow: `0 8px 32px ${p(0.25)}` }}>
            <span className="text-2xl">🧠</span>
          </div>

          {/* Product name */}
          <div className="text-[15px] font-semibold mb-8 text-center px-4 py-2 rounded-xl" style={{ background: p(0.04), color: theme.primary }}>
            {input.length > 50 ? input.slice(0, 50) + '...' : input}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full mb-8 overflow-hidden" style={{ background: p(0.08) }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.accentForeground})`,
              width: `${((processingStep + 1) / processingSteps.length) * 100}%`,
            }} />
          </div>

          {/* Steps */}
          <div className="w-full flex flex-col gap-2.5">
            {processingSteps.map((label, i) => {
              const done = processingStep > i; const active = processingStep === i
              return (
                <div key={label} className="step-enter flex items-center gap-3" style={{ animationDelay: `${i * 0.12}s` }}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                    done ? '' : active ? '' : ''
                  }`} style={done ? { background: p(0.15), color: theme.primary } : active ? { background: theme.primary, color: '#fff' } : { color: '#cbd5e1' }}>
                    {done ? '✓' : active ? '' : i + 1}
                  </span>
                  <span className={`text-[13px] transition-colors duration-500 ${active ? 'font-medium' : ''}`}
                    style={{ color: done ? theme.primary : active ? theme.primary : '#94a3b8' }}>
                    {label}
                  </span>
                  {active && (
                    <span className="flex gap-1 ml-1">
                      <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: '0s' }} />
                      <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: '0.2s' }} />
                      <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: '0.4s' }} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
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
          <div className="bg-white border-2 border-gray-200 focus-within:border-primary-500 rounded-2xl transition-all duration-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doClassify() }}
              placeholder="在此补充商品信息..."
              className="w-full min-h-[80px] resize-none border-0 outline-none text-[15px] leading-relaxed font-sans bg-transparent px-5 py-4"
              style={{ color: '#1e293b' }} autoFocus
            />
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
              <button onClick={doClassify}
                className="h-9 px-4 rounded-lg text-[13px] font-medium cursor-pointer transition-all bg-white border"
                style={{ borderColor: p(0.2), color: theme.primary }}
              >跳过，直接归类</button>
              <button onClick={doClassify}
                className="h-9 px-5 rounded-lg text-white border-none font-semibold text-[13px] cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
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
          <button onClick={() => setShowAllHistory(false)} className="no-drag h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink cursor-pointer transition-all">返回</button>
        </div>
        <div className="px-8 pb-12 flex-1 max-w-[900px] mx-auto w-full">
          {history.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted text-sm">暂无归类记录</div>
          ) : (
            <div className="space-y-1">
              {history.map(item => (
                <button key={item.id} onClick={() => handleHistoryClick(item)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-left cursor-pointer bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
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

          <div className={`bg-white border-2 rounded-2xl transition-all duration-200 ${
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
              <button onClick={doClassify} disabled={!input.trim()}
                className="h-9 px-5 rounded-lg text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
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
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left cursor-pointer bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
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
        </div>

        {toast && (
          <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100]" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
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
        <button onClick={handleNewQuery} className="no-drag shrink-0 h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink hover:border-gray-300 cursor-pointer transition-all inline-flex items-center gap-1">← 返回</button>
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
                <div className="flex items-center gap-1.5 mt-2 text-[12px] px-3 py-1.5 rounded-lg" style={{ background: p(0.06), color: theme.primary }}>
                  <span className="font-bold">!</span> 该编码未在税则原文中精确匹配，请人工核实
                </div>
              )}
            </div>
            <button onClick={handleCopyCode} className="h-9 px-4 rounded-lg border text-[13px] font-medium cursor-pointer transition-all shrink-0"
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
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100]" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
    </main>
  )
}
