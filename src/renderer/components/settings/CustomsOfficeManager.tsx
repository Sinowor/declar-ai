import { useState, useEffect, useRef } from 'react'

interface CustomsOffice {
  code: string
  name: string
  parent_name: string | null
}

export default function CustomsOfficeManager() {
  const [offices, setOffices] = useState<CustomsOffice[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', parent_name: '' })
  const [error, setError] = useState('')

  const load = async (q?: string) => {
    if (!window.api?.customsOfficesList) return
    const result = await window.api.customsOfficesList(q)
    if (Array.isArray(result)) setOffices(result)
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(search || undefined), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  // Escape to close modal
  useEffect(() => {
    if (!modalOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen])

  const openAdd = () => {
    setForm({ code: '', name: '', parent_name: '' })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('关区代码和名称不能为空')
      return
    }
    if (window.api?.customsOfficesSave) {
      await window.api.customsOfficesSave({ code: form.code.trim(), name: form.name.trim(), parent_name: form.parent_name.trim() || undefined })
      setModalOpen(false)
      load(search || undefined)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`确定删除关区代码 ${code}？`)) return
    if (window.api?.customsOfficesDelete) {
      await window.api.customsOfficesDelete(code)
      load(search || undefined)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <input
          type="text"
          placeholder="搜索关区代码或名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 bg-surface dark:bg-gray-800 w-48 font-sans"
        />
        <button onClick={openAdd}
          className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors"
        >+ 添加关区</button>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left px-2 py-1.5 text-[11px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">代码</th>
              <th className="text-left px-2 py-1.5 text-[11px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">名称</th>
              <th className="text-left px-2 py-1.5 text-[11px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">所属关区</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {offices.map(o => (
              <tr key={o.code} className="border-b border-slate-50 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800">
                <td className="px-2 py-1.5 text-[13px] font-mono">{o.code}</td>
                <td className="px-2 py-1.5 text-[13px]">{o.name}</td>
                <td className="px-2 py-1.5 text-[12px] text-muted">{o.parent_name || '—'}</td>
                <td className="px-2 py-1.5">
                  <button onClick={() => handleDelete(o.code)}
                    className="text-[11px] text-muted hover:text-red-500 cursor-pointer border-none bg-transparent">删除</button>
                </td>
              </tr>
            ))}
            {offices.length === 0 && (
              <tr><td colSpan={4} className="px-2 py-6 text-center text-[12px] text-muted">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setModalOpen(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-panel p-6 w-[380px]" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') handleSave() }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold">添加关区</h3>
              <button onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent text-lg leading-none active:scale-90">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">关区代码 *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="如 0201"
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800" autoFocus />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">关区名称 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如 天津海关"
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">所属关区</label>
                <input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })}
                  placeholder="如 天津关区（可选）"
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800" />
              </div>
              {error && <div className="text-[12px] text-red-500">{error}</div>}
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
