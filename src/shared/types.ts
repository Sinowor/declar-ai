// ═══ Universal Field Pool ═══

export interface UniversalDeclarationData {
  fields: Record<string, any>           // all top-level fields, keyed by english identifier
  cargo_details: Record<string, any>[]  // array of cargo line items, each is a flat dict
  extraction_notes: ExtractionNote[]
  file_warnings: FileWarning[]
}

export interface ExtractionNote {
  field: string
  confidence: 'high' | 'medium' | 'low'
  source_document: string
  note: string
}

export interface FileWarning {
  file_name: string
  reason: string
}

// ═══ Declaration ═══

export type DeclarationTypeKey =
  | 'import_declaration'
  | 'export_declaration'
  | 'inbound_filing_list'
  | 'outbound_filing_list'
  | 'transit_transport'
  | 'verification_list'
  | 'consolidated_list'

export interface Declaration {
  id: string
  type: DeclarationTypeKey | null       // null until user selects a type
  status: DeclarationStatus
  data: UniversalDeclarationData
  created_at: string
  updated_at: string
}

export type DeclarationStatus = 'draft' | 'processing' | 'review' | 'done' | 'error'

// ═══ Declaration Type Registry ═══

export type FieldSection = 'header' | 'transport' | 'party' | 'port' | 'trade' | 'customs' | 'package' | 'cargo'

export interface FieldMapping {
  source_key: string
  display_label: string
  section: FieldSection
  required: boolean
  editable: boolean
  field_type: 'text' | 'number' | 'select' | 'readonly'
  options?: string[]
  default_value?: any
}

export interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'consistency'
  field?: string
  expression?: string
  message: string
}

export interface DeclarationTypeConfig {
  type: DeclarationTypeKey
  title: string
  description: string
  field_mappings: FieldMapping[]
  cargo_column_mappings: FieldMapping[]  // which universal cargo fields to show as columns
  validation_rules: ValidationRule[]
}

// ═══ DB Models ═══

export interface DeclarationFile {
  id: string
  declaration_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  extracted_text: string | null
  created_at: string
}

export interface AiConversation {
  id: string
  declaration_id: string
  role: 'ai' | 'user'
  field_path: string | null
  question: string | null
  answer: string | null
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
}

export interface ReviewIssue {
  id: string
  field_path: string
  issue_type: string
  question: string
  severity: string
  suggestion: string
}

// ═══ Field Label Registry (key → default Chinese label) ═══

export const FIELD_LABELS: Record<string, string> = {
  // Header
  pre_entry_number: '预录入编号',
  contract_number: '合同号',
  invoice_number: '发票号',
  invoice_date: '发票日期',
  declaration_date: '申报日期',
  // Transport
  transport_tool_name: '运输工具名称',
  voyage_flight_number: '航次/航班号',
  transport_mode: '运输方式',
  domestic_transport_mode: '境内运输方式',
  customs_transfer_method: '海关转运方式',
  border_transport_mode: '进出境关别',
  // Party
  exporter_name: '出口商',
  exporter_address: '出口商地址',
  consignee_name: '收货人',
  consignee_address: '收货人地址',
  consignor_name: '发货人',
  notify_party_name: '通知方',
  manufacturer_name: '生产厂商',
  // Port
  port_of_loading: '启运港',
  port_of_discharge: '卸货港',
  port_of_entry: '入境口岸',
  port_of_exit: '出境口岸',
  country_of_origin: '原产国',
  country_of_destination: '目的国',
  country_of_export: '出口国',
  // Trade
  trade_mode: '监管方式',
  trade_terms: '成交方式',
  currency: '币制',
  exchange_rate: '汇率',
  payment_method: '付款方式',
  insurance_amount: '保险费',
  freight_amount: '运费',
  // Customs
  transit_method: '转关方式',
  manifest_number: '载货清单号',
  seal_number: '关锁号',
  supervision_mode: '监管方式',
  tax_category: '征免性质',
  // Package
  package_type: '包装种类',
  package_count: '总件数',
  gross_weight: '毛重(KG)',
  net_weight: '净重(KG)',
  container_count: '集装箱数',
  marks: '唛头',
  // Bonded
  record_book_number: '备案号/手册号',
  bonded_mode: '保税方式',
  // Transit — Basic Info
  customs_declaration_port: '申报地海关',
  entry_exit_port: '进出口岸',
  declaration_unit_name: '申报单位',
  declaration_unit_credit_code: '统一社会信用代码',
  declaration_unit_customs_code: '海关10位编码',
  domestic_transport_tool_name: '境内运输工具名称',
  domestic_transport_tool_id: '境内运输工具编号',
  domestic_transport_voyage: '境内运输工具航次',
  carrier_name: '承运单位',
  estimated_arrival_date: '预计运抵指运地日期',
  declaration_form_no: '申报单号',
  notes: '备注',
  // Transit — Bill of Lading (前程提运单)
  vessel_no: '船舶编号',
  vessel_name_en: '船舶英文名',
  voyage_no: '航次号',
  bill_of_lading_no: '提单号',
  entry_exit_date: '进出境日期',
  bl_package_count: '件数（提单）',
  bl_gross_weight: '重量（提单）',
  previous_declaration_no: '前程报关单号',
  // Transit — Container fields
  container_no: '集装箱号',
  container_size: '集装箱尺寸',
  container_package_count: '件数（箱）',
  container_weight: '重量（箱）',
  container_transport_tool_id: '运输工具编号',
  container_transport_tool_name: '运输工具名称',
  container_transport_tool_weight: '运输工具重量',
  customs_lock_count: '关锁个数',
  customs_lock_no: '关锁号',
  seal_no: '封志号',
  // Transit — Cargo fields
  hs_code: '商品编码',
  cargo_name_spec: '品名及规格',
  packaging: '包装',
  quantity: '数量',
  unit: '单位',
  total_price: '总价',
  currency_code: '币制',
  container_numbers: '所在集装箱号',
}

export const CARGO_FIELD_LABELS: Record<string, string> = {
  seq_no: '序号',
  cargo_name: '商品名称',
  cargo_name_en: '商品英文名称',
  hs_code: 'HS编码',
  specification: '规格型号',
  quantity: '数量',
  unit: '单位',
  unit_price: '单价',
  total_price: '总价',
  gross_weight: '毛重(KG)',
  net_weight: '净重(KG)',
  package_type: '包装类型',
  package_count: '件数',
  container_number: '集装箱号',
  bill_of_lading_number: '提单号',
  country_of_origin: '原产国',
  seal_number: '关锁号',
  domestic_transport_tool: '境内运输工具',
}

export const SECTION_LABELS: Record<FieldSection, string> = {
  header: '单证基础',
  transport: '运输信息',
  party: '贸易当事人',
  port: '口岸与地域',
  trade: '贸易条件',
  customs: '海关参数',
  package: '包装与物流',
  cargo: '货物明细',
}
