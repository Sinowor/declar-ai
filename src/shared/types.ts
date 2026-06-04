export interface TransportInfo {
  entry_exit_transport_tool_name: string | null
  voyage_flight_number: string | null
  customs_transfer_method: string | null
  domestic_transport_method: string | null
}

export interface CargoSummary {
  bill_of_lading_total: number
  cargo_total_pieces: number
  cargo_total_weight: number
  container_total: number
  domestic_transport_tool: string | null
}

export interface CargoDetail {
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

export interface ExtractionNote {
  field: string
  confidence: 'high' | 'medium' | 'low'
  source_document: string
  note: string
}

export interface DeclarationData {
  document_title: string
  pre_entry_number: string | null
  document_number: string | null
  transport_info: TransportInfo
  cargo_summary: CargoSummary
  cargo_details: Omit<CargoDetail, 'id' | 'declaration_id' | 'sort_order'>[]
  extraction_notes: ExtractionNote[]
  file_warnings: FileWarning[]
}

export interface Declaration {
  id: string
  type: DeclarationType
  status: 'draft' | 'processing' | 'review' | 'done' | 'error'
  data: DeclarationData
  created_at: string
  updated_at: string
}

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

export type DeclarationType = 'transit_transport'
// Future types to add: 'import_declaration' | 'inventory_list'

export type DeclarationStatus = 'draft' | 'processing' | 'review' | 'done' | 'error'

export interface DeclarationSchema {
  type: DeclarationType
  title: string
  description: string
  fields: DeclarationField[]
}

export interface DeclarationField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'table' | 'readonly'
  required: boolean
  options?: { label: string; value: string }[]
  tableColumns?: TableColumn[]
  nestedFields?: DeclarationField[]
}

export interface TableColumn {
  key: string
  label: string
  type: 'text' | 'number'
  required: boolean
  editable: boolean
}

export interface AiExtractionRequest {
  declaration_type: DeclarationType
  files: { file_name: string; content: string }[]
}

export interface AiExtractionResponse {
  success: boolean
  data?: DeclarationData
  error?: string
}

export interface FileWarning {
  file_name: string
  reason: string
}

export interface ReviewIssue {
  id: string
  field_path: string
  issue_type: string
  question: string
  severity: string
  suggestion: string
}
