import { useState, useEffect } from 'react'

interface Enterprise {
  id: string
  credit_code: string | null
  customs_code: string | null
  name: string
  short_name: string | null
  is_default: number
}

export default function EnterpriseManager() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ credit_code: '', customs_code: '', name: '', short_name: '' })

  const load = async () => {
    if (!window.api?.enterprisesList) return
    const result = await window.api.enterprisesList()
    if (Array.isArray(result)) setEnterprises(result)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ credit_code: '', customs_code: '', name: '', short_name: '' })
    setAdding(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!form.name) return
    if (window.api?.enterprisesSave) {
      await window.api.enterprisesSave(editingId ? { id: editingId, ...form } : form)
      resetForm()
      load()
    }
  }

  const handleEdit = (e: Enterprise) => {
    setForm({ credit_code: e.credit_code || '', customs_code: e.customs_code || '', name: e.name, short_name: e.short_name || '' })
    setEditingId(e.id)
    setAdding(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该企业？')) return
    if (window.api?.enterprisesDelete) {
      await window.api.enterprisesDelete(id)
      load()
    }
  }

  const handleSetDefault = async (id: string) => {
    if (window.api?.enterprisesSetDefault) {
      await window.api.enterprisesSetDefault(id)
      load()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-muted">管理申报单位信息，可设置默认企业用于新建申报单</span>
        <button
          onClick={() => { resetForm(); setAdding(v => !v) }}
          className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 transition-colors"
        >{adding ? '取消' : '+ 添加企业'}</button>
      </div>

      {adding && (
        <div className="flex flex-col gap-2 mb-3 p-3 rounded-lg bg-surface border border-gray-200">
          <div className="flex gap-2">
            <input placeholder="企业名称 *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-8 flex-1 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
            <input placeholder="简称" value={form.short_name}
              onChange={e => setForm({ ...form, short_name: e.target.value })}
              className="h-8 w-32 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
          </div>
          <div className="flex gap-2">
            <input placeholder="统一社会信用代码" value={form.credit_code}
              onChange={e => setForm({ ...form, credit_code: e.target.value })}
              className="h-8 flex-1 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
            <input placeholder="海关10位编码" value={form.customs_code}
              onChange={e => setForm({ ...form, customs_code: e.target.value })}
              className="h-8 w-40 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-500 font-sans" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm}
              className="h-7 px-3 rounded-sm text-xs cursor-pointer bg-white border border-gray-200 text-muted hover:text-ink transition-colors">取消</button>
            <button onClick={handleSave} disabled={!form.name}
              className="h-7 px-3 rounded-sm text-xs font-semibold cursor-pointer bg-primary-500 text-white border-none disabled:opacity-40 hover:bg-primary-600 transition-colors">
              {editingId ? '更新' : '保存'}
            </button>
          </div>
        </div>
      )}

      {enterprises.map(e => (
        <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.is_default ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium">{e.name}</span>
              {e.short_name && <span className="text-[11px] text-muted">({e.short_name})</span>}
              {e.is_default ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">默认</span> : null}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {e.credit_code && <span>信用代码: {e.credit_code}</span>}
              {e.credit_code && e.customs_code && <span className="mx-2">|</span>}
              {e.customs_code && <span>海关编码: {e.customs_code}</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 hover:opacity-100 group-hover:opacity-100">
            {!e.is_default && (
              <button onClick={() => handleSetDefault(e.id)}
                className="text-[11px] text-muted hover:text-primary-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">设为默认</button>
            )}
            <button onClick={() => handleEdit(e)}
              className="text-[11px] text-muted hover:text-primary-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">编辑</button>
            <button onClick={() => handleDelete(e.id)}
              className="text-[11px] text-muted hover:text-red-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">删除</button>
          </div>
        </div>
      ))}
      {enterprises.length === 0 && (
        <div className="py-8 text-center text-[12px] text-muted">暂无企业信息，点击「+ 添加企业」开始</div>
      )}
    </div>
  )
}
