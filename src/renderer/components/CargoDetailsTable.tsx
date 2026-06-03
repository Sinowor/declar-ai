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

export default function CargoDetailsTable({
  details,
  onUpdate,
  confidenceMap = {},
}: CargoDetailsTableProps) {
  const totalPieces = details.reduce((sum, d) => sum + (d.pieces || 0), 0)
  const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0)
  const uniqueContainers = new Set(
    details.map((d) => d.container_number).filter(Boolean)
  ).size
  const uniqueBills = new Set(
    details.map((d) => d.bill_of_lading_number).filter(Boolean)
  ).size

  const updateRow = (index: number, field: string, value: unknown) => {
    const updated = details.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    )
    onUpdate(updated)
  }

  const deleteRow = (index: number) => {
    if (details.length <= 1) return
    onUpdate(details.filter((_, i) => i !== index))
  }

  const addRow = () => {
    const newRow: CargoDetail = {
      id: '',
      declaration_id: '',
      domestic_transport_tool_name: null,
      bill_of_lading_number: null,
      container_number: null,
      cargo_name: '新货物',
      pieces: 0,
      weight: 0,
      customs_lock_number: null,
      quantity: 1,
      sort_order: details.length,
    }
    onUpdate([...details, newRow])
  }

  const confidenceDot = (index: number, field: string) => {
    const level = confidenceMap[index]?.[field]
    if (!level) return null
    const colors: Record<string, string> = {
      high: 'bg-emerald-400',
      medium: 'bg-amber-400',
      low: 'bg-red-400',
    }
    return (
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${colors[level] || ''}`}
        title={`置信度: ${level}`}
      />
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold">货物明细</h3>
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
            <tr className="text-left">
              {[
                '#',
                '货物名称',
                '提单号',
                '集装箱号',
                '件数',
                '重量(KG)',
                '关锁号',
                '数量',
                '',
              ].map((h) => (
                <th
                  key={h}
                  className="px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3.5 py-3 text-muted text-xs">{i + 1}</td>
                <td className="px-3.5 py-3">
                  <input
                    type="text"
                    value={d.cargo_name || ''}
                    onChange={(e) => updateRow(i, 'cargo_name', e.target.value)}
                    className="w-full h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans"
                  />
                  {confidenceDot(i, 'cargo_name')}
                </td>
                <td className="px-3.5 py-3">
                  <input
                    type="text"
                    value={d.bill_of_lading_number || ''}
                    onChange={(e) => updateRow(i, 'bill_of_lading_number', e.target.value)}
                    className="w-full h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans"
                    placeholder="—"
                  />
                </td>
                <td className="px-3.5 py-3">
                  <input
                    type="text"
                    value={d.container_number || ''}
                    onChange={(e) => updateRow(i, 'container_number', e.target.value)}
                    className="w-full h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans"
                    placeholder="—"
                  />
                </td>
                <td className="px-3.5 py-3 text-right">
                  <input
                    type="number"
                    value={d.pieces}
                    onChange={(e) => updateRow(i, 'pieces', parseInt(e.target.value) || 0)}
                    className="w-24 h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all text-right font-sans tabular-nums"
                  />
                </td>
                <td className="px-3.5 py-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={d.weight}
                    onChange={(e) => updateRow(i, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all text-right font-sans tabular-nums"
                  />
                </td>
                <td className="px-3.5 py-3">
                  <input
                    type="text"
                    value={d.customs_lock_number || ''}
                    onChange={(e) => updateRow(i, 'customs_lock_number', e.target.value)}
                    className="w-24 h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all font-sans"
                    placeholder="—"
                  />
                </td>
                <td className="px-3.5 py-3 text-right">
                  <input
                    type="number"
                    value={d.quantity}
                    onChange={(e) => updateRow(i, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 h-8 rounded-md border border-transparent hover:border-gray-200 focus:border-primary-500 px-2 text-sm outline-none bg-transparent focus:bg-white transition-all text-right font-sans tabular-nums"
                  />
                </td>
                <td className="px-3.5 py-3">
                  <button
                    onClick={() => deleteRow(i)}
                    className="text-muted hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm cursor-pointer transition-all"
                    title="删除行"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {details.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3.5 py-16 text-center text-muted text-sm">
                  <div className="text-3xl mb-2 opacity-20">📦</div>
                  点击「AI 提取数据」自动填充，或点击「+ 添加货物」手动录入
                </td>
              </tr>
            )}
          </tbody>
          {details.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-violet-50 font-bold text-primary-700">
                <td></td>
                <td className="px-3.5 py-3 font-semibold">合计</td>
                <td className="px-3.5 py-3 text-xs text-muted">提单: {uniqueBills}</td>
                <td className="px-3.5 py-3 text-xs text-muted">集装箱: {uniqueContainers}</td>
                <td className="px-3.5 py-3 text-right">{totalPieces.toLocaleString()}</td>
                <td className="px-3.5 py-3 text-right">{totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-3.5 py-3">—</td>
                <td className="px-3.5 py-3 text-right">{details.reduce((s, d) => s + (d.quantity || 0), 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
