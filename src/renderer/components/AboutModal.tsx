import Logo from './Logo'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-panel p-8 w-[360px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <Logo size={64} />
        </div>
        <h2 className="text-xl font-bold mb-1">DeclarAI</h2>
        <p className="text-sm text-muted mb-1">版本 1.0.0</p>
        <p className="text-sm text-muted mb-4">
          基于 AI LLM 的过境转关报关单自动化制单系统
        </p>
        <div className="text-xs text-muted space-y-1">
          <p>Copyright 2026 Sinowor</p>
          <p>
            <a
              href="https://github.com/Sinowor/declar-ai"
              className="text-primary-500 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              github.com/Sinowor/declar-ai
            </a>
          </p>
          <p className="text-muted">专有软件许可 — 保留所有权利</p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 h-9 px-6 rounded-sm bg-primary-500 text-white border-none text-sm font-semibold cursor-pointer hover:bg-primary-600 transition-all"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
