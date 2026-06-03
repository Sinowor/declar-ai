import { useState, useEffect } from 'react'
import type { DeclarationItem } from '../App'
import { IconDocument } from './Icons'

interface Props {
  declaration: DeclarationItem
  onEnterEdit: () => void
}

interface PreviewData {
  displayNumber: string | null
  preEntryNumber: string | null
  transportInfo: Record<string, string | null>
  cargoSummary: Record<string, number | string | null>
  cargoDetails: Record<string, any>[]
  files: { file_name: string; file_type: string }[]
}

const transportLabels: Record<string, string> = {
  entry_exit_transport_tool_name: '进出境运输工具',
  voyage_flight_number: '航次/航班号',
  customs_transfer_method: '海关转运方式',
  domestic_transport_method: '境内运输方式',
}

const cargoCols = [
  { key: 'cargo_name', label: '货物名称' },
  { key: 'pieces', label: '件数', right: true },
  { key: 'weight', label: '重量(KG)', right: true },
  { key: 'container_number', label: '集装箱号' },
  { key: 'bill_of_lading_number', label: '提单号' },
  { key: 'customs_lock_number', label: '关锁号' },
]

export default function DeclarationPreview({ declaration, onEnterEdit }: Props) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        if (window.api?.getDeclaration && window.api?.getFiles) {
          const [result, fileList] = await Promise.all([
            window.api.getDeclaration(declaration.id),
            window.api.getFiles(declaration.id),
          ])
          if (cancelled || !result?.data) return
          const d = result.data
          setData({
            displayNumber: declaration.displayNumber,
            preEntryNumber: d.pre_entry_number,
            transportInfo: d.transport_info || {},
            cargoSummary: d.cargo_summary || {},
            cargoDetails: d.cargo_details || [],
            files: Array.isArray(fileList) ? fileList : [],
          })
        }
      } catch (err) {
        console.error('Failed to load preview:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [declaration.id, declaration.displayNumber])

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-muted text-sm">加载申报单数据...</div>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center py-20">
          <div className="flex justify-center mb-4"><IconDocument /></div>
          <h3 className="text-lg font-semibold mb-2">数据加载失败</h3>
          <p className="text-muted text-sm">请检查申报单数据是否完整</p>
        </div>
      </main>
    )
  }

  const totalPieces = data.cargoDetails.reduce((s: number, d: any) => s + (d.pieces || 0), 0)
  const totalWeight = data.cargoDetails.reduce((s: number, d: any) => s + (d.weight || 0), 0)

  return (
    <main className="flex-1 overflow-y-auto bg-surface">
      {/* Header */}
      <div className="drag-region workspace-header px-8 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold">
              {data.displayNumber || data.preEntryNumber || '未编号申报单'}
            </h1>
            <p className="text-muted text-sm mt-1">
              转关运输货物申报单
              {data.preEntryNumber && data.displayNumber !== data.preEntryNumber && (
                <span className="ml-3 text-xs opacity-60">预录入编号：{data.preEntryNumber}</span>
              )}
            </p>
          </div>
          <div className="no-drag">
            <button
              onClick={onEnterEdit}
              className="h-10 px-6 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer hover:bg-primary-600 transition-all"
            >
              进入编辑
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 max-w-[1200px] mx-auto">
        {/* Transport Info */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">运输信息</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-5">
              {Object.entries(transportLabels).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
                  <span className="text-sm font-medium">
                    {data.transportInfo[key] || <span className="text-muted font-normal">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cargo Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '总件数', value: totalPieces.toLocaleString() },
            { label: '总重量(KG)', value: totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
            { label: '集装箱数', value: data.cargoSummary.container_total || 0 },
            { label: '提单数', value: data.cargoSummary.bill_of_lading_total || 0 },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-gray-200 rounded-2xl shadow-card p-5">
              <div className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className="text-2xl font-bold text-ink tabular-nums">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Cargo Details Table (read-only) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">货物明细</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface text-left">#</th>
                  {cargoCols.map((col) => (
                    <th key={col.key} className={`px-3.5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-gray-200 bg-surface ${col.right ? 'text-right' : 'text-left'}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cargoDetails.map((d: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3.5 py-3 text-muted text-xs">{i + 1}</td>
                    {cargoCols.map((col) => (
                      <td key={col.key} className={`px-3.5 py-3 ${col.right ? 'text-right tabular-nums' : ''}`}>
                        {d[col.key] != null && d[col.key] !== ''
                          ? (col.right && typeof d[col.key] === 'number'
                              ? d[col.key].toLocaleString(undefined, col.key === 'weight' ? { minimumFractionDigits: 2 } : undefined)
                              : d[col.key])
                          : <span className="text-muted">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
                {data.cargoDetails.length === 0 && (
                  <tr><td colSpan={7} className="px-3.5 py-16 text-center text-muted text-sm">暂无货物明细</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Files */}
        {data.files.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="px-6 py-[18px] border-b border-gray-200">
              <h3 className="text-lg font-semibold">关联文件</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {data.files.map((f, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] bg-surface border border-gray-200">
                    {f.file_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enter Edit Button */}
        <div className="flex justify-center pb-8">
          <button
            onClick={onEnterEdit}
            className="h-10 px-8 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer hover:bg-primary-600 transition-all"
          >
            进入编辑
          </button>
        </div>
      </div>
    </main>
  )
}
