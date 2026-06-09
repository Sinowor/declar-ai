import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (type: Toast['type'], message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const COLORS: Record<Toast['type'], { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    icon: '✓',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    icon: '✗',
    border: 'border-red-200 dark:border-red-800',
  },
  info: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    icon: 'i',
    border: 'border-primary-200 dark:border-primary-800',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: Toast['type'], message: string, duration = 2800) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {toasts.map(t => {
            const c = COLORS[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-panel text-sm font-medium ${c.bg} ${c.border}`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  t.type === 'success' ? 'bg-emerald-500 text-white' :
                  t.type === 'error' ? 'bg-red-500 text-white' :
                  'bg-primary-500 text-white'
                }`}>
                  {c.icon}
                </span>
                <span className="text-ink">{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
