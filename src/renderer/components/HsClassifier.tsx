import { useState, useEffect } from 'react'
import { IconAI } from './Icons'

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

const confidenceColor: Record<string, string> = {
  high: 'text-emerald-600 bg-emerald-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-red-600 bg-red-50',
}

const confidenceLabel: Record<string, string> = {
  high: '高', medium: '中', low: '低',
}

export default function HsClassifier() {
  const [input, setInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<HsResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleClassify()
    }
  }

  const handleCopyCode = () => {
    if (result?.hs_code) {
      navigator.clipboard.writeText(result.hs_code)
      showToast('已复制 HS 编码')
    }
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 shrink-0 drag-region">
        <h1 className="text-[28px] font-bold">HS 编码归类咨询</h1>
        <p className="text-muted text-sm mt-1">
          输入商品信息，AI 检索税则并推荐 HS 编码
        </p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[900px] mx-auto w-full">
        {/* Input area */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-6">
          <label className="block text-sm font-semibold mb-3">商品描述</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请描述商品：名称、材质/成分、用途/功能、规格型号、应用场景等。支持自然语言。"
            className="w-full h-28 rounded-[10px] border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans resize-none"
            disabled={analyzing}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2 flex-wrap">
              {['真空泵，不锈钢，-30psi，医疗用途', '汽车配件，金属，发动机用', 'LED灯泡，家用照明，10W'].map(example => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  disabled={analyzing}
                  className="h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-primary-500 hover:border-primary-300 cursor-pointer transition-all disabled:opacity-50"
                >
                  {example.length > 15 ? example.slice(0, 15) + '...' : example}
                </button>
              ))}
            </div>
            <button
              onClick={handleClassify}
              disabled={analyzing || !input.trim()}
              className={`h-10 px-6 rounded-sm text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all ${
                analyzing || !input.trim() ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
              }`}
            >
              {analyzing ? '分析中...' : <><IconAI /><span>开始归类分析</span></>}
            </button>
          </div>

          {analyzing && (
            <div className="mt-4 flex flex-col gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 via-blue-50 to-[#FAFAFE] border border-violet-100">
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                正在检索税则并分析归类...
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="px-6 py-[18px] border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">归类结果</h3>
              {result.confidence && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${confidenceColor[result.confidence] || ''}`}>
                  ● {confidenceLabel[result.confidence] || result.confidence} 置信度
                </span>
              )}
            </div>
            <div className="p-6">
              {/* HS Code highlight */}
              <div className="flex items-center gap-4 mb-6 p-5 rounded-xl bg-primary-50 border border-primary-100">
                <div>
                  <div className="text-xs text-muted mb-1">推荐 HS 编码</div>
                  <div className="text-2xl font-bold text-primary-600 font-mono tracking-wider">{result.hs_code || '—'}</div>
                  <div className="text-sm text-muted mt-0.5">{result.hs_description || ''}</div>
                </div>
                <button onClick={handleCopyCode} className="ml-auto shrink-0 h-8 px-4 rounded-sm text-xs font-medium border border-primary-200 bg-white text-primary-600 hover:bg-primary-50 cursor-pointer transition-all">
                  复制编码
                </button>
              </div>

              {/* Tax info */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: '最惠国关税', value: result.mfn_rate || '—' },
                  { label: '增值税', value: result.vat_rate || '—' },
                  { label: '监管条件', value: result.supervision_conditions || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-surface rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-muted mb-1">{item.label}</div>
                    <div className="text-lg font-bold text-ink">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Rationale */}
              {result.rationale && (
                <details className="mb-4">
                  <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-ink transition-all">归类依据</summary>
                  <div className="mt-2 text-[13px] text-muted whitespace-pre-wrap leading-relaxed">{result.rationale}</div>
                </details>
              )}

              {/* Alternatives */}
              {result.alternatives && (
                <details>
                  <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-ink transition-all">候选编码</summary>
                  <div className="mt-2 text-[13px] text-muted whitespace-pre-wrap leading-relaxed">{result.alternatives}</div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !analyzing && !input.trim() && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-15">🧠</div>
              <p className="text-muted text-sm">输入商品描述后按 ⌘Enter 或点击"开始归类分析"</p>
              <p className="text-muted text-xs mt-1">AI 将检索《中华人民共和国进出口税则》并给出 HS 编码推荐</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white px-6 py-3 rounded-xl text-sm font-medium z-[100] shadow-[0_20px_48px_rgba(15,23,42,0.2)]">
          {toast}
        </div>
      )}
    </main>
  )
}
