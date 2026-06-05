import { useState, useRef, useEffect, useCallback } from 'react'
import { IconTrash, IconBox } from './Icons'
import type { FieldMapping } from '../../shared/types'

interface CargoDetailsTableProps {
  details: Record<string, any>[]
  onUpdate: (details: Record<string, any>[]) => void
  cargoColumns?: FieldMapping[]
}

function colMinWidth(col: { source_key: string; field_type?: string }): number {
  if (col.field_type === 'number') return 80
  const longTextKeys = new Set([
    'cargo_name', 'cargo_name_en', 'specification',
    'container_number', 'bill_of_lading_number', 'domestic_transport_tool',
    'hs_code',
  ])
  return longTextKeys.has(col.source_key) ? 160 : 120
}

export default function CargoDetailsTable({ details, onUpdate, cargoColumns }: CargoDetailsTableProps) {
  const allColumns = cargoColumns && cargoColumns.length > 0
    ? cargoColumns.filter(c => c.source_key !== 'seq_no')
    : [
        { source_key: 'cargo_name', display_label: '商品名称', field_type: 'text' as const },
        { source_key: 'quantity', display_label: '数量', field_type: 'number' as const },
        { source_key: 'gross_weight', display_label: '毛重(KG)', field_type: 'number' as const },
      ]

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const visibleColumns = allColumns.filter(c => !hiddenKeys.has(c.source_key))

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const toggleColumn = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const updateRow = (index: number, field: string, value: unknown) => {
    const updated = details.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    onUpdate(updated)
  }

  const deleteRow = (index: number) => {
    if (details.length <= 1) return
    onUpdate(details.filter((_, i) => i !== index))
  }

  const addRow = () => {
    const newRow: Record<string, any> = {}
    for (const col of allColumns) {
      newRow[col.source_key] = col.field_type === 'number' ? 0 : ''
    }
    onUpdate([...details, newRow])
  }

  const renderInput = (index: number, field: string, value: any, isNumber: boolean) => {
    return (
      <input
        type={isNumber ? 'number' : 'text'}
        value={value ?? ''}
        step={isNumber ? '0.01' : undefined}
        onChange={(e) => updateRow(index, field, isNumber ? (parseFloat(e.target.value) || 0) : e.target.value)}
        className="w-full h-8 rounded-md border border-transparent hover:bg-slate-50 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans"
        placeholder="—"
      />
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
      <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
        <h3 className="text-lg font-semibold">货物明细</h3>
        <div className="flex items-center gap-2 no-drag">
          {/* Column visibility toggle */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="列显示"
              className={`h-8 px-2.5 rounded-sm text-muted text-sm font-medium transition-all cursor-pointer border-none bg-transparent hover:bg-surface ${hiddenKeys.size > 0 ? 'text-primary-500' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 5v0"/><path d="M12 19v0"/><path d="M5 12v0"/><path d="M19 12v0"/>
                <path d="M9.5 9.5l-7-7"/><path d="M14.5 9.5l7-7"/><path d="M9.5 14.5l-7 7"/><path d="M14.5 14.5l7 7"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-panel z-50 py-1.5 min-w-[180px] max-h-[360px] overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] text-muted font-semibold uppercase tracking-wider">显示列</div>
                {allColumns.map(col => (
                  <label key={col.source_key}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface cursor-pointer text-[13px] font-medium select-none"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenKeys.has(col.source_key)}
                      onChange={() => toggleColumn(col.source_key)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                    />
                    <span>{col.display_label}</span>
                  </label>
                ))}
                {hiddenKeys.size > 0 && (
                  <button
                    onClick={() => setHiddenKeys(new Set())}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-muted hover:text-primary-500 border-t border-gray-100 mt-1 pt-2 cursor-pointer border-none bg-transparent font-medium"
                  >
                    重置全部列
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={addRow}
            className="h-8 px-3 rounded-sm text-muted text-sm font-medium hover:text-ink hover:bg-surface transition-all cursor-pointer border-none bg-transparent"
          >
            + 添加货物
          </button>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
        <table className="min-w-full border-collapse text-sm table-auto">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface text-left w-10 sticky top-0 z-10">#</th>
              {visibleColumns.map(col => (
                <th key={col.source_key}
                  className={`px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface whitespace-nowrap sticky top-0 z-10 ${col.field_type === 'number' ? 'text-right' : 'text-left'}`}
                  style={{ minWidth: colMinWidth(col) }}
                >
                  {col.display_label}
                </th>
              ))}
              <th className="w-11 px-2 py-2.5 text-xs border-b border-gray-200 bg-surface sticky top-0 z-10" />
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3.5 py-2.5 text-muted text-xs">{i + 1}</td>
                {visibleColumns.map(col => (
                  <td key={col.source_key} className={`px-3.5 py-2.5 ${col.field_type === 'number' ? 'text-right tabular-nums' : 'whitespace-nowrap'}`}>
                    {renderInput(i, col.source_key, d[col.source_key], col.field_type === 'number')}
                  </td>
                ))}
                <td className="px-2 py-2.5">
                  {details.length > 1 && (
                    <button onClick={() => deleteRow(i)} className="text-muted hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm cursor-pointer transition-all" title="删除行">
                      <IconTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {details.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-3.5 py-16 text-center text-muted text-sm">
                  <div className="flex justify-center mb-2"><IconBox /></div>
                  点击「AI 提取并审核」自动填充，或点击「+ 添加货物」手动录入
                </td>
              </tr>
            )}
          </tbody>
          {details.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-surface font-bold text-primary-600 sticky bottom-0 z-10">
                <td className="px-3.5 py-3 font-semibold text-left">合计</td>
                {visibleColumns.map(col => {
                  if (col.field_type === 'number') {
                    const total = details.reduce((s: number, d: any) => s + (Number(d[col.source_key]) || 0), 0)
                    return <td key={col.source_key} className="px-3.5 py-3 text-right tabular-nums">{total.toLocaleString(undefined, { minimumFractionDigits: col.source_key.includes('weight') ? 2 : 0 })}</td>
                  }
                  return <td key={col.source_key} className="px-3.5 py-3 text-xs text-muted">—</td>
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
