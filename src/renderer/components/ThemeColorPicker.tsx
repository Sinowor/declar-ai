import { useTheme } from '../contexts/ThemeContext'
import { themeColors } from '../../shared/theme-colors'

export default function ThemeColorPicker() {
  const { themeId, setThemeId } = useTheme()

  return (
    <div>
      <div className="text-xs text-muted mb-3 uppercase tracking-wider font-medium">主题颜色</div>
      <div className="grid grid-cols-5 gap-1">
        {themeColors.map((t) => (
          <button
            key={t.id}
            onClick={() => setThemeId(t.id)}
            title={`${t.label} — ${t.description}`}
            className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
          >
            <div
              className="w-8 h-8 rounded-full transition-all"
              style={{
                background: t.gradient,
                boxShadow: themeId === t.id ? `0 0 0 2px white, 0 0 0 3px ${t.primary}` : 'none',
              }}
            />
            <span className={`text-[10px] font-medium leading-tight text-center ${themeId === t.id ? 'text-ink' : 'text-muted'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
