import { describe, it, expect } from 'vitest'

// Same logic from extractor.ts
const TAG_OPTIONS = ['箱单', '发票', '合同', '提单', '运单', '原产地证', '报关单', '其他']

function validateAndFilterTags(raw: any): string[] {
  try {
    // AI returns JSON string
    const content = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed.tags)) return ['其他']
    const filtered = parsed.tags.filter((t: any) => typeof t === 'string' && TAG_OPTIONS.includes(t)).slice(0, 2)
    return filtered.length > 0 ? filtered : ['其他']
  } catch {
    return ['其他']
  }
}

describe('AI tag response edge cases', () => {
  it('handles valid single tag', () => {
    expect(validateAndFilterTags('{"tags":["发票"]}')).toEqual(['发票'])
  })

  it('handles valid dual tags', () => {
    expect(validateAndFilterTags('{"tags":["箱单","发票"]}')).toEqual(['箱单', '发票'])
  })

  it('caps at 2 tags even if AI returns 3', () => {
    expect(validateAndFilterTags('{"tags":["箱单","发票","合同"]}')).toEqual(['箱单', '发票'])
  })

  it('filters unknown tags from AI response', () => {
    expect(validateAndFilterTags('{"tags":["发票","报关委托书","unknown"]}')).toEqual(['发票'])
  })

  it('returns ["其他"] when all tags are unknown', () => {
    const result = validateAndFilterTags('{"tags":["不存在的标签","random_tag"]}')
    expect(result).toEqual(['其他'])
  })

  it('handles AI returning extra fields in JSON', () => {
    expect(validateAndFilterTags('{"tags":["发票"],"confidence":"high","notes":"looks good"}')).toEqual(['发票'])
  })

  it('handles AI returning tags as nested object (not array)', () => {
    expect(validateAndFilterTags('{"tags":{"primary":"发票"}}')).toEqual(['其他'])
  })

  it('handles AI returning tags as string instead of array', () => {
    expect(validateAndFilterTags('{"tags":"发票"}')).toEqual(['其他'])
  })

  it('handles completely empty AI response', () => {
    expect(validateAndFilterTags('{}')).toEqual(['其他'])
  })

  it('handles null input', () => {
    expect(validateAndFilterTags(null)).toEqual(['其他'])
  })

  it('handles malformed JSON with unclosed bracket', () => {
    expect(validateAndFilterTags('{"tags":["发票"')).toEqual(['其他'])
  })

  it('handles AI response with special characters in tags', () => {
    // Tags with special chars that aren't in TAG_OPTIONS → filtered
    expect(validateAndFilterTags('{"tags":["发票<script>","箱单"]}')).toEqual(['箱单'])
  })

  it('handles massive tag array (DoS-like)', () => {
    const massiveArr = '["' + Array(100).fill('发票').join('","') + '"]'
    const result = validateAndFilterTags(`{"tags":${massiveArr}}`)
    expect(result).toEqual(['发票', '发票'])
  })

  it('handles empty tags array', () => {
    expect(validateAndFilterTags('{"tags":[]}')).toEqual(['其他'])
  })

  it('handles AI response as raw array (not object)', () => {
    // Some models might return the array directly
    expect(validateAndFilterTags('["发票","提单"]')).toEqual(['其他']) // Not an object with "tags" key
  })

  it('handles numeric tags from AI', () => {
    expect(validateAndFilterTags('{"tags":[123,456]}')).toEqual(['其他'])
  })

  it('handles boolean tags', () => {
    expect(validateAndFilterTags('{"tags":[true,false]}')).toEqual(['其他'])
  })

  it('handles null tags inside array', () => {
    // null is filtered out by typeof check, 发票 and 箱单 both valid
    expect(validateAndFilterTags('{"tags":["发票",null,"箱单"]}')).toEqual(['发票', '箱单'])
  })

  it('handles unicode homoglyph attacks', () => {
    // Slightly different unicode characters that look like "发票"
    expect(validateAndFilterTags('{"tags":["发票","发 票"]}')).toEqual(['发票'])
  })

  it('handles deeply nested JSON (not tags at top level)', () => {
    expect(validateAndFilterTags('{"data":{"response":{"tags":["发票"]}}}')).toEqual(['其他'])
  })
})
