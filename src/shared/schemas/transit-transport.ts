import type { DeclarationSchema, TableColumn } from '../types'

const cargoDetailColumns: TableColumn[] = [
  { key: 'domestic_transport_tool_name', label: '境内运输工具', type: 'text', required: false, editable: true },
  { key: 'bill_of_lading_number', label: '提单号', type: 'text', required: false, editable: true },
  { key: 'container_number', label: '集装箱号', type: 'text', required: false, editable: true },
  { key: 'cargo_name', label: '货物名称', type: 'text', required: false, editable: true },
  { key: 'pieces', label: '件数', type: 'number', required: true, editable: true },
  { key: 'weight', label: '重量(KG)', type: 'number', required: true, editable: true },
  { key: 'customs_lock_number', label: '海关关锁号', type: 'text', required: false, editable: true },
  { key: 'quantity', label: '数量', type: 'number', required: false, editable: true },
]

export const transitTransportSchema: DeclarationSchema = {
  type: 'transit_transport',
  title: '转关运输货物申报单',
  description: '中华人民共和国海关进口转关运输货物申报单',
  fields: [
    { key: 'document_title', label: '申报单标题', type: 'readonly', required: false },
    { key: 'pre_entry_number', label: '预录入编号', type: 'text', required: false },
    { key: 'document_number', label: '申报单编号', type: 'readonly', required: false },
    { key: 'entry_exit_transport_tool_name', label: '进出境运输工具名称', type: 'text', required: false },
    { key: 'voyage_flight_number', label: '航次/航班号', type: 'text', required: false },
    {
      key: 'customs_transfer_method',
      label: '海关转运方式',
      type: 'select',
      required: false,
      options: [
        { label: '过境', value: '过境' },
        { label: '中转', value: '中转' },
        { label: '通运', value: '通运' },
        { label: '直通', value: '直通' },
      ],
    },
    {
      key: 'domestic_transport_method',
      label: '境内运输方式',
      type: 'select',
      required: false,
      options: [
        { label: '铁路运输', value: '铁路运输' },
        { label: '公路运输', value: '公路运输' },
        { label: '航空运输', value: '航空运输' },
        { label: '水路运输', value: '水路运输' },
      ],
    },
    { key: 'bill_of_lading_total', label: '提单总数', type: 'number', required: false },
    { key: 'cargo_total_pieces', label: '货物总件数', type: 'number', required: false },
    { key: 'cargo_total_weight', label: '货物总重量(KG)', type: 'number', required: false },
    { key: 'container_total', label: '集装箱总数', type: 'number', required: false },
    { key: 'domestic_transport_tool', label: '境内运输工具', type: 'text', required: false },
    { key: 'cargo_details', label: '货物明细', type: 'table', required: true, tableColumns: cargoDetailColumns },
  ],
}

export const schemaRegistry: Record<string, DeclarationSchema> = {
  transit_transport: transitTransportSchema,
}
