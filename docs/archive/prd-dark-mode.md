# PRD: 深色模式

## Problem Statement

DeclarAI 当前仅支持浅色主题，长时间在暗光环境下使用容易视觉疲劳。个性化设置仅有颜色主题选择，缺乏外观模式配置（浅色/深色/跟随系统），无法满足不同用户的偏好和不同时段的使用需求。

## Solution

在个性化设置中新增「外观模式」选项，支持三种模式：

- **浅色**：保持当前浅色外观
- **深色**：全局切换为深色主题，所有卡片、背景、文字、边框自动适配
- **跟随系统**：自动检测操作系统 `prefers-color-scheme` 并跟随切换

技术方案：Tailwind 的 `dark:` 变体 + CSS 自定义属性 + `[data-theme="dark"]` 选择器实现全局深色变量覆盖。通过 `document.documentElement` 设置 `data-theme` 属性控制模式切换。

## User Stories

1. 作为用户，我希望在设置中选择「深色模式」，以便在暗光环境下减少屏幕亮度刺激。
2. 作为用户，我希望选择「跟随系统」后，应用自动跟随 macOS/Windows 的深色模式切换，以便与系统偏好保持一致。
3. 作为用户，我希望切换到深色模式后，所有页面（制单、归类、设置）的视觉效果统一且完整，以便有一致的体验。
4. 作为用户，我希望深色模式下主题色依然正常显示，高亮和选中状态在深色背景下依然清晰可辨。
5. 作为用户，我希望深色模式偏好在应用重启后保持不变，以便不需要每次重新设置。
6. 作为用户，我希望深色模式下表格、输入框、下拉框、按钮的视觉层次分明，以便正常操作不会受到影响。

## Implementation Decisions

### 架构

- Tailwind 配置：`darkMode: ['class']`，使用 `data-theme` 属性控制
- ThemeContext 扩展 `themeMode` 状态：`'light' | 'dark' | 'system'`
- 存储键：`declarai-theme-mode`，localStorage 持久化
- CSS 变量系统：`:root` 定义浅色变量；`[data-theme="dark"]` 覆盖深色变量

### 深色 CSS 变量映射

| CSS 变量 | 浅色值 | 深色值 |
|---|---|---|
| `--ink` | `#111827` | `#F1F5F9` |
| `--muted` | `#64748B` | `#94A3B8` |
| `--border` | `#E5E7EB` | `#334155` |
| `--surface` | `#F8FAFC` | `#0F172A` |
| `body background` | `#F8FAFC` | `#0B1120` |
| `body color` | `#111827` | `#F1F5F9` |

Tailwind 的 `dark:` 变体处理组件级颜色（白色卡片 → `dark:bg-gray-900`，灰色边框 → `dark:border-gray-700` 等）。

### 系统跟随实现

```typescript
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
// 监听变化
mediaQuery.addEventListener('change', (e) => {
  if (themeMode === 'system') {
    applyMode(e.matches ? 'dark' : 'light')
  }
})
```

### 组件适配策略

Phase 2 逐组件适配，模式为：
- `bg-white` → `bg-white dark:bg-gray-900`
- `border-gray-200` → `border-gray-200 dark:border-gray-700`
- `text-ink` → `text-ink dark:text-gray-100`（ink 变量已覆盖则不需要）
- `bg-surface` → `bg-surface`（surface 变量已覆盖则不需要）
- 硬编码 `#` 颜色值 → 替换为 CSS 变量引用
- 阴影：浅色模式 `shadow-card`，深色模式减弱阴影

### 需要适配的组件（按优先级）

**必须适配（用户直接交互）：**
- Settings（设置页）
- Workspace（制单主工作区）
- Sidebar（侧栏列表）
- NavRail（左侧图标导航）
- CargoDetailsTable + ContainerDetailsTable（可编辑表格）
- HsClassifier + BatchClassifier（HS归类）
- DeclarationPreview（申报单预览）
- AttachmentPanel（附件管理）

**可选适配（辅助界面）：**
- FileDropZone（文件拖拽区）
- TitleBar（Windows 标题栏）
- AboutModal / LicenseModal（弹窗）
- Toast 通知

### UI 组件

在 Settings > 个性化 Tab 中，ThemeColorPicker 下方新增「外观模式」选择器：
- 三个选项：浅色（太阳图标）/ 深色（月亮图标）/ 跟随系统（自动图标）
- 视觉：与主题色选择器风格一致的按钮组

## Testing Decisions

- 测试 ThemeContext 的 themeMode 状态切换和 localStorage 持久化
- 测试 `[data-theme]` 属性在 `document.documentElement` 上的设置
- 不测试：逐组件的视觉效果（属于视觉验收，非自动化）

## Out of Scope

- 字体大小自定义
- 深色模式下的色弱/高对比度辅助功能
- Electron 原生窗口控件（最小化/最大化/关闭）的深色适配（需升级 Electron 版本）
- 深色模式下的 PDF 导出样式

## Further Notes

- Phase 1（开关 + CSS 变量 + Tailwind 配置）改动集中，改动文件少，可独立验证
- Phase 2（逐组件适配）工作量较大（约 15 个文件），但改动模式统一，可批量推进
- 多数使用 Tailwind 工具类的组件，只需在现有颜色类后追加 `dark:` 变体即可
- 少数使用内联 `style={{}}` 的颜色值需要单独处理（如 HsClassifier 中主题色的 rgba 引用）
