import { registerType } from './index'

registerType({
  type: 'export_declaration',
  title: '出口货物报关单',
  description: '一般出口货物整合申报',
  field_mappings: [
    { source_key: 'pre_entry_number', display_label: '预录入编号', section: 'header', required: false, editable: false, field_type: 'text' },
    { source_key: 'contract_number', display_label: '合同号', section: 'header', required: false, editable: true, field_type: 'text' },
    { source_key: 'invoice_number', display_label: '发票号', section: 'header', required: false, editable: true, field_type: 'text' },
    { source_key: 'declaration_date', display_label: '申报日期', section: 'header', required: false, editable: true, field_type: 'text' },

    { source_key: 'transport_tool_name', display_label: '运输工具名称', section: 'transport', required: true, editable: true, field_type: 'text' },
    { source_key: 'voyage_flight_number', display_label: '航次/航班号', section: 'transport', required: true, editable: true, field_type: 'text' },
    { source_key: 'transport_mode', display_label: '运输方式', section: 'transport', required: true, editable: true, field_type: 'select', options: ['水路运输','铁路运输','公路运输','航空运输'] },

    { source_key: 'exporter_name', display_label: '出口商', section: 'party', required: true, editable: true, field_type: 'text' },
    { source_key: 'consignee_name', display_label: '收货人', section: 'party', required: false, editable: true, field_type: 'text' },
    { source_key: 'consignor_name', display_label: '发货人', section: 'party', required: true, editable: true, field_type: 'text' },

    { source_key: 'port_of_exit', display_label: '出境口岸', section: 'port', required: true, editable: true, field_type: 'text' },
    { source_key: 'port_of_discharge', display_label: '卸货港', section: 'port', required: false, editable: true, field_type: 'text' },
    { source_key: 'country_of_destination', display_label: '目的国', section: 'port', required: true, editable: true, field_type: 'text' },
    { source_key: 'country_of_export', display_label: '出口国', section: 'port', required: false, editable: true, field_type: 'text' },

    { source_key: 'trade_mode', display_label: '监管方式', section: 'trade', required: true, editable: true, field_type: 'select', options: ['一般贸易','来料加工','进料加工','保税监管','其他'] },
    { source_key: 'trade_terms', display_label: '成交方式', section: 'trade', required: true, editable: true, field_type: 'select', options: ['FOB','CIF','CFR','EXW','FCA','其他'] },
    { source_key: 'currency', display_label: '币制', section: 'trade', required: true, editable: true, field_type: 'select', options: ['USD','EUR','CNY','JPY','HKD','GBP','其他'] },

    { source_key: 'package_count', display_label: '总件数', section: 'package', required: true, editable: true, field_type: 'number' },
    { source_key: 'gross_weight', display_label: '毛重(KG)', section: 'package', required: true, editable: true, field_type: 'number' },
    { source_key: 'net_weight', display_label: '净重(KG)', section: 'package', required: true, editable: true, field_type: 'number' },
  ],
  cargo_column_mappings: [
    { source_key: 'seq_no', display_label: '#', section: 'cargo', required: false, editable: false, field_type: 'readonly' },
    { source_key: 'cargo_name', display_label: '商品名称', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'hs_code', display_label: 'HS编码', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'quantity', display_label: '数量', section: 'cargo', required: true, editable: true, field_type: 'number' },
    { source_key: 'unit', display_label: '单位', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'unit_price', display_label: '单价', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'total_price', display_label: '总价', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'net_weight', display_label: '净重(KG)', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'package_count', display_label: '件数', section: 'cargo', required: false, editable: true, field_type: 'number' },
    { source_key: 'container_number', display_label: '集装箱号', section: 'cargo', required: false, editable: true, field_type: 'text' },
  ],
  validation_rules: [
    { type: 'required', message: '出口商是出口报关单必填项' },
    { type: 'required', message: '出境口岸是出口报关单必填项' },
  ],
})
