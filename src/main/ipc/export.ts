import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as XLSX from 'xlsx'
import { queryOne } from '../db'
import { readJsonFile, declarationJsonPath } from '../storage'
import { FIELD_LABELS } from '../../shared/types'

function getLabel(key: string): string {
  return (FIELD_LABELS as any)[key] || key
}

function htmlEscape(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerExportIpc() {
  // ═══ Excel Export ═══
  ipcMain.handle('export:transit-excel', async (_event, declarationId: string) => {
    const row: any = queryOne('SELECT folder_path, display_name FROM declarations WHERE id = ?', [declarationId])
    if (!row) return { success: false, error: '申报单不存在' }

    const data = readJsonFile(declarationJsonPath(row.folder_path))
    if (!data) return { success: false, error: '申报单数据不存在，请先完成 AI 提取' }

    const { fields = {}, cargo_details = [], container_details = [] } = data

    // Build workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: 基本信息 + 提运单信息
    const basicFields = [
      'customs_declaration_port', 'entry_exit_port', 'declaration_unit_name',
      'declaration_unit_credit_code', 'declaration_unit_customs_code',
      'domestic_transport_mode', 'domestic_transport_tool_name', 'domestic_transport_tool_id',
      'domestic_transport_voyage', 'carrier_name', 'estimated_arrival_date',
      'declaration_form_no', 'notes',
    ]
    const blFields = [
      'transport_mode', 'vessel_no', 'vessel_name_en', 'voyage_no',
      'bill_of_lading_no', 'entry_exit_date', 'bl_package_count',
      'bl_gross_weight', 'previous_declaration_no', 'consignee_name',
    ]
    const basicData = [['字段', '值', '']]
    basicData.push(['── 基本信息 ──', '', ''])
    for (const k of basicFields) {
      basicData.push([getLabel(k), fields[k] ?? '', ''])
    }
    basicData.push(['', '', ''])
    basicData.push(['── 提运单信息 ──', '', ''])
    for (const k of blFields) {
      basicData.push([getLabel(k), fields[k] ?? '', ''])
    }
    const ws1 = XLSX.utils.aoa_to_sheet(basicData)
    ws1['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws1, '基本信息+提运单')

    // Sheet 2: 集装箱明细
    if (container_details.length > 0) {
      const containerKeys = Object.keys(container_details[0]).filter(k => k !== 'seq_no')
      const containerHeader = containerKeys.map(k => getLabel(k))
      const containerRows = container_details.map((c: any) => containerKeys.map(k => c[k] ?? ''))
      const ws2 = XLSX.utils.aoa_to_sheet([containerHeader, ...containerRows])
      ws2['!cols'] = containerKeys.map(() => ({ wch: 18 }))
      XLSX.utils.book_append_sheet(wb, ws2, '集装箱明细')
    }

    // Sheet 3: 商品明细
    if (cargo_details.length > 0) {
      const cargoKeys = Object.keys(cargo_details[0]).filter(k => k !== 'seq_no')
      const cargoHeader = cargoKeys.map(k => getLabel(k))
      const cargoRows = cargo_details.map((c: any) => cargoKeys.map(k => c[k] ?? ''))
      const ws3 = XLSX.utils.aoa_to_sheet([cargoHeader, ...cargoRows])
      ws3['!cols'] = cargoKeys.map(() => ({ wch: 18 }))
      XLSX.utils.book_append_sheet(wb, ws3, '商品明细')
    }

    // Save dialog
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
      title: '导出转关单 Excel',
      defaultPath: `${row.display_name || '转关单'}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    })
    if (result.canceled) return { success: false, error: '已取消' }

    XLSX.writeFile(wb, result.filePath!)
    return { success: true, path: result.filePath }
  })

  // ═══ PDF Export ═══
  ipcMain.handle('export:transit-pdf', async (_event, declarationId: string) => {
    const row: any = queryOne('SELECT folder_path, display_name FROM declarations WHERE id = ?', [declarationId])
    if (!row) return { success: false, error: '申报单不存在' }

    const data = readJsonFile(declarationJsonPath(row.folder_path))
    if (!data) return { success: false, error: '申报单数据不存在' }

    const { fields = {}, cargo_details = [], container_details = [] } = data

    // Build HTML
    const buildRows = (obj: Record<string, any>, keys: string[]) =>
      keys.filter(k => obj[k] != null && obj[k] !== '')
        .map(k => `<tr><td class="label">${getLabel(k)}</td><td>${htmlEscape(obj[k])}</td></tr>`).join('')

    const buildTable = (items: any[], keys: string[]) => {
      if (items.length === 0) return '<p class="empty">暂无数据</p>'
      const h = keys.map(k => `<th>${getLabel(k)}</th>`).join('')
      const rows = items.map((c: any) => '<tr>' + keys.map(k => `<td>${htmlEscape(c[k])}</td>`).join('') + '</tr>').join('')
      return `<table><thead><tr>${h}</tr></thead><tbody>${rows}</tbody></table>`
    }

    const basicKeys = ['customs_declaration_port', 'entry_exit_port', 'declaration_unit_name', 'declaration_unit_credit_code', 'declaration_unit_customs_code', 'domestic_transport_mode', 'domestic_transport_tool_name', 'domestic_transport_tool_id', 'domestic_transport_voyage', 'carrier_name', 'estimated_arrival_date', 'declaration_form_no', 'notes']
    const blKeys = ['transport_mode', 'vessel_no', 'vessel_name_en', 'voyage_no', 'bill_of_lading_no', 'entry_exit_date', 'bl_package_count', 'bl_gross_weight', 'previous_declaration_no', 'consignee_name']
    const containerKeys = container_details.length > 0 ? Object.keys(container_details[0]).filter(k => k !== 'seq_no') : []
    const cargoKeys = cargo_details.length > 0 ? Object.keys(cargo_details[0]).filter(k => k !== 'seq_no') : []

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 40px; color: #111; font-size: 13px; }
      h1 { text-align: center; font-size: 22px; margin-bottom: 6px; }
      .sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 30px; }
      h2 { font-size: 15px; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 24px 0 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; font-weight: 600; }
      .label { color: #666; width: 140px; }
      .footer { margin-top: 40px; text-align: right; color: #666; }
      .empty { color: #999; font-style: italic; }
    </style></head><body>
      <h1>转关运输货物申报单</h1>
      <p class="sub">${row.display_name || ''} · 导出时间: ${new Date().toLocaleString('zh-CN')}</p>
      <h2>一、基本信息</h2>
      <table>${buildRows(fields, basicKeys)}</table>
      <h2>二、提运单信息</h2>
      <table>${buildRows(fields, blKeys)}</table>
      <h2>三、集装箱明细</h2>
      ${buildTable(container_details, containerKeys)}
      <h2>四、商品明细</h2>
      ${buildTable(cargo_details, cargoKeys)}
      <div class="footer">申报单位（盖章）：_______________ 日期：_______________</div>
    </body></html>`

    // Create hidden window for PDF
    const bw = new BrowserWindow({ width: 800, height: 600, show: false })
    const loaded = new Promise<void>(resolve => bw.webContents.once('did-finish-load', () => resolve()))
    bw.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await loaded

    const pdfData = await bw.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 15, right: 15 },
    })

    // Show save dialog while bw still exists (required on macOS)
    const result = await dialog.showSaveDialog(bw, {
      title: '导出转关单 PDF',
      defaultPath: `${row.display_name || '转关单'}.pdf`,
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })

    bw.close()

    if (result.canceled) return { success: false, error: '已取消' }

    fs.writeFileSync(result.filePath!, pdfData)
    return { success: true, path: result.filePath }
  })
}
