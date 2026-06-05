import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (window.api?.isMaximized) {
      window.api.isMaximized().then(setMaximized)
    }
    const handler = () => {
      if (window.api?.isMaximized) {
        window.api.isMaximized().then(setMaximized)
      }
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div
      className="flex items-center justify-between shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50"
      style={{ height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pl-3">
        <span className="text-[11px] font-semibold text-muted select-none">DeclarAI</span>
      </div>
      <div className="flex h-full no-drag">
        <button
          onClick={() => window.api?.minimize()}
          className="w-11 h-full flex items-center justify-center border-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#64748B" /></svg>
        </button>
        <button
          onClick={() => window.api?.maximize()}
          className="w-11 h-full flex items-center justify-center border-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="2" y="0" width="8" height="8" rx="1" fill="none" stroke="#64748B" strokeWidth="1" />
              <rect x="0" y="2" width="8" height="8" rx="1" fill="white" stroke="#64748B" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="#64748B" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          onClick={() => window.api?.close()}
          className="w-11 h-full flex items-center justify-center border-none bg-transparent cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
