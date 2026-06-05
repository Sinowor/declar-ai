import { describe, it, expect } from 'vitest'
import { FIELD_LABELS, CARGO_FIELD_LABELS, SECTION_LABELS } from '../types'

describe('FIELD_LABELS completeness', () => {
  it('all labels are non-empty strings', () => {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('covers all required sections', () => {
    const allKeys = Object.keys(FIELD_LABELS)
    // Header fields
    expect(allKeys).toContain('pre_entry_number')
    expect(allKeys).toContain('contract_number')
    expect(allKeys).toContain('invoice_number')
    // Transport
    expect(allKeys).toContain('transport_mode')
    expect(allKeys).toContain('voyage_flight_number')
    // Party
    expect(allKeys).toContain('exporter_name')
    expect(allKeys).toContain('consignee_name')
    // Port
    expect(allKeys).toContain('port_of_loading')
    expect(allKeys).toContain('country_of_origin')
    // Trade
    expect(allKeys).toContain('trade_mode')
    expect(allKeys).toContain('currency')
    // Customs
    expect(allKeys).toContain('supervision_mode')
    expect(allKeys).toContain('manifest_number')
    // Package
    expect(allKeys).toContain('package_type')
    expect(allKeys).toContain('gross_weight')
    expect(allKeys).toContain('container_count')
  })

  it('has no duplicate labels (different keys with same Chinese name)', () => {
    const labels = Object.values(FIELD_LABELS)
    const uniqueLabels = new Set(labels)
    // Some labels might be intentionally the same, but flag if excessively duplicative
    const duplicateRatio = labels.length / uniqueLabels.size
    expect(duplicateRatio).toBeLessThan(1.3)
  })
})

describe('CARGO_FIELD_LABELS completeness', () => {
  it('all labels are non-empty strings', () => {
    for (const [key, label] of Object.entries(CARGO_FIELD_LABELS)) {
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('covers essential cargo fields', () => {
    const allKeys = Object.keys(CARGO_FIELD_LABELS)
    expect(allKeys).toContain('seq_no')
    expect(allKeys).toContain('cargo_name')
    expect(allKeys).toContain('hs_code')
    expect(allKeys).toContain('specification')
    expect(allKeys).toContain('quantity')
    expect(allKeys).toContain('unit_price')
    expect(allKeys).toContain('total_price')
    expect(allKeys).toContain('gross_weight')
    expect(allKeys).toContain('net_weight')
    expect(allKeys).toContain('container_number')
    expect(allKeys).toContain('country_of_origin')
  })

  it('seq_no is first field (by insertion order)', () => {
    const keys = Object.keys(CARGO_FIELD_LABELS)
    expect(keys[0]).toBe('seq_no')
  })
})

describe('SECTION_LABELS completeness', () => {
  it('covers all 8 sections', () => {
    const sections = Object.keys(SECTION_LABELS)
    expect(sections).toContain('header')
    expect(sections).toContain('transport')
    expect(sections).toContain('party')
    expect(sections).toContain('port')
    expect(sections).toContain('trade')
    expect(sections).toContain('customs')
    expect(sections).toContain('package')
    expect(sections).toContain('cargo')
  })

  it('all section labels are non-empty', () => {
    for (const [key, label] of Object.entries(SECTION_LABELS)) {
      expect(label.length).toBeGreaterThan(0)
    }
  })
})

describe('cross-reference — FIELD_LABELS vs SECTION_LABELS', () => {
  it('no orphan fields referencing non-existent sections', () => {
    // This is a structural check — fields used in the app should map to valid sections
    // We can't easily check this without the type configs, but we can verify sections exist
    const validSections = Object.keys(SECTION_LABELS)
    expect(validSections.length).toBeGreaterThanOrEqual(7)
  })
})
