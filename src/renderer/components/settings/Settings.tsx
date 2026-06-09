import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { ThemeMode } from '../../contexts/ThemeContext'
import ThemeColorPicker from './ThemeColorPicker'
import CustomsOfficeManager from './CustomsOfficeManager'
import EnterpriseManager from './EnterpriseManager'
import SimpleDataManager from './SimpleDataManager'

interface Props {
  onShowAbout: () => void
  onShowLicense: () => void
}

const shortcuts = [
  { keys: '⌘S / Ctrl+S', desc: '保存草稿' },
  { keys: '⌘Enter / Ctrl+Enter', desc: '开始 HS 归类分析' },
  { keys: 'ESC', desc: '退出编辑模式' },
]

type TabId = 'general' | 'data' | 'appearance' | 'info'

const tabs: { id: TabId; label: string }[] = [
  { id: 'general', label: '通用' },
  { id: 'data', label: '基础数据' },
  { id: 'appearance', label: '个性化' },
  { id: 'info', label: '信息' },
]

export default function Settings({ onShowAbout, onShowLicense }: Props) {
  const toast = useToast()
  const { themeMode, setThemeMode } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [storageRoot, setStorageRoot] = useState('')
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }
  }, [])

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
    toast.showToast('success', '存储路径已保存，重启后生效')
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="flex-1 overflow-hidden flex flex-col bg-surface">
      <div className="px-8 pt-6 pb-4 shrink-0 drag-region">
        <h1 className="text-[28px] font-bold">设置</h1>
        <p className="text-muted text-sm mt-1">应用偏好与信息</p>
      </div>

      <div className="flex flex-1 px-8 pb-12">
        {/* Left Tab Nav */}
        <nav className="shrink-0 mr-8 flex flex-col gap-0.5" style={{ width: 140 }} role="tablist" aria-label="设置分类">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 px-3 rounded-md text-[13px] font-medium text-left cursor-pointer transition-colors border-none w-full focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none ${
                  active
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-muted hover:text-ink hover:bg-slate-100 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-[800px]">
          {activeTab === 'general' && (
            <>
              {/* Storage */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">数据存储</h3>
                </div>
                <div className="p-6">
                  <label className="block text-[13px] font-medium text-muted mb-2">存储位置</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storageRoot}
                      readOnly
                      className="flex-1 h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-sm bg-[#FAFBFC] font-sans text-muted cursor-default"
                      title={storageRoot}
                    />
                    <button
                      onClick={handleSelectFolder}
                      className="h-9 px-4 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-muted font-medium cursor-pointer hover:bg-surface dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors shrink-0"
                    >
                      选择文件夹
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted">申报单数据和文件将保存在此文件夹中。修改后需重启应用生效。</p>
                    <button
                      onClick={handleSave}
                      className={`h-7 px-3 rounded-sm text-xs font-medium cursor-pointer transition-colors border-none ${
                        saved ? 'bg-emerald-50 text-emerald-600' : 'transition-all hover:shadow-lg hover:shadow-primary-500/20 text-white'
                      }`}
                      style={saved ? undefined : { background: 'var(--gradient)' }}
                    >
                      {saved ? '已保存 ✓' : '保存'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Shortcuts */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">快捷键</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {shortcuts.map(s => (
                      <div key={s.keys} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{s.desc}</span>
                        <kbd className="px-2 py-0.5 rounded text-[12px] font-mono bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-ink">{s.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">海关关区管理</h3>
                </div>
                <div className="p-6">
                  <CustomsOfficeManager />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">申报单位管理</h3>
                </div>
                <div className="p-6">
                  <EnterpriseManager />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">币制管理</h3>
                </div>
                <div className="p-6">
                  <SimpleDataManager title="币制" columns={[{key:'code',label:'代码'},{key:'name',label:'名称'}]}
                    listMethod="currenciesList" saveMethod="currenciesSave" deleteMethod="currenciesDelete" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">包装种类管理</h3>
                </div>
                <div className="p-6">
                  <SimpleDataManager title="包装种类" columns={[{key:'code',label:'代码'},{key:'name',label:'名称'}]}
                    listMethod="packagingList" saveMethod="packagingSave" deleteMethod="packagingDelete" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
                <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">国家/地区管理</h3>
                </div>
                <div className="p-6">
                  <SimpleDataManager title="国家/地区" columns={[{key:'code',label:'代码'},{key:'name',label:'名称'}]}
                    listMethod="countriesList" saveMethod="countriesSave" deleteMethod="countriesDelete" />
                </div>
              </div>

            </>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
              <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">外观</h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Appearance mode */}
                <div>
                  <div className="text-xs text-muted mb-3 uppercase tracking-wider font-medium">外观模式</div>
                  <div className="flex gap-1">
                    {([
                      { id: 'light' as ThemeMode, label: '浅色', icon: '☀' },
                      { id: 'dark' as ThemeMode, label: '深色', icon: '☾' },
                      { id: 'system' as ThemeMode, label: '跟随系统', icon: '⟳' },
                    ]).map(m => (
                      <button key={m.id}
                        onClick={() => setThemeMode(m.id)}
                        className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium cursor-pointer transition-colors border ${
                          themeMode === m.id
                            ? 'bg-primary-50 text-primary-600 border-primary-200'
                            : 'bg-white dark:bg-gray-900 text-muted border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:text-ink'
                        }`}
                      >
                        <span className="text-sm">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ThemeColorPicker />
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card">
              <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">关于</h3>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <div className="text-sm font-semibold">DeclarAI</div>
                  <div className="text-xs text-muted mt-0.5">版本 1.0.0</div>
                </div>
                <div className="text-xs text-muted">基于 AI 的报关单自动化制单系统</div>
                <div className="flex gap-2 pt-2">
                  <button onClick={onShowAbout} className="h-8 px-4 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-muted font-medium cursor-pointer hover:bg-surface dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors">关于 DeclarAI</button>
                  <button onClick={onShowLicense} className="h-8 px-4 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-muted font-medium cursor-pointer hover:bg-surface dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors">查看许可证</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
