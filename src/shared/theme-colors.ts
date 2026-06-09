export interface ThemeColor {
  id: string
  label: string
  description: string
  primary: string
  primaryRgb: string
  primaryForeground: string
  accentForeground: string
  gradient: string
  gradientRgb: string
}

export const themeColors: ThemeColor[] = [
  {
    id: 'blue',
    label: '海军蓝',
    description: '专业稳重，适合日常报关操作',
    primary: '#2563EB',
    primaryRgb: '37 99 235',
    primaryForeground: '#FFFFFF',
    accentForeground: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB, #06B6D4)',
    gradientRgb: '6 182 212',
  },
  {
    id: 'purple',
    label: '科技紫',
    description: '现代感强，适合系统主视觉',
    primary: '#6D5EF7',
    primaryRgb: '109 94 247',
    primaryForeground: '#FFFFFF',
    accentForeground: '#4F46E5',
    gradient: 'linear-gradient(135deg, #6D5EF7, #A78BFA)',
    gradientRgb: '167 139 250',
  },
  {
    id: 'emerald',
    label: '翡翠绿',
    description: '清爽自然，强调效率与完成状态',
    primary: '#059669',
    primaryRgb: '5 150 105',
    primaryForeground: '#FFFFFF',
    accentForeground: '#047857',
    gradient: 'linear-gradient(135deg, #059669, #34D399)',
    gradientRgb: '52 211 153',
  },
  {
    id: 'cyan',
    label: '跨境青',
    description: '冷静专业，偏物流与跨境场景',
    primary: '#0F766E',
    primaryRgb: '15 118 110',
    primaryForeground: '#FFFFFF',
    accentForeground: '#0F766E',
    gradient: 'linear-gradient(135deg, #0F766E, #22D3EE)',
    gradientRgb: '34 211 238',
  },
  {
    id: 'amber',
    label: '琥珀橙',
    description: '醒目温暖，适合高活跃运营',
    primary: '#D97706',
    primaryRgb: '217 119 6',
    primaryForeground: '#FFFFFF',
    accentForeground: '#B45309',
    gradient: 'linear-gradient(135deg, #D97706, #FBBF24)',
    gradientRgb: '251 191 36',
  },
]

export const defaultThemeId = 'blue'
export const STORAGE_KEY = 'declarai-theme-color'

export function getThemeById(id: string): ThemeColor {
  return themeColors.find((t) => t.id === id) || themeColors[0]
}
