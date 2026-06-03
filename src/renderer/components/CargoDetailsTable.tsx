import { IconTrash, IconBox } from './Icons'

interface CargoDetail {
  id: string
  declaration_id: string
  domestic_transport_tool_name: string | null
  bill_of_lading_number: string | null
  container_number: string | null
  cargo_name: string | null
  pieces: number
  weight: number
  customs_lock_number: string | null
  quantity: number
  sort_order: number
}

interface CargoDetailsTableProps {
  details: CargoDetail[]
  onUpdate: (details: CargoDetail[]) => void
  confidenceMap?: Record<number, Record<string, string>>
}

const columns = [
  { key: '#', label: '#', type: 'index' as const },
  { key: 'domestic_transport_tool_name', label: '境内运输工具', type: 'text' as const },
  { key: 'cargo_name', label: '货物名称', type: 'text' as const },
  { key: 'bill_of_lading_number', label: '提单号', type: 'text' as const },
  { key: 'container_number', label: '集装箱号', type: 'text' as const },
  { key: 'pieces', label: '件数', type: 'number' as const },
  { key: 'weight', label: '重量(KG)', type: 'number' as const },
  { key: 'customs_lock_number', label: '关锁号', type: 'text' as const },
  { key: 'quantity', label: '数量', type: 'number' as const },
]

export default function CargoDetailsTable({
  details,
  onUpdate,
  confidenceMap = {},
}: CargoDetailsTableProps) {
  const totalPieces = details.reduce((sum, d) => sum + (d.pieces || 0), 0)
  const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0)
  const uniqueContainers = new Set(details.map((d) => d.container_number).filter(Boolean)).size
  const uniqueBills = new Set(details.map((d) => d.bill_of_lading_number).filter(Boolean)).size

  const updateRow = (index: number, field: string, value: unknown) => {
    const updated = details.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    onUpdate(updated)
  }

  const deleteRow = (index: number) => {
    if (details.length <= 1) return
    onUpdate(details.filter((_, i) => i !== index))
  }

  const addRow = () => {
    const newRow: CargoDetail = {
      id: '', declaration_id: '',
      domestic_transport_tool_name: '',
      bill_of_lading_number: null,
      container_number: null,
      cargo_name: '新货物', pieces: 0, weight: 0,
      customs_lock_number: null, quantity: 1,
      sort_order: details.length,
    }
    onUpdate([...details, newRow])
  }

  const confidenceDot = (index: number, field: string) => {
    const level = confidenceMap[index]?.[field]
    if (!level) return null
    const colors: Record<string, string> = {
      high: 'bg-emerald-400', medium: 'bg-amber-400', low: 'bg-red-400',
    }
    return <span className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${colors[level] || ''}`} title={`置信度: ${level}`} />
  }

  const renderInput = (index: number, field: string, value: any, width: string, placeholder = '—', step?: string) => {
    const isNumber = columns.find(c => c.key === field)?.type === 'number'
    return (
      <>
        <input
          type={isNumber ? 'number' : 'text'}
          value={value ?? ''}
          step={step}
          onChange={(e) => updateRow(index, field, isNumber ? (parseFloat(e.target.value) || 0) : e.target.value)}
          className={`${width} h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans ${isNumber ? 'text-right tabular-nums' : ''}`}
          placeholder={placeholder}
        />
        {confidenceDot(index, field)}
      </>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
      <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-200">
        <h3 className="text-lg font-semibold">货物明细</h3>
        <button
          onClick={addRow}
          className="h-8 px-3 rounded-lg text-muted text-sm font-medium hover:text-ink hover:bg-surface transition-all cursor-pointer border-none bg-transparent"
        >
          + 添加货物
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface ${col.type === 'number' ? 'text-right' : 'text-left'}`}>
                  {col.label}
                </th>
              ))}
              <th className="w-11 px-2 py-2.5 text-xs border-b border-gray-200 bg-surface" />
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3.5 py-3 text-muted text-xs">{i + 1}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'domestic_transport_tool_name', d.domestic_transport_tool_name, 'w-20')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'cargo_name', d.cargo_name, 'w-full min-w-[80px]')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'bill_of_lading_number', d.bill_of_lading_number, 'w-full min-w-[100px]')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'container_number', d.container_number, 'w-full min-w-[100px]')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'pieces', d.pieces, 'w-20', undefined, '1')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'weight', d.weight, 'w-24', undefined, '0.01')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'customs_lock_number', d.customs_lock_number, 'w-24')}</td>
                <td className="px-3.5 py-3">{renderInput(i, 'quantity', d.quantity, 'w-20', undefined, '1')}</td>
                <td className="px-2 py-3">
                  {details.length > 1 && (
                    <button onClick={() => deleteRow(i)} className="text-muted hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm cursor-pointer transition-all" title="删除行"><IconTrash /></button>
                  )}
                </td>
              </tr>
            ))}
            {details.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3.5 py-16 text-center text-muted text-sm">
                  <div className="flex justify-center mb-2"><IconBox /></div>
                  点击「AI 提取数据」自动填充，或点击「+ 添加货物」手动录入
                </td>
              </tr>
            )}
          </tbody>
          {details.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-[#FAFAFE] font-bold text-primary-600">
                <td className="px-3.5 py-3 font-semibold text-left" colSpan={2}>合计</td>
                <td className="px-3.5 py-3" />
                <td className="px-3.5 py-3 text-xs text-muted">提单: {uniqueBills}</td>
                <td className="px-3.5 py-3 text-xs text-muted">集装箱: {uniqueContainers}</td>
                <td className="px-3.5 py-3 text-right">{totalPieces.toLocaleString()}</td>
                <td className="px-3.5 py-3 text-right">{totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-3.5 py-3">—</td>
                <td className="px-3.5 py-3 text-right">{details.reduce((s, d) => s + (d.quantity || 0), 0)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
