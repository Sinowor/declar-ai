// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mock window.api ──
const mockApi = {
  knowledgeList: vi.fn().mockResolvedValue([]),
  knowledgeGet: vi.fn(),
  knowledgeSave: vi.fn(),
  knowledgeDelete: vi.fn().mockResolvedValue({ success: true }),
  knowledgeTags: vi.fn().mockResolvedValue([
    { name: '归类经验', color: null },
    { name: '口岸须知', color: null },
    { name: '操作流程', color: null },
  ]),
  knowledgeRelated: vi.fn().mockResolvedValue([]),
  knowledgeFilesList: vi.fn().mockResolvedValue([]),
  knowledgeFileAdd: vi.fn(),
  knowledgeFileAddByPaths: vi.fn(),
  knowledgeFileDelete: vi.fn().mockResolvedValue({ success: true }),
  knowledgeFileOpen: vi.fn().mockResolvedValue({ success: true }),
  knowledgeTagAdd: vi.fn().mockResolvedValue({ success: true }),
  knowledgeTagDelete: vi.fn().mockResolvedValue({ success: true }),
  getFilePath: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal('api', mockApi)
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
  Object.values(mockApi).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) (fn as any).mockClear()
  })
  mockApi.knowledgeList.mockResolvedValue([])
  mockApi.knowledgeTags.mockResolvedValue([
    { name: '归类经验', color: null },
    { name: '口岸须知', color: null },
    { name: '操作流程', color: null },
  ])
  mockApi.knowledgeRelated.mockResolvedValue([])
  mockApi.knowledgeFilesList.mockResolvedValue([])
  mockApi.knowledgeDelete.mockResolvedValue({ success: true })
  mockApi.knowledgeFileDelete.mockResolvedValue({ success: true })
  mockApi.knowledgeFileOpen.mockResolvedValue({ success: true })
  mockApi.knowledgeTagAdd.mockResolvedValue({ success: true })
  mockApi.knowledgeTagDelete.mockResolvedValue({ success: true })
})

async function loadHook() {
  const { useKnowledge } = await import('../hooks/useKnowledge')
  return useKnowledge
}

describe('useKnowledge — dirty state', () => {
  it('starts with dirty=false', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    expect(result.current.dirty).toBe(false)
  })

  it('sets dirty=true when form changes', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    await act(async () => {
      result.current.setForm({ title: '新标题', content: '', tags: '', hs_code: '' })
    })
    expect(result.current.dirty).toBe(true)
  })

  it('sets dirty=false when form matches saved snapshot', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    // savedForm starts as { title: '', content: '', tags: '', hs_code: '' }
    await act(async () => {
      result.current.setForm({ title: 'test', content: '', tags: '', hs_code: '' })
    })
    expect(result.current.dirty).toBe(true)
    // Revert back to empty → should be clean
    await act(async () => {
      result.current.setForm({ title: '', content: '', tags: '', hs_code: '' })
    })
    expect(result.current.dirty).toBe(false)
  })
})

describe('useKnowledge — tag suggestions', () => {
  it('shows matching tag suggestions when typing', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    // Wait for dbTags to load from mock API
    await waitFor(() => expect(result.current.dbTags.length).toBeGreaterThan(0))
    await act(async () => {
      result.current.handleTagInputChange('归类')
    })
    expect(result.current.showTagSuggestions).toBe(true)
    expect(result.current.tagSuggestions).toContain('归类经验')
    expect(result.current.tagSuggestions).not.toContain('口岸须知')
  })

  it('hides suggestions when no match found', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    await waitFor(() => expect(result.current.dbTags.length).toBeGreaterThan(0))
    await act(async () => {
      result.current.handleTagInputChange('不存在的标签')
    })
    expect(result.current.showTagSuggestions).toBe(false)
  })

  it('excludes already-selected tags from suggestions', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    await waitFor(() => expect(result.current.dbTags.length).toBeGreaterThan(0))
    await act(async () => {
      result.current.setForm({ title: '', content: '', tags: '归类经验', hs_code: '' })
    }) // need to wait for state to sync
    await act(async () => {
      result.current.handleTagInputChange('归类经验, 口岸')
    })
    expect(result.current.tagSuggestions).toContain('口岸须知')
    expect(result.current.tagSuggestions).not.toContain('归类经验')
  })
})

describe('useKnowledge — note operations', () => {
  it('handleNew resets form and selects nothing', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { result.current.handleNew() })
    expect(result.current.form.title).toBe('')
    expect(result.current.form.content).toBe('')
    expect(result.current.selectedId).toBeNull()
    expect(result.current.dirty).toBe(false)
  })

  it('handleSave calls knowledgeSave with form data', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeSave.mockResolvedValue({ success: true, id: 'new-id' })
    mockApi.knowledgeList.mockResolvedValue([])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { result.current.setForm({ title: '测试', content: '# Hello', tags: '归类经验', hs_code: '8479' }) })
    await act(async () => { await result.current.handleSave() })
    expect(mockApi.knowledgeSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: '测试', content: '# Hello', tags: '["归类经验"]', hs_code: '8479' })
    )
  })

  it('handleSave does nothing when title is empty', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeSave.mockClear()
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { await result.current.handleSave() })
    expect(mockApi.knowledgeSave).not.toHaveBeenCalled()
  })

  it('handleDelete calls knowledgeDelete and resets state', async () => {
    const useKnowledge = await loadHook()
    const entry = { id: 'entry-1', title: '待删除', content: '', hs_code: null, tags: '[]', is_pinned: 0, source_type: 'manual', created_at: '', updated_at: '' }
    mockApi.knowledgeGet.mockResolvedValue(entry)
    mockApi.knowledgeList.mockResolvedValue([{ ...entry, file_count: 0 }])
    const { result } = renderHook(() => useKnowledge())
    // Load an entry first
    await act(async () => { result.current.handleSelect('entry-1') })
    // Wait for loadEntry async to complete
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    // Now delete it
    await act(async () => { await result.current.handleDelete() })
    expect(mockApi.knowledgeDelete).toHaveBeenCalledWith('entry-1')
    expect(result.current.selectedId).toBeNull()
  })
})

describe('useKnowledge — togglePin', () => {
  it('toggles is_pinned from 0 to 1', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeSave.mockResolvedValue({ success: true })
    mockApi.knowledgeList.mockResolvedValue([])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => {
      await result.current.togglePin({ id: 'e1', title: 'a', content: '', hs_code: null, tags: '[]', is_pinned: 0, source_type: 'manual', created_at: '', updated_at: '', file_count: 0 })
    })
    expect(mockApi.knowledgeSave).toHaveBeenCalledWith(expect.objectContaining({ is_pinned: 1 }))
  })

  it('toggles is_pinned from 1 to 0', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeSave.mockResolvedValue({ success: true })
    mockApi.knowledgeList.mockResolvedValue([])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => {
      await result.current.togglePin({ id: 'e1', title: 'a', content: '', hs_code: null, tags: '[]', is_pinned: 1, source_type: 'manual', created_at: '', updated_at: '', file_count: 0 })
    })
    expect(mockApi.knowledgeSave).toHaveBeenCalledWith(expect.objectContaining({ is_pinned: 0 }))
  })
})

describe('useKnowledge — tag management', () => {
  it('handleAddDbTag calls knowledgeTagAdd and reloads tags', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeTagAdd.mockClear()
    mockApi.knowledgeTags.mockClear()
    mockApi.knowledgeTags.mockResolvedValue([{ name: '归类经验', color: null }, { name: '口岸须知', color: null }, { name: '新标签', color: null }])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { result.current.setNewTagName('新标签') })
    await act(async () => { await result.current.handleAddDbTag() })
    expect(mockApi.knowledgeTagAdd).toHaveBeenCalledWith('新标签')
    expect(mockApi.knowledgeTags).toHaveBeenCalled()
    expect(result.current.newTagName).toBe('')
  })

  it('does not add empty tag name', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeTagAdd.mockClear()
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { await result.current.handleAddDbTag() })
    expect(mockApi.knowledgeTagAdd).not.toHaveBeenCalled()
  })

  it('handleDeleteDbTag calls knowledgeTagDelete and reloads', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeTagDelete.mockClear()
    mockApi.knowledgeTags.mockClear()
    mockApi.knowledgeTags.mockResolvedValue([{ name: '归类经验', color: null }])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { await result.current.handleDeleteDbTag('口岸须知') })
    expect(mockApi.knowledgeTagDelete).toHaveBeenCalledWith('口岸须知')
  })
})

describe('useKnowledge — search & filter', () => {
  it('loadEntries applies tag filter', async () => {
    const useKnowledge = await loadHook()
    mockApi.knowledgeList.mockClear()
    mockApi.knowledgeList.mockResolvedValue([{ id: '1', title: 'a', hs_code: null, tags: '["归类经验"]', is_pinned: 0, source_type: 'manual', created_at: '', updated_at: '', file_count: 0 }])
    const { result } = renderHook(() => useKnowledge())
    await act(async () => { result.current.setActiveTag('归类经验') })
    // Wait for debounced effect
    await act(async () => { await new Promise(r => setTimeout(r, 350)) })
    expect(mockApi.knowledgeList).toHaveBeenCalledWith({ tag: '归类经验', search: undefined })
  })
})

describe('useKnowledge — keyboard shortcuts', () => {
  it('Ctrl+S handler is wired (sanity check)', async () => {
    const useKnowledge = await loadHook()
    const { result } = renderHook(() => useKnowledge())
    // Just verify the hook loads and exposes expected shape
    expect(result.current).toHaveProperty('handleSave')
    expect(result.current).toHaveProperty('handleNew')
    expect(result.current).toHaveProperty('editing')
    expect(result.current).toHaveProperty('form')
  })
})
