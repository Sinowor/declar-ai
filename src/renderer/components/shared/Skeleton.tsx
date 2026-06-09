interface SkeletonProps {
  className?: string
  /** 'text' | 'heading' | 'card' | 'circle' | 'table-row' | 'button' */
  variant?: 'text' | 'heading' | 'card' | 'circle' | 'button'
  /** Number of lines (text variant only) */
  lines?: number
}

const base = 'animate-pulse rounded-sm bg-gray-200 dark:bg-gray-700'

export function Skeleton({ className = '', variant = 'text', lines = 1 }: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`${base} h-3.5 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    )
  }

  if (variant === 'heading') {
    return <div className={`${base} h-5 w-1/3 ${className}`} />
  }

  if (variant === 'card') {
    return <div className={`${base} h-32 w-full rounded-lg ${className}`} />
  }

  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />
  }

  if (variant === 'button') {
    return <div className={`${base} h-9 w-24 rounded-md ${className}`} />
  }

  return <div className={`${base} h-3.5 ${className}`} />
}

/** Sidebar list skeleton — N rows of avatar + text */
export function SidebarSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" lines={1} />
            <Skeleton variant="text" lines={1} />
          </div>
        </div>
      ))}
    </div>
  )
}
