import ThemeColorPicker from './ThemeColorPicker'

interface Props {
  onShowAbout: () => void
  onShowLicense: () => void
}

export default function Settings({ onShowAbout, onShowLicense }: Props) {
  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-surface">
      <div className="px-8 pt-6 pb-4 shrink-0 drag-region">
        <h1 className="text-[28px] font-bold">设置</h1>
        <p className="text-muted text-sm mt-1">应用偏好与信息</p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6 flex-1 max-w-[600px] mx-auto w-full">
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">DeclarAI</div>
                <div className="text-xs text-muted mt-0.5">版本 1.0.0</div>
              </div>
            </div>
            <div className="text-xs text-muted">
              基于 AI 的过境转关报关单自动化制单系统
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={onShowAbout}
                className="h-8 px-4 rounded-sm border border-gray-200 bg-white text-xs text-muted font-medium cursor-pointer hover:bg-surface transition-all"
              >
                关于 DeclarAI
              </button>
              <button
                onClick={onShowLicense}
                className="h-8 px-4 rounded-sm border border-gray-200 bg-white text-xs text-muted font-medium cursor-pointer hover:bg-surface transition-all"
              >
                查看许可证
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
