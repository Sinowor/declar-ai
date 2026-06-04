import { useState, useEffect } from 'react'
import type { DeclarationItem } from '../App'
import { FIELD_LABELS, SECTION_LABELS } from '../../shared/types'
import type { FieldSection } from '../../shared/types'
import { IconDocument } from './Icons'

interface Props {
  declaration: DeclarationItem
  onEnterEdit: () => void
}

export default function DeclarationPreview({ declaration, onEnterEdit }: Props) {
  const [fields, setFields] = useState<Record<string, any>>({})
  const [cargoDetails, setCargoDetails] = useState<Record<string, any>[]>([])
  const [files, setFiles] = useState<{ file_name: string }[]>([])
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
          setFields(result.data.fields || {})
          setCargoDetails(result.data.cargo_details || [])
          setFiles(Array.isArray(fileList) ? fileList : [])
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [declaration.id])

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

  const fieldEntries = Object.entries(fields).filter(([,v]) => v !== null && v !== '' && v !== undefined)
  const totalPieces = cargoDetails.reduce((s, d) => s + (Number(d.package_count) || 0), 0)
  const totalWeight = cargoDetails.reduce((s, d) => s + (Number(d.gross_weight) || 0), 0)

  return (
    <main className="flex-1 overflow-y-auto bg-surface">
      <div className="drag-region workspace-header px-8 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold">{declaration.displayName}</h1>
            <p className="text-muted text-sm mt-1">{fieldEntries.length} 个字段 · {cargoDetails.length} 行货物</p>
          </div>
          <div className="no-drag">
            <button onClick={onEnterEdit} className="h-10 px-6 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer hover:bg-primary-600 transition-all">进入编辑</button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 max-w-[1200px] mx-auto">
        {/* KPI strip */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '文件', value: files.length, unit: '个', color: '#6D5EF7' },
            { label: '字段', value: fieldEntries.length, unit: '个', color: '#0EA5E9' },
            { label: '货物', value: cargoDetails.length, unit: '行', color: '#22C55E' },
            { label: '总件数', value: totalPieces, unit: '', color: '#F59E0B' },
            { label: '总毛重', value: totalWeight.toFixed(0), unit: 'KG', color: '#EF4444' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: kpi.color }} />
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}{kpi.unit && <span className="text-sm text-muted font-normal ml-0.5">{kpi.unit}</span>}</div>
            </div>
          ))}
        </div>
        {/* Fields by section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200"><h3 className="text-lg font-semibold">提取字段</h3></div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-5">
              {fieldEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase tracking-wider">{FIELD_LABELS[key] || key}</span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cargo KPI */}
        {cargoDetails.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '总件数', value: totalPieces.toLocaleString() },
              { label: '总毛重(KG)', value: totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { label: '集装箱数', value: new Set(cargoDetails.map(d => d.container_number).filter(Boolean)).size },
              { label: '提单数', value: new Set(cargoDetails.map(d => d.bill_of_lading_number).filter(Boolean)).size },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white border border-gray-200 rounded-2xl shadow-card p-5">
                <div className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</div>
                <div className="text-2xl font-bold text-ink tabular-nums">{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="px-6 py-[18px] border-b border-gray-200"><h3 className="text-lg font-semibold">关联文件</h3></div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] bg-surface border border-gray-200">{f.file_name}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center pb-8">
          <button onClick={onEnterEdit} className="h-10 px-8 rounded-sm bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer hover:bg-primary-600 transition-all">进入编辑</button>
        </div>
      </div>
    </main>
  )
}
