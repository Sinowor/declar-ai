import { useState, useEffect } from 'react'
import ThemeColorPicker from './ThemeColorPicker'

interface Props {
  onShowAbout: () => void
  onShowLicense: () => void
}

const shortcuts = [
  { keys: '⌘S / Ctrl+S', desc: '保存草稿' },
  { keys: '⌘Enter / Ctrl+Enter', desc: '开始 HS 归类分析' },
  { keys: 'ESC', desc: '退出编辑模式' },
]

export default function Settings({ onShowAbout, onShowLicense }: Props) {
  const [storageRoot, setStorageRoot] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (window.api?.getConfig) {
      window.api.getConfig().then((c: any) => {
        if (c?.storageRoot) setStorageRoot(c.storageRoot)
      })
    }
  }, [])

  const handleSelectFolder = async () => {
    if (!window.api?.selectFolder) return
    const folder = await window.api.selectFolder()
    if (folder) {
      setStorageRoot(folder)
      setSaved(false)
    }
  }

  const handleSave = async () => {
    if (!window.api?.saveConfig) return
    await window.api.saveConfig({ storageRoot })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      <div className="px-8 pt-6 pb-4 shrink-0 drag-region">
        <h1 className="text-[28px] font-bold">设置</h1>
        <p className="text-muted text-sm mt-1">应用偏好与信息</p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[600px] mx-auto w-full">
        {/* Storage */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">数据存储</h3>
          </div>
          <div className="p-6">
            <label className="block text-[13px] font-medium text-muted mb-2">存储位置</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={storageRoot}
                readOnly
                className="flex-1 h-9 rounded-[10px] border border-gray-200 px-3 text-sm bg-[#FAFBFC] font-sans text-muted cursor-default"
                title={storageRoot}
              />
              <button
                onClick={handleSelectFolder}
                className="h-9 px-4 rounded-sm border border-gray-200 bg-white text-sm text-muted font-medium cursor-pointer hover:bg-surface transition-all shrink-0"
              >
                选择文件夹
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted">申报单数据和文件将保存在此文件夹中。修改后需重启应用生效。</p>
              <button
                onClick={handleSave}
                className={`h-7 px-3 rounded-sm text-xs font-medium cursor-pointer transition-all border-none ${
                  saved ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {saved ? '已保存 ✓' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">快捷键</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {shortcuts.map(s => (
                <div key={s.keys} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-gray-200 text-ink">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">外观</h3>
          </div>
          <div className="p-6">
            <ThemeColorPicker />
          </div>
        </div>

        {/* About */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="px-6 py-[18px] border-b border-gray-200">
            <h3 className="text-lg font-semibold">关于</h3>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <div className="text-sm font-semibold">DeclarAI</div>
              <div className="text-xs text-muted mt-0.5">版本 1.0.0</div>
            </div>
            <div className="text-xs text-muted">基于 AI 的报关单自动化制单系统</div>
            <div className="flex gap-2 pt-2">
              <button onClick={onShowAbout} className="h-8 px-4 rounded-sm border border-gray-200 bg-white text-xs text-muted font-medium cursor-pointer hover:bg-surface transition-all">关于 DeclarAI</button>
              <button onClick={onShowLicense} className="h-8 px-4 rounded-sm border border-gray-200 bg-white text-xs text-muted font-medium cursor-pointer hover:bg-surface transition-all">查看许可证</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
