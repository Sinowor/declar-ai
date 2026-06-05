// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mock window.api ──
const mockApi = {
  listAllFiles: vi.fn(),
  updateFileTags: vi.fn(),
  openFile: vi.fn().mockResolvedValue({ success: true }),
  revealFile: vi.fn().mockResolvedValue({ success: true }),
}

beforeEach(() => {
  vi.stubGlobal('api', mockApi)
  mockApi.listAllFiles.mockClear()
  mockApi.updateFileTags.mockClear()
  mockApi.openFile.mockClear()
  mockApi.revealFile.mockClear()
  // Restore default return values (mockClear doesn't reset implementation)
  mockApi.listAllFiles.mockResolvedValue([])
  mockApi.updateFileTags.mockResolvedValue({ success: true })
  mockApi.openFile.mockResolvedValue({ success: true })
  mockApi.revealFile.mockResolvedValue({ success: true })
})

// Dynamic import to avoid module-level mock issues
async function renderPanel(declarationId = 'decl-1') {
  // Default: return empty file list
  mockApi.listAllFiles.mockResolvedValue([])

  const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
  render(<AttachmentPanel declarationId={declarationId} />)
}

describe('AttachmentPanel — loading & empty states', () => {
  it('shows loading spinner initially', async () => {
    // Never resolve to keep loading state
    mockApi.listAllFiles.mockReturnValue(new Promise(() => {}))

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    expect(screen.getByText('加载中...')).toBeDefined()
  })

  it('shows empty state when no files exist', async () => {
    mockApi.listAllFiles.mockResolvedValue([])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getByText(/暂无文件/)).toBeDefined()
    })
  })

  it('shows error state when loading fails', async () => {
    mockApi.listAllFiles.mockRejectedValue(new Error('Network error'))

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getByText('加载失败，请刷新页面重试')).toBeDefined()
    })
  })

  it('calls listAllFiles with correct declarationId', async () => {
    mockApi.listAllFiles.mockResolvedValue([])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-42" />)

    await waitFor(() => {
      expect(mockApi.listAllFiles).toHaveBeenCalledWith('decl-42')
    })
  })
})

describe('AttachmentPanel — file display', () => {
  it('shows uploaded files with tags', async () => {
    mockApi.listAllFiles.mockResolvedValue([
      {
        id: 'f1', declaration_id: 'decl-1', file_name: '发票.pdf', file_path: '/path/发票.pdf',
        file_type: 'pdf', file_size: 2048, category: 'uploaded',
        tags: '["发票"]', purpose: null, output_type: null, created_at: '2026-06-01 10:00:00',
      },
    ])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getByText('发票.pdf')).toBeDefined()
      expect(screen.getByText('发票')).toBeDefined()
    })
  })

  it('shows generated files with purpose', async () => {
    mockApi.listAllFiles.mockResolvedValue([
      {
        id: 'g1', declaration_id: 'decl-1', file_name: '提取结果.json', file_path: '/path/extraction.json',
        file_type: 'json', file_size: 512, category: 'generated',
        tags: null, purpose: 'AI 提取的结构化数据', output_type: 'extraction_json', created_at: '2026-06-02 12:00:00',
      },
    ])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getByText('提取结果.json')).toBeDefined()
      expect(screen.getByText('AI 提取的结构化数据')).toBeDefined()
    })
  })

  it('shows file count in header', async () => {
    mockApi.listAllFiles.mockResolvedValue([
      {
        id: 'f1', declaration_id: 'decl-1', file_name: 'a.pdf', file_path: '/path/a.pdf',
        file_type: 'pdf', file_size: 100, category: 'uploaded',
        tags: '["发票"]', purpose: null, output_type: null, created_at: '2026-06-01 10:00:00',
      },
      {
        id: 'f2', declaration_id: 'decl-1', file_name: 'b.pdf', file_path: '/path/b.pdf',
        file_type: 'pdf', file_size: 200, category: 'uploaded',
        tags: '["箱单"]', purpose: null, output_type: null, created_at: '2026-06-01 11:00:00',
      },
    ])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 个文件')).toBeDefined()
    })
  })
})

describe('AttachmentPanel — action buttons', () => {
  it('calls openFile when open button clicked', async () => {
    mockApi.listAllFiles.mockResolvedValue([
      {
        id: 'f1', declaration_id: 'decl-1', file_name: '发票.pdf', file_path: '/path/发票.pdf',
        file_type: 'pdf', file_size: 2048, category: 'uploaded',
        tags: '["发票"]', purpose: null, output_type: null, created_at: '2026-06-01 10:00:00',
      },
    ])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getAllByTitle('打开文件').length).toBeGreaterThan(0)
    })

    const user = userEvent.setup()
    await user.click(screen.getAllByTitle('打开文件')[0])
    expect(mockApi.openFile).toHaveBeenCalledWith('f1')
  })

  it('calls revealFile when reveal button clicked', async () => {
    mockApi.listAllFiles.mockResolvedValue([
      {
        id: 'f1', declaration_id: 'decl-1', file_name: '发票.pdf', file_path: '/path/发票.pdf',
        file_type: 'pdf', file_size: 2048, category: 'uploaded',
        tags: '["发票"]', purpose: null, output_type: null, created_at: '2026-06-01 10:00:00',
      },
    ])

    const { default: AttachmentPanel } = await import('../components/AttachmentPanel')
    render(<AttachmentPanel declarationId="decl-1" />)

    await waitFor(() => {
      expect(screen.getAllByTitle('在文件夹中显示').length).toBeGreaterThan(0)
    })

    const user = userEvent.setup()
    await user.click(screen.getAllByTitle('在文件夹中显示')[0])
    expect(mockApi.revealFile).toHaveBeenCalledWith('f1')
  })
})
