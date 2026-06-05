import { describe, it, expect } from 'vitest'

// ── Extracted pure functions from AttachmentPanel.tsx ──

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

function fileTypeIcon(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'PDF', xlsx: 'XLS', xls: 'XLS', docx: 'DOC', doc: 'DOC',
    txt: 'TXT', csv: 'CSV', zip: 'ZIP', jpg: 'IMG', jpeg: 'IMG', png: 'IMG',
  }
  return map[ext.toLowerCase()] || 'FILE'
}

describe('formatSize', () => {
  it('returns empty string for 0', () => {
    expect(formatSize(0)).toBe('')
  })

  it('returns bytes for < 1024', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('returns KB for < 1MB', () => {
    expect(formatSize(1024)).toBe('1 KB')
    expect(formatSize(1536)).toBe('2 KB') // 1.5 KB rounds up
    expect(formatSize(512000)).toBe('500 KB')
  })

  it('returns MB for >= 1MB', () => {
    expect(formatSize(1048576)).toBe('1.0 MB')
    expect(formatSize(2097152)).toBe('2.0 MB')
    expect(formatSize(1572864)).toBe('1.5 MB')
  })
})

describe('formatTime', () => {
  it('returns empty string for falsy input', () => {
    expect(formatTime('')).toBe('')
  })

  it('returns original string for invalid date', () => {
    expect(formatTime('not-a-date')).toBe('not-a-date')
  })

  it('formats ISO date string correctly', () => {
    // 2026-06-05T14:30:00Z → UTC
    const result = formatTime('2026-06-05T14:30:00Z')
    // Depending on timezone, hour may vary. Just check format pattern.
    expect(result).toMatch(/^\d{1,2}\/\d{1,2} \d{2}:\d{2}$/)
  })

  it('formats SQLite datetime string', () => {
    const result = formatTime('2026-06-05 09:15:00')
    expect(result).toMatch(/^\d{1,2}\/\d{1,2} \d{2}:\d{2}$/)
  })

  it('zero-pads single-digit hours and minutes', () => {
    // Midnight UTC
    const result = formatTime('2026-06-05T00:05:00Z')
    // Minutes should be "05"
    expect(result).toContain(':05')
  })
})

describe('fileTypeIcon', () => {
  it('returns PDF for .pdf', () => {
    expect(fileTypeIcon('pdf')).toBe('PDF')
    expect(fileTypeIcon('PDF')).toBe('PDF')
  })

  it('returns XLS for .xlsx and .xls', () => {
    expect(fileTypeIcon('xlsx')).toBe('XLS')
    expect(fileTypeIcon('xls')).toBe('XLS')
    expect(fileTypeIcon('XLSX')).toBe('XLS')
  })

  it('returns DOC for .docx and .doc', () => {
    expect(fileTypeIcon('docx')).toBe('DOC')
    expect(fileTypeIcon('doc')).toBe('DOC')
  })

  it('returns TXT for .txt', () => {
    expect(fileTypeIcon('txt')).toBe('TXT')
  })

  it('returns CSV for .csv', () => {
    expect(fileTypeIcon('csv')).toBe('CSV')
  })

  it('returns ZIP for .zip', () => {
    expect(fileTypeIcon('zip')).toBe('ZIP')
  })

  it('returns IMG for image extensions', () => {
    expect(fileTypeIcon('jpg')).toBe('IMG')
    expect(fileTypeIcon('jpeg')).toBe('IMG')
    expect(fileTypeIcon('png')).toBe('IMG')
  })

  it('returns FILE for unknown extensions', () => {
    expect(fileTypeIcon('exe')).toBe('FILE')
    expect(fileTypeIcon('')).toBe('FILE')
    expect(fileTypeIcon('unknown')).toBe('FILE')
  })
})
