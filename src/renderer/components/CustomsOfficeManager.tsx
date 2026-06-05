import { useState, useEffect } from 'react'

interface CustomsOffice {
  code: string
  name: string
  parent_name: string | null
}

export default function CustomsOfficeManager() {
  const [offices, setOffices] = useState<CustomsOffice[]>([])
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', parent_name: '' })

  const load = async (q?: string) => {
    if (!window.api?.customsOfficesList) return
    const result = await window.api.customsOfficesList(q)
    if (Array.isArray(result)) setOffices(result)
  }

  useEffect(() => { load(search || undefined) }, [search])

  const handleSave = async () => {
    if (!form.code || !form.name) return
    if (window.api?.customsOfficesSave) {
      await window.api.customsOfficesSave(form)
      setAdding(false)
      setForm({ code: '', name: '', parent_name: '' })
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
        <button
          onClick={() => setAdding(v => !v)}
          className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 transition-colors"
        >{adding ? '取消' : '+ 添加关区'}</button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <input placeholder="关区代码" value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value })}
            className="h-8 w-24 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
          <input placeholder="关区名称" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="h-8 flex-1 min-w-[120px] rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
          <input placeholder="所属关区（可选）" value={form.parent_name}
            onChange={e => setForm({ ...form, parent_name: e.target.value })}
            className="h-8 flex-1 min-w-[120px] rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
          <button onClick={handleSave} disabled={!form.code || !form.name}
            className="h-8 px-3 rounded-sm text-xs font-semibold cursor-pointer bg-primary-500 text-white border-none disabled:opacity-40 hover:bg-primary-600 transition-colors">保存</button>
        </div>
      )}

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
              <tr key={o.code} className="border-b border-slate-50 dark:border-gray-800 hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-800">
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
    </div>
  )
}
