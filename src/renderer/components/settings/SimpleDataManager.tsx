import { useState, useEffect } from 'react'

interface Props {
  title: string
  description?: string
  columns: { key: string; label: string }[]
  listMethod: string  // IPC method name, e.g. 'currenciesList'
  saveMethod: string  // IPC method name, e.g. 'currenciesSave'
  deleteMethod: string // IPC method name, e.g. 'currenciesDelete'
}

export default function SimpleDataManager({ title, description, columns, listMethod, saveMethod, deleteMethod }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const load = async () => {
    const api = (window as any).api
    if (!api?.[listMethod]) return
    const result = await api[listMethod]()
    if (Array.isArray(result)) setItems(result)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!modalOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen])

  const openAdd = () => {
    setForm({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    const api = (window as any).api
    const code = form[columns[0].key]
    const name = form[columns[1].key]
    if (!code?.trim() || !name?.trim()) return
    if (api?.[saveMethod]) {
      await api[saveMethod]({ code: code.trim(), name: name.trim() })
      setModalOpen(false)
      load()
    }
  }

  const handleDelete = async (code: string) => {
    const api = (window as any).api
    if (!confirm(`确定删除？`)) return
    if (api?.[deleteMethod]) {
      await api[deleteMethod](code)
      load()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-muted">{description || `管理${title}数据`}</span>
        <button onClick={openAdd}
          className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 active:scale-[0.97] transition-colors"
        >+ 添加</button>
      </div>

      <div className="max-h-[200px] overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} className="text-left px-2 py-1.5 text-[12px] font-semibold text-muted uppercase border-b border-gray-200 dark:border-gray-700">{c.label}</th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item[columns[0].key]} className="border-b border-slate-50 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800">
                {columns.map(c => (
                  <td key={c.key} className={`px-2 py-1.5 text-[13px] ${c.key === 'code' ? 'font-mono' : ''}`}>{item[c.key]}</td>
                ))}
                <td className="px-2 py-1.5">
                  <button onClick={() => handleDelete(item[columns[0].key])}
                    className="text-[12px] text-muted hover:text-red-500 cursor-pointer border-none bg-transparent">删除</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-2 py-6 text-center text-[12px] text-muted">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-panel p-6 w-[360px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold">添加{title}</h3>
              <button onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent text-lg leading-none active:scale-90">×</button>
            </div>
            <div className="space-y-3">
              {columns.map(c => (
                <div key={c.key}>
                  <label className="block text-[12px] font-medium text-muted mb-1">{c.label} *</label>
                  <input value={form[c.key] || ''} onChange={e => setForm({ ...form, [c.key]: e.target.value })}
                    placeholder={c.label}
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800" autoFocus />
                </div>
              ))}
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
