import { registerType } from './index'

registerType({
  type: 'verification_list',
  title: '核注清单',
  description: '加工贸易保税货物进出口核注申报',
  field_mappings: [
    { source_key: 'record_book_number', display_label: '手册/账册编号', section: 'header', required: true, editable: true, field_type: 'text' },
    { source_key: 'contract_number', display_label: '合同号', section: 'header', required: false, editable: true, field_type: 'text' },

    { source_key: 'transport_mode', display_label: '运输方式', section: 'transport', required: false, editable: true, field_type: 'select', options: ['水路运输','铁路运输','公路运输','航空运输'] },
    { source_key: 'domestic_transport_mode', display_label: '境内运输方式', section: 'transport', required: false, editable: true, field_type: 'select', options: ['铁路运输','公路运输','航空运输','水路运输'] },

    { source_key: 'consignee_name', display_label: '收货人', section: 'party', required: false, editable: true, field_type: 'text' },
    { source_key: 'consignor_name', display_label: '发货人', section: 'party', required: false, editable: true, field_type: 'text' },

    { source_key: 'trade_mode', display_label: '监管方式', section: 'trade', required: true, editable: true, field_type: 'select', options: ['来料加工','进料加工','深加工结转','保税监管'] },
    { source_key: 'currency', display_label: '币制', section: 'trade', required: false, editable: true, field_type: 'select', options: ['USD','EUR','CNY','JPY','HKD','GBP','其他'] },

    { source_key: 'bonded_mode', display_label: '保税方式', section: 'customs', required: true, editable: true, field_type: 'text' },
    { source_key: 'tax_category', display_label: '征免性质', section: 'customs', required: false, editable: true, field_type: 'text' },

    { source_key: 'package_count', display_label: '总件数', section: 'package', required: true, editable: true, field_type: 'number' },
    { source_key: 'net_weight', display_label: '净重(KG)', section: 'package', required: true, editable: true, field_type: 'number' },
    { source_key: 'gross_weight', display_label: '毛重(KG)', section: 'package', required: false, editable: true, field_type: 'number' },
  ],
  cargo_column_mappings: [
    { source_key: 'seq_no', display_label: '#', section: 'cargo', required: false, editable: false, field_type: 'readonly' },
    { source_key: 'cargo_name', display_label: '商品名称', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'hs_code', display_label: 'HS编码', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'specification', display_label: '规格型号', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'quantity', display_label: '数量', section: 'cargo', required: true, editable: true, field_type: 'number' },
    { source_key: 'unit', display_label: '单位', section: 'cargo', required: true, editable: true, field_type: 'text' },
    { source_key: 'net_weight', display_label: '净重(KG)', section: 'cargo', required: true, editable: true, field_type: 'number' },
    { source_key: 'country_of_origin', display_label: '原产国', section: 'cargo', required: false, editable: true, field_type: 'text' },
  ],
  validation_rules: [
    { type: 'required', message: '手册/账册编号是核注清单必填项' },
    { type: 'required', message: '保税方式是核注清单必填项' },
  ],
})
