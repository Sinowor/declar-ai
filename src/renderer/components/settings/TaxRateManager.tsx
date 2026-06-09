import { useState, useEffect, useRef } from 'react'

interface TaxRate {
  code: string; description: string; mfn_rate: number | null
  general_rate: number | null; vat_rate: number; consumption_tax: number
  supervision: string | null; unit: string
}

export default function TaxRateManager() {
  const [items, setItems] = useState<TaxRate[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<TaxRate>({ code: '', description: '', mfn_rate: null, general_rate: null, vat_rate: 13, consumption_tax: 0, supervision: null, unit: '个' })

  const load = async (q?: string) => {
    const api = (window as any).api
    if (!api?.taxRatesList) return
    const result = q ? await api.taxRatesSearch(q) : await api.taxRatesList()
    if (Array.isArray(result)) setItems(result)
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(search || undefined), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  useEffect(() => {
    if (!modalOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen])

  const handleSave = async () => {
    if (!form.code.trim()) return
    const api = (window as any).api
    if (api?.taxRatesSave) {
      await api.taxRatesSave(form)
      setModalOpen(false)
      load(search || undefined)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`确定删除税率 ${code}？`)) return
    const api = (window as any).api
    if (api?.taxRatesDelete) { await api.taxRatesDelete(code); load(search || undefined) }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
      <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold">税率管理</h3>
        <span className="text-[11px] text-muted">{items.length} 条</span>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <input type="text" placeholder="搜索 HS 编码或名称..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 bg-surface dark:bg-gray-800 w-56 font-sans" />
          <button onClick={() => { setForm({ code: '', description: '', mfn_rate: null, general_rate: null, vat_rate: 13, consumption_tax: 0, supervision: null, unit: '个' }); setModalOpen(true) }}
            className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors">+ 添加</button>
        </div>

        <div className="max-h-[300px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">编码</th>
                <th className="text-left px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">名称</th>
                <th className="text-right px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">最惠国%</th>
                <th className="text-right px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">普通%</th>
                <th className="text-right px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">增值税%</th>
                <th className="text-center px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">消费税</th>
                <th className="text-left px-1.5 py-1.5 text-[10px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">监管</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.code} className="border-b border-slate-50 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800">
                  <td className="px-1.5 py-1.5 text-[12px] font-mono">{r.code}</td>
                  <td className="px-1.5 py-1.5 text-[12px] max-w-[120px] truncate" title={r.description}>{r.description}</td>
                  <td className="px-1.5 py-1.5 text-[12px] text-right tabular-nums">{r.mfn_rate != null ? r.mfn_rate : '—'}</td>
                  <td className="px-1.5 py-1.5 text-[12px] text-right tabular-nums">{r.general_rate != null ? r.general_rate : '—'}</td>
                  <td className="px-1.5 py-1.5 text-[12px] text-right tabular-nums">{r.vat_rate}</td>
                  <td className="px-1.5 py-1.5 text-[12px] text-center">{r.consumption_tax ? '✓' : '—'}</td>
                  <td className="px-1.5 py-1.5 text-[12px]">{r.supervision || '—'}</td>
                  <td className="px-1.5 py-1.5">
                    <button onClick={() => handleDelete(r.code)}
                      className="text-[10px] text-muted hover:text-red-500 cursor-pointer border-none bg-transparent">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-panel p-6 w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold">添加 HS 税率</h3>
              <button onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent text-lg leading-none active:scale-90">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">HS 编码 *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 font-mono bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">名称</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">最惠国税率 (%)</label>
                <input type="number" step="0.1" value={form.mfn_rate ?? ''} onChange={e => setForm({ ...form, mfn_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">普通税率 (%)</label>
                <input type="number" step="0.1" value={form.general_rate ?? ''} onChange={e => setForm({ ...form, general_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">增值税率 (%)</label>
                <input type="number" step="0.1" value={form.vat_rate ?? ''} onChange={e => setForm({ ...form, vat_rate: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={!!form.consumption_tax} onChange={e => setForm({ ...form, consumption_tax: e.target.checked ? 1 : 0 })}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary-500" />
                  <span className="text-[11px] text-muted">消费税</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">监管条件</label>
                <input value={form.supervision || ''} onChange={e => setForm({ ...form, supervision: e.target.value || null })}
                  placeholder="如 AB"
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-0.5">单位</label>
                <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                  className="w-full h-8 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)}
                className="h-8 px-4 rounded-sm text-xs font-medium cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-muted hover:text-ink transition-colors">取消</button>
              <button onClick={handleSave}
                className="h-8 px-4 rounded-sm text-xs font-semibold cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
