import { IconTrash, IconBox } from './Icons'
import type { FieldMapping } from '../../shared/types'

interface CargoDetailsTableProps {
  details: Record<string, any>[]
  onUpdate: (details: Record<string, any>[]) => void
  cargoColumns?: FieldMapping[]
}

export default function CargoDetailsTable({ details, onUpdate, cargoColumns }: CargoDetailsTableProps) {
  const columns = cargoColumns && cargoColumns.length > 0
    ? cargoColumns.filter(c => c.source_key !== 'seq_no')
    : [
        { source_key: 'cargo_name', display_label: '商品名称', field_type: 'text' as const },
        { source_key: 'quantity', display_label: '数量', field_type: 'number' as const },
        { source_key: 'gross_weight', display_label: '毛重(KG)', field_type: 'number' as const },
      ]

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
    for (const col of columns) {
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
        <button onClick={addRow}
          className="h-8 px-3 rounded-sm text-muted text-sm font-medium hover:text-ink hover:bg-surface transition-all cursor-pointer border-none bg-transparent"
        >
          + 添加货物
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface text-left w-10">#</th>
              {columns.map(col => (
                <th key={col.source_key}
                  className={`px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface ${col.field_type === 'number' ? 'text-right' : 'text-left'}`}
                >
                  {col.display_label}
                </th>
              ))}
              <th className="w-11 px-2 py-2.5 text-xs border-b border-gray-200 bg-surface" />
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3.5 py-2.5 text-muted text-xs">{i + 1}</td>
                {columns.map(col => (
                  <td key={col.source_key} className={`px-3.5 py-2.5 ${col.field_type === 'number' ? 'text-right tabular-nums' : ''}`}>
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
                <td colSpan={columns.length + 2} className="px-3.5 py-16 text-center text-muted text-sm">
                  <div className="flex justify-center mb-2"><IconBox /></div>
                  点击「AI 提取并审核」自动填充，或点击「+ 添加货物」手动录入
                </td>
              </tr>
            )}
          </tbody>
          {details.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-[#FAFAFE] font-bold text-primary-600">
                <td className="px-3.5 py-3 font-semibold text-left">合计</td>
                {columns.map(col => {
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
