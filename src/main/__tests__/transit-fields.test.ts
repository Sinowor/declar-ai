import { describe, it, expect } from 'vitest'
import { FIELD_LABELS, CARGO_FIELD_LABELS } from '../../shared/types'

describe('transit_transport field labels', () => {
  const requiredBasicFields = [
    'customs_declaration_port',
    'entry_exit_port',
    'declaration_unit_name',
    'domestic_transport_mode',
    'domestic_transport_tool_name',
    'carrier_name',
    'estimated_arrival_date',
  ]

  const requiredBlFields = [
    'transport_mode', 'vessel_name_en', 'voyage_no',
    'bill_of_lading_no', 'bl_package_count', 'bl_gross_weight', 'consignee_name',
  ]

  const requiredCargoFields = [
    'hs_code', 'cargo_name_spec', 'package_count', 'unit',
    'gross_weight', 'total_price', 'currency_code',
  ]

  const containerFields = [
    'container_no', 'container_size', 'container_package_count',
    'container_weight', 'customs_lock_count', 'customs_lock_no',
    'seal_no', 'container_transport_tool_name', 'container_transport_tool_id',
    'container_transport_tool_weight',
  ]

  it('all 7 required basic fields have labels', () => {
    for (const f of requiredBasicFields) {
      expect(FIELD_LABELS[f], `Missing FIELD_LABELS for ${f}`).toBeTypeOf('string')
      expect(FIELD_LABELS[f].length).toBeGreaterThan(0)
    }
  })

  it('all 7 required BL fields have labels', () => {
    for (const f of requiredBlFields) {
      expect(FIELD_LABELS[f], `Missing FIELD_LABELS for ${f}`).toBeTypeOf('string')
      expect(FIELD_LABELS[f].length).toBeGreaterThan(0)
    }
  })

  it('all 7 required cargo fields have labels in FIELD_LABELS or CARGO_FIELD_LABELS', () => {
    for (const f of requiredCargoFields) {
      const label = FIELD_LABELS[f] || CARGO_FIELD_LABELS[f]
      expect(label, `Missing label for ${f}`).toBeTypeOf('string')
    }
  })

  it('all 10 container fields have labels', () => {
    for (const f of containerFields) {
      expect(FIELD_LABELS[f], `Missing FIELD_LABELS for ${f}`).toBeTypeOf('string')
      expect(FIELD_LABELS[f].length).toBeGreaterThan(0)
    }
  })

  it('no duplicate labels within transit-specific fields', () => {
    const transitFields = [...requiredBasicFields, ...requiredBlFields, ...containerFields]
    const labels = transitFields.map(f => FIELD_LABELS[f])
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })

  it('container_numbers field exists for container-cargo mapping', () => {
    const allLabels = { ...FIELD_LABELS, ...CARGO_FIELD_LABELS }
    expect(allLabels['container_numbers']).toBe('所在集装箱号')
  })
})
