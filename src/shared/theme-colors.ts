export interface ThemeColor {
  id: string
  label: string
  description: string
  primary: string
  primaryRgb: string
  primaryForeground: string
  accentForeground: string
  gradient: string
}

export const themeColors: ThemeColor[] = [
  {
    id: 'purple',
    label: '科技紫',
    description: '默认主题，适合当前系统主视觉',
    primary: '#6D5EF7',
    primaryRgb: '109 94 247',
    primaryForeground: '#FFFFFF',
    accentForeground: '#4F46E5',
    gradient: 'linear-gradient(135deg, #6D5EF7, #A78BFA)',
  },
  {
    id: 'blue',
    label: '运营蓝',
    description: '更稳重的蓝色，适合偏业务后台视觉',
    primary: '#2563EB',
    primaryRgb: '37 99 235',
    primaryForeground: '#FFFFFF',
    accentForeground: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB, #38BDF8)',
  },
  {
    id: 'green',
    label: '增长绿',
    description: '清爽绿色，强调效率与在线状态',
    primary: '#16A34A',
    primaryRgb: '22 163 74',
    primaryForeground: '#FFFFFF',
    accentForeground: '#15803D',
    gradient: 'linear-gradient(135deg, #16A34A, #86EFAC)',
  },
  {
    id: 'teal',
    label: '跨境青',
    description: '冷静青色，偏物流与跨境感',
    primary: '#0F766E',
    primaryRgb: '15 118 110',
    primaryForeground: '#FFFFFF',
    accentForeground: '#0F766E',
    gradient: 'linear-gradient(135deg, #0F766E, #5EEAD4)',
  },
  {
    id: 'orange',
    label: '行动橙',
    description: '醒目橙色，适合高活跃运营场景',
    primary: '#EA580C',
    primaryRgb: '234 88 12',
    primaryForeground: '#FFFFFF',
    accentForeground: '#C2410C',
    gradient: 'linear-gradient(135deg, #EA580C, #FDBA74)',
  },
]

export const defaultThemeId = 'purple'
export const STORAGE_KEY = 'declarai-theme-color'

export function getThemeById(id: string): ThemeColor {
  return themeColors.find((t) => t.id === id) || themeColors[0]
}
