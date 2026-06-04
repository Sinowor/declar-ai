import { useState, useEffect, useRef } from 'react'
import { IconSearchNav } from './Icons'

interface HsResult {
  id: string; product_description: string; hs_code: string | null
  hs_description: string | null; confidence: string | null
  mfn_rate: string | null; vat_rate: string | null
  supervision_conditions: string | null; rationale: string | null
  alternatives: string | null; created_at: string
}

const confStyle: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-red-50 text-red-700 border-red-200',
}
const confLabel: Record<string, string> = { high: '高置信度', medium: '中置信度', low: '低置信度' }

const placeholders = [
  '例如：真空泵，不锈钢材质，-30psi真空度，1L/min，134.4W，医疗用途',
  '例如：汽车发动机零件，金属，适用于轿车进气系统',
  '例如：LED灯泡，家用照明，10W，E27螺口，色温3000K',
  '例如：棉制男式梭织衬衫，100%棉，长袖，前开襟',
]
const shortcuts = ['真空泵', 'LED灯泡', '汽车配件', '棉制T恤', '不锈钢阀门']

export default function HsClassifier() {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<HsResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    if (input || focused) return
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % placeholders.length), 3000)
    return () => clearInterval(t)
  }, [input, focused])

  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }
  }, [input])

  const handleClassify = async () => {
    if (!input.trim() || analyzing) return
    setAnalyzing(true); setResult(null)
    try {
      if (window.api?.hsClassify) {
        const res = await window.api.hsClassify(input.trim())
        if (res.success && res.result) setResult(res.result)
        else showToast(`归类失败: ${res.error || '未知错误'}`)
      }
    } catch (err: any) { showToast(`错误: ${err.message}`) }
    finally { setAnalyzing(false) }
  }

  const handleCopyCode = () => {
    if (result?.hs_code) { navigator.clipboard.writeText(result.hs_code); showToast('HS 编码已复制') }
  }

  // ═══ Empty State ═══
  if (!result) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-surface">
        <div className="w-full max-w-[600px] px-8 -mt-16">
          <h1 className="text-center text-[24px] font-bold mb-2">
            <span className="text-transparent bg-clip-text" style={{ background: 'linear-gradient(135deg, #6D5EF7, #8B7EF7)' }}>AI</span>
            <span className="text-ink"> 编码归类</span>
          </h1>
          <p className="text-center text-[13px] text-muted mb-8">智能检索《进出口税则》，结果仅供参考</p>

          <div className={`bg-white border-2 rounded-2xl transition-all duration-200 ${
            focused ? 'border-primary-500 shadow-[0_0_0_4px_rgba(109,94,247,0.06)]' : 'border-gray-200 shadow-card'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleClassify() }}
              placeholder={input || focused ? '描述商品名称、材质、用途、参数...' : placeholders[placeholderIdx]}
              className="w-full min-h-[100px] resize-none border-0 outline-none text-[15px] leading-relaxed font-sans bg-transparent px-5 py-4 hs-ph"
              style={{ color: '#1e293b' }}
              autoFocus
            />
            <style>{`
              @keyframes phFade { 0%,100%{opacity:0} 15%,85%{opacity:0.4} }
              .hs-ph::placeholder { animation: phFade 3s ease-in-out infinite }
              .hs-ph:focus::placeholder { animation: none; opacity: 0.35 }
            `}</style>

            <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100">
              <button onClick={handleClassify} disabled={analyzing || !input.trim()}
                className={`h-9 px-5 rounded-lg text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-2 transition-all ${
                  analyzing || !input.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
                }`}
                style={{ background: analyzing || !input.trim() ? '#94a3b8' : 'linear-gradient(135deg, #6D5EF7, #5B4EDB)' }}
              >
                {analyzing ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中...</>
                ) : (
                  <>开始归类分析 <span className="text-[10px] opacity-40 ml-0.5">⌘↵</span></>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
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

          <p className="text-center text-[11px] mt-4" style={{ color: '#cbd5e1' }}>
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
  const conf = result.confidence ? confStyle[result.confidence] || confStyle.medium : ''
  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      <div className="px-8 pt-5 pb-3 shrink-0 drag-region flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(109,94,247,0.1), rgba(109,94,247,0.04))' }}>
            <IconSearchNav />
          </span>
          <span className="text-sm text-muted truncate">{result.product_description}</span>
        </div>
        <button onClick={() => { setResult(null); setInput(''); setAnalyzing(false) }}
          className="shrink-0 ml-4 h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink hover:border-gray-300 cursor-pointer transition-all"
        >新查询</button>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-5 flex-1 max-w-[900px] mx-auto w-full">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 pt-6 pb-5 flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">推荐 HS 编码</div>
              <div className="text-[44px] font-bold tracking-tight font-mono" style={{ color: '#6D5EF7', letterSpacing: '-0.02em' }}>{result.hs_code || '—'}</div>
              <div className="text-sm text-muted mt-1">{result.hs_description || ''}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {result.confidence && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf}`}>{confLabel[result.confidence] || result.confidence}</span>
              )}
              <button onClick={handleCopyCode} className="h-8 px-3.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all"
                style={{ borderColor: 'rgba(109,94,247,0.2)', color: '#6D5EF7', background: 'rgba(109,94,247,0.03)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(109,94,247,0.07)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(109,94,247,0.03)' }}
              >复制编码</button>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-gray-100">
            {[
              { label: '最惠国关税', value: result.mfn_rate || '—' },
              { label: '增值税', value: result.vat_rate || '—' },
              { label: '监管条件', value: result.supervision_conditions || '—' },
            ].map((item, i) => (
              <div key={item.label} className={`px-6 py-4 ${i < 2 ? 'border-r border-gray-100' : ''}`}>
                <div className="text-[11px] text-muted uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            ))}
          </div>

          {result.rationale && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">归类依据</div>
              <div className="text-[14px] leading-relaxed" style={{ color: '#475569' }}>{result.rationale}</div>
            </div>
          )}

          {result.alternatives && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">候选编码及排除理由</div>
              <div className="text-[14px] leading-relaxed" style={{ color: '#475569' }}>{result.alternatives}</div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100]" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
    </main>
  )
}
