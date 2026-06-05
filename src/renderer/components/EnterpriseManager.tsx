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
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ credit_code: '', customs_code: '', name: '', short_name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = async () => {
    if (!window.api?.enterprisesList) return
    const result = await window.api.enterprisesList()
    if (Array.isArray(result)) setEnterprises(result)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ credit_code: '', customs_code: '', name: '', short_name: '' })
    setErrors({})
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (e: Enterprise) => {
    setForm({ credit_code: e.credit_code || '', customs_code: e.customs_code || '', name: e.name, short_name: e.short_name || '' })
    setErrors({})
    setEditingId(e.id)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '企业名称不能为空'
    if (form.credit_code.trim() && !/^[1-9]\d{5}[0-9A-HJ-NPQRTUWXY]{9}[0-9A-HJ-NPQRTUWXY]\d$/.test(form.credit_code.trim())) {
      errs.credit_code = '统一社会信用代码格式不正确（应为18位）'
    }
    if (form.customs_code.trim() && !/^\d{10}$/.test(form.customs_code.trim())) {
      errs.customs_code = '海关10位编码格式不正确（应为10位数字）'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    if (window.api?.enterprisesSave) {
      await window.api.enterprisesSave(editingId ? { id: editingId, ...form } : form)
      setModalOpen(false)
      load()
    }
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
        <button onClick={openAdd}
          className="h-7 px-3 rounded-sm text-xs font-medium cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 transition-colors"
        >+ 添加企业</button>
      </div>

      {enterprises.map(e => (
        <div key={e.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors border-b border-slate-50 dark:border-gray-800 last:border-b-0">
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
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!e.is_default && (
              <button onClick={() => handleSetDefault(e.id)}
                className="text-[11px] text-muted hover:text-primary-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">设为默认</button>
            )}
            <button onClick={() => openEdit(e)}
              className="text-[11px] text-muted hover:text-primary-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">编辑</button>
            <button onClick={() => handleDelete(e.id)}
              className="text-[11px] text-muted hover:text-red-500 cursor-pointer border-none bg-transparent px-2 py-1 rounded transition-colors">删除</button>
          </div>
        </div>
      ))}
      {enterprises.length === 0 && (
        <div className="py-8 text-center text-[12px] text-muted">暂无企业信息，点击「+ 添加企业」开始</div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setModalOpen(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-panel p-6 w-[440px]" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') handleSave() }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold">{editingId ? '编辑企业' : '添加企业'}</h3>
              <button onClick={() => setModalOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface dark:hover:bg-gray-800 cursor-pointer transition-colors border-none bg-transparent text-lg leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">企业名称 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如 天津报关有限公司"
                  className={`w-full h-9 rounded-md border px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800 ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} autoFocus />
                {errors.name && <div className="text-[11px] text-red-500 mt-0.5">{errors.name}</div>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">企业简称</label>
                <input value={form.short_name} onChange={e => setForm({ ...form, short_name: e.target.value })}
                  placeholder="如 天津报关"
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">统一社会信用代码</label>
                <input value={form.credit_code} onChange={e => setForm({ ...form, credit_code: e.target.value })}
                  placeholder="18位，选填"
                  className={`w-full h-9 rounded-md border px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800 ${errors.credit_code ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} />
                {errors.credit_code && <div className="text-[11px] text-red-500 mt-0.5">{errors.credit_code}</div>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">海关10位编码</label>
                <input value={form.customs_code} onChange={e => setForm({ ...form, customs_code: e.target.value })}
                  placeholder="10位数字，选填"
                  className={`w-full h-9 rounded-md border px-3 text-[13px] outline-none focus:border-primary-500 font-sans bg-white dark:bg-gray-800 ${errors.customs_code ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} />
                {errors.customs_code && <div className="text-[11px] text-red-500 mt-0.5">{errors.customs_code}</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)}
                className="h-8 px-4 rounded-sm text-xs font-medium cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-muted hover:text-ink transition-colors">取消</button>
              <button onClick={handleSave}
                className="h-8 px-4 rounded-sm text-xs font-semibold cursor-pointer bg-primary-500 text-white border-none hover:bg-primary-600 transition-colors">{editingId ? '更新' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
