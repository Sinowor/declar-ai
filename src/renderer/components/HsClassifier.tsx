import { useState, useRef, useEffect } from 'react'
import { IconSearchNav } from './Icons'

interface HsResult {
  id: string
  product_description: string
  hs_code: string | null
  hs_description: string | null
  confidence: string | null
  mfn_rate: string | null
  vat_rate: string | null
  supervision_conditions: string | null
  rationale: string | null
  alternatives: string | null
  created_at: string
}

const confidenceStyle: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  high:   { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '高置信度' },
  medium: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   label: '中置信度' },
  low:    { dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-700',     label: '低置信度' },
}

const examples = [
  '真空泵，不锈钢材质，-30psi真空度，1L/min抽气速率，134.4W功率，医疗用途',
  '汽车发动机零件，金属材质，适用于轿车发动机进气系统',
  'LED灯泡，家用照明，10W，E27螺口，色温3000K',
]

export default function HsClassifier() {
  const [input, setInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<HsResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' }
  }, [input])

  const handleClassify = async () => {
    if (!input.trim() || analyzing) return
    setAnalyzing(true)
    setResult(null)
    try {
      if (window.api?.hsClassify) {
        const res = await window.api.hsClassify(input.trim())
        if (res.success && res.result) {
          setResult(res.result)
        } else {
          showToast(`归类失败: ${res.error || '未知错误'}`)
        }
      }
    } catch (err: any) {
      showToast(`错误: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleClassify()
  }

  const handleCopyCode = () => {
    if (result?.hs_code) { navigator.clipboard.writeText(result.hs_code); showToast('HS 编码已复制') }
  }

  const conf = result?.confidence ? confidenceStyle[result.confidence] || confidenceStyle.medium : null

  return (
    <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: 'linear-gradient(180deg, #FAFAFE 0%, #F8FAFC 100%)' }}>
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-2 shrink-0 drag-region">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(109,94,247,0.12), rgba(109,94,247,0.06))' }}>
            <IconSearchNav />
          </span>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">HS 编码归类咨询</h1>
            <p className="text-[13px] text-muted mt-0.5">AI 检索《中华人民共和国进出口税则》，智能推荐 HS 编码</p>
          </div>
        </div>
      </div>

      <div className="px-8 pb-16 flex flex-col gap-5 flex-1 max-w-[960px] mx-auto w-full">

        {/* ── Input Card ── */}
        {!result && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
            {/* Textarea zone */}
            <div className="p-5 pb-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述商品信息：名称、材质成分、用途功能、技术参数、应用场景..."
                className="w-full min-h-[88px] resize-none border-0 outline-none text-[15px] leading-relaxed font-sans placeholder:text-gray-300 bg-transparent"
                disabled={analyzing}
                autoFocus
              />
            </div>
            {/* Footer bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-surface border-t border-gray-100">
              <div className="flex gap-2 flex-wrap">
                {examples.map(ex => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    disabled={analyzing}
                    className="h-7 px-3 rounded-full text-[12px] border transition-all disabled:opacity-40"
                    style={{ color: '#64748B', borderColor: '#e2e8f0', background: '#fff' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(109,94,247,0.4)'; (e.target as HTMLElement).style.color = '#6D5EF7' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#e2e8f0'; (e.target as HTMLElement).style.color = '#64748B' }}
                  >
                    {ex.length > 28 ? ex.slice(0, 28) + '...' : ex}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {input.trim() && (
                  <span className="text-[11px] text-muted hidden sm:inline">{input.length} 字符</span>
                )}
                <button
                  onClick={handleClassify}
                  disabled={analyzing || !input.trim()}
                  className={`h-9 px-5 rounded-lg text-white border-none font-semibold text-[13px] cursor-pointer inline-flex items-center gap-2 transition-all ${
                    analyzing || !input.trim()
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:opacity-90 active:scale-[0.98]'
                  }`}
                  style={{ background: analyzing || !input.trim() ? '#94a3b8' : 'linear-gradient(135deg, #6D5EF7, #5B4EDB)' }}
                >
                  {analyzing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>开始归类分析 <span className="text-[10px] opacity-50 ml-0.5">⌘↵</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {analyzing && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-6 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
              <span className="w-2 h-2 rounded-full bg-primary-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="text-sm text-muted ml-2">正在检索税则并分析归类...</span>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-5 animate-in fade-in">
            {/* Result header: edit + re-classify */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">归类结果</span>
                {conf && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${conf.bg} ${conf.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                    {conf.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setResult(null); setAnalyzing(false) }}
                className="h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-ink hover:border-gray-300 cursor-pointer transition-all"
              >
                重新归类
              </button>
            </div>

            {/* HS Code hero */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
              <div className="p-6 flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold mb-3">推荐 HS 编码</div>
                  <div className="text-[42px] font-bold tracking-tight font-mono" style={{ color: '#6D5EF7', letterSpacing: '-0.02em' }}>
                    {result.hs_code || '—'}
                  </div>
                  <div className="text-sm text-muted mt-1.5">{result.hs_description || ''}</div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="h-9 px-4 rounded-lg border text-[13px] font-medium cursor-pointer transition-all"
                  style={{ borderColor: 'rgba(109,94,247,0.25)', color: '#6D5EF7', background: 'rgba(109,94,247,0.04)' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(109,94,247,0.08)' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(109,94,247,0.04)' }}
                >
                  复制编码
                </button>
              </div>

              {/* Tax rates strip */}
              <div className="grid grid-cols-3 border-t border-gray-100">
                {[
                  { label: '最惠国关税', value: result.mfn_rate || '—' },
                  { label: '增值税', value: result.vat_rate || '—' },
                  { label: '监管条件', value: result.supervision_conditions || '—' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className={`px-5 py-4 ${i < 2 ? 'border-r border-gray-100' : ''}`}
                  >
                    <div className="text-[11px] text-muted uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-lg font-bold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rationale */}
            {result.rationale && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-100">
                  <h3 className="text-sm font-semibold">归类依据</h3>
                </div>
                <div className="p-6">
                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#475569' }}>
                    {result.rationale}
                  </div>
                </div>
              </div>
            )}

            {/* Alternatives */}
            {result.alternatives && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-100">
                  <h3 className="text-sm font-semibold">候选编码及排除理由</h3>
                </div>
                <div className="p-6">
                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#475569' }}>
                    {result.alternatives}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !analyzing && !input.trim() && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(109,94,247,0.06), rgba(109,94,247,0.02))' }}>
                <span style={{ fontSize: 28, opacity: 0.3 }}>&#8981;</span>
              </div>
              <p className="text-sm text-muted">输入商品描述后按 <kbd className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-gray-100 border border-gray-200">⌘↵</kbd> 开始分析</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[100] flex items-center gap-2" style={{ background: '#1e293b', boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}>
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fade-in 0.35s ease-out both; }
      `}</style>
    </main>
  )
}
