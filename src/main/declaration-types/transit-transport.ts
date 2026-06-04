import { registerType } from './index'

registerType({
  type: 'transit_transport',
  title: '转关运输货物申报单',
  description: '海关进口转关运输货物申报（含过境、中转、直转）',
  field_mappings: [
    { source_key: 'pre_entry_number', display_label: '预录入编号', section: 'header', required: false, editable: false, field_type: 'text' },

    { source_key: 'transport_tool_name', display_label: '进出境运输工具名称', section: 'transport', required: true, editable: true, field_type: 'text' },
    { source_key: 'voyage_flight_number', display_label: '航次/航班号', section: 'transport', required: false, editable: true, field_type: 'text' },
    { source_key: 'transit_method', display_label: '海关转运方式', section: 'transport', required: true, editable: true, field_type: 'select', options: ['过境','中转','通运','直通'] },
    { source_key: 'domestic_transport_mode', display_label: '境内运输方式', section: 'transport', required: false, editable: true, field_type: 'select', options: ['铁路运输','公路运输','航空运输','水路运输'] },

    { source_key: 'manifest_number', display_label: '载货清单号', section: 'customs', required: false, editable: true, field_type: 'text' },
    { source_key: 'seal_number', display_label: '关锁号', section: 'customs', required: false, editable: true, field_type: 'text' },

    { source_key: 'container_count', display_label: '集装箱数', section: 'package', required: false, editable: true, field_type: 'number' },
    { source_key: 'package_count', display_label: '总件数', section: 'package', required: false, editable: true, field_type: 'number' },
    { source_key: 'gross_weight', display_label: '总毛重(KG)', section: 'package', required: false, editable: true, field_type: 'number' },
  ],
  cargo_column_mappings: [
    { source_key: 'seq_no', display_label: '#', section: 'cargo', required: false, editable: false, field_type: 'readonly' },
    { source_key: 'cargo_name', display_label: '货物名称', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'domestic_transport_tool', display_label: '境内运输工具', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'bill_of_lading_number', display_label: '提单号', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'container_number', display_label: '集装箱号', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'package_count', display_label: '件数', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'gross_weight', display_label: '重量(KG)', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'seal_number', display_label: '关锁号', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'quantity', display_label: '数量', section: 'cargo', required: false, editable: true, field_type: 'number' },
  ],
  validation_rules: [
    { type: 'required', message: '进出境运输工具名称是转关运输申报单必填项' },
    { type: 'consistency', field: 'gross_weight', expression: '>0', message: '重量必须大于0' },
  ],
})
