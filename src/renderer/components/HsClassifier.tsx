import { useState } from 'react'

export default function HsClassifier() {
  const [input, setInput] = useState('')

  return (
    <main className="flex-1 flex flex-col bg-surface">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 shrink-0 drag-region">
        <h1 className="text-[28px] font-bold">HS 编码归类咨询</h1>
        <p className="text-muted text-sm mt-1">
          输入商品信息，AI 检索《中华人民共和国进出口税则》为您推荐 HS 编码
        </p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[900px] mx-auto w-full">
        {/* Input area */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-6">
          <label className="block text-sm font-semibold mb-3">商品描述</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请描述商品：名称、材质/成分、用途/功能、规格型号、应用场景等"
            className="w-full h-32 rounded-[10px] border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 bg-[#FAFBFC] focus:bg-white font-sans resize-none"
          />
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2 flex-wrap">
              {['真空泵', 'LED灯', '棉制T恤', '汽车配件', '不锈钢阀门'].map(example => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="h-7 px-3 rounded-full text-[12px] text-muted border border-gray-200 bg-white hover:text-primary-500 hover:border-primary-300 cursor-pointer transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
            <button
              disabled={!input.trim()}
              className={`h-10 px-6 rounded-sm text-white border-none font-semibold text-sm cursor-pointer transition-all ${
                input.trim() ? 'bg-primary-500 hover:bg-primary-600' : 'bg-primary-300 cursor-not-allowed'
              }`}
            >
              开始归类分析
            </button>
          </div>
        </div>

        {/* Placeholder for results */}
        {!input.trim() && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">🧠</div>
              <p className="text-muted text-sm">输入商品描述后点击"开始归类分析"</p>
              <p className="text-muted text-xs mt-1">AI 将检索税则数据库并给出 HS 编码推荐</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
