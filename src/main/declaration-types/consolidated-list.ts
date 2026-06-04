import { registerType } from './index'

registerType({
  type: 'consolidated_list',
  title: '集报清单',
  description: '集中申报模式下的进出口货物清单',
  field_mappings: [
    { source_key: 'pre_entry_number', display_label: '预录入编号', section: 'header', required: false, editable: false, field_type: 'text' },
    { source_key: 'declaration_date', display_label: '申报日期', section: 'header', required: false, editable: true, field_type: 'text' },

    { source_key: 'transport_tool_name', display_label: '运输工具名称', section: 'transport', required: false, editable: true, field_type: 'text' },
    { source_key: 'transport_mode', display_label: '运输方式', section: 'transport', required: false, editable: true, field_type: 'select', options: ['水路运输','铁路运输','公路运输','航空运输'] },

    { source_key: 'consignee_name', display_label: '收货人', section: 'party', required: false, editable: true, field_type: 'text' },
    { source_key: 'consignor_name', display_label: '发货人', section: 'party', required: false, editable: true, field_type: 'text' },

    { source_key: 'port_of_entry', display_label: '入境口岸', section: 'port', required: false, editable: true, field_type: 'text' },
    { source_key: 'port_of_exit', display_label: '出境口岸', section: 'port', required: false, editable: true, field_type: 'text' },

    { source_key: 'trade_mode', display_label: '监管方式', section: 'trade', required: false, editable: true, field_type: 'select', options: ['一般贸易','来料加工','进料加工','保税监管','其他'] },

    { source_key: 'package_count', display_label: '总件数', section: 'package', required: false, editable: true, field_type: 'number' },
    { source_key: 'gross_weight', display_label: '毛重(KG)', section: 'package', required: false, editable: true, field_type: 'number' },
  ],
  cargo_column_mappings: [
    { source_key: 'seq_no', display_label: '#', section: 'cargo', required: false, editable: false, field_type: 'readonly' },
    { source_key: 'cargo_name', display_label: '商品名称', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'hs_code', display_label: 'HS编码', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'quantity', display_label: '数量', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'unit', display_label: '单位', section: 'cargo', required: false, editable: true, field_type: 'text' },
    { source_key: 'gross_weight', display_label: '毛重(KG)', section: 'cargo', required: false, editable: true, field_type: 'number' },
  ],
  validation_rules: [],
})
