import type { DeclarationItem } from '../App'

interface WorkspaceProps {
  declaration: DeclarationItem | null | undefined
}

export default function Workspace({ declaration }: WorkspaceProps) {
  if (!declaration) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-20">📑</div>
          <h3 className="text-lg font-semibold mb-2">选择一个申报单</h3>
          <p className="text-muted text-sm max-w-sm mx-auto">
            从左侧列表中选择一个申报单开始编辑，或点击「新建申报单」创建新的转关运输货物申报单。
          </p>
        </div>
      </main>
    )
  }

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    processing: 'AI 提取中',
    review: '待人工确认',
    done: '已完成',
    error: '有错误',
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Page Header */}
      <div className="flex items-start justify-between px-8 pt-6 shrink-0">
        <div>
          <h1 className="text-[28px] font-bold">转关运输货物申报单</h1>
          <p className="text-muted text-sm mt-1">
            预录入编号：{declaration.preEntryNumber || '(待填写)'} · 上次保存{' '}
            {declaration.updatedAt}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button className="h-[38px] px-5 rounded-lg bg-white text-ink border border-gray-200 font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-surface transition-all">
            保存草稿
          </button>
          <button className="h-[38px] px-5 rounded-lg bg-primary-500 text-white border-none font-semibold text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-primary-600 transition-all pulse-ai">
            🤖 AI 提取数据
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 flex flex-col gap-6 flex-1">
        {/* Placeholder cards */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">运输信息</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-500">
              🤖 AI 已提取
            </span>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { label: '进出境运输工具名称', value: 'COSCO HAIFA' },
              { label: '航次/航班号', value: '072N' },
              { label: '海关转运方式', value: '过境' },
              { label: '境内运输方式', value: '铁路运输' },
              { label: '预录入编号', value: declaration.preEntryNumber || '' },
              { label: '申报单编号', value: '海关填写', disabled: true },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted uppercase tracking-wider">
                  {f.label}
                </label>
                <input
                  type="text"
                  defaultValue={f.value}
                  disabled={f.disabled}
                  className={`h-10 rounded-[10px] border border-gray-200 px-3.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 font-sans ${
                    f.disabled ? 'opacity-50 bg-gray-50' : 'bg-[#FAFBFC] focus:bg-white'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold">货物明细</h3>
            <button className="h-8 px-3 rounded-lg text-muted text-sm font-medium hover:text-ink hover:bg-surface transition-all cursor-pointer border-none bg-transparent">
              + 添加货物
            </button>
          </div>
          <div className="p-6 text-center text-muted text-sm">
            <div className="text-3xl mb-2 opacity-20">📦</div>
            拖拽单证文件并点击「AI 提取数据」后，货物明细将自动填充。
          </div>
        </div>

        <div className="text-center text-xs text-muted pb-4">
          状态：{statusLabels[declaration.status]}
        </div>
      </div>
    </main>
  )
}
