# Plan: 深色模式

> Source PRD: docs/prd-dark-mode.md

## Architectural decisions

- **Tailwind dark mode**: `darkMode: ['class']` in tailwind.config.js, controlled by `data-theme` attribute on `<html>`
- **CSS variable system**: `:root` for light, `[data-theme="dark"]` for dark overrides
- **State management**: ThemeContext extended with `themeMode: 'light' | 'dark' | 'system'`
- **Persistence**: localStorage key `declarai-theme-mode`
- **System detection**: `window.matchMedia('(prefers-color-scheme: dark)')` with change listener

---

## Phase 1: 基础设施 + 全局 CSS

**User stories**: 1, 2, 5

### What to build

Tailwind 配置开启 class-based dark mode。CSS `:root` / `[data-theme="dark"]` 双层变量系统，覆盖 `--ink`、`--muted`、`--border`、`--surface`、`body` 背景和文字色。ThemeContext 扩展 `themeMode` 状态，监听 `prefers-color-scheme` 变化。Settings 个性化 Tab 新增「外观模式」三个按钮（浅色/深色/跟随系统）。localStorage 持久化。

### Acceptance criteria

- [ ] Settings 中可切换浅色/深色/跟随系统
- [ ] 页面全局背景和文字色随模式切换
- [ ] CSS 变量 `--ink`、`--muted`、`--surface` 在深色模式生效
- [ ] 跟随系统模式检测 OS 深色偏好并自动切换
- [ ] 刷新应用后模式偏好保持

---

## Phase 2: 核心工作区组件

**User stories**: 3, 4, 6

### What to build

适配 Workspace（制单主工作区，含 Block ①-③ 所有卡片）、Sidebar（侧栏列表）、NavRail（左侧图标导航）、DeclarationPreview（预览页）。白色卡片 → `dark:bg-gray-900`，灰边框 → `dark:border-gray-700`，表格行 hover → `dark:hover:bg-gray-800`。

### Acceptance criteria

- [ ] Workspace 所有卡片、输入框、下拉框在深色模式下可辨识
- [ ] Sidebar 列表项 hover 和选中态在深色下清晰
- [ ] NavRail 图标颜色在深色下可见
- [ ] DeclarationPreview KPI 卡片和字段区块深色适配

---

## Phase 3: 表格组件 + 附件管理

**User stories**: 3, 6

### What to build

适配 CargoDetailsTable、ContainerDetailsTable（可编辑表格：表头、单元格、hover、合计行）和 AttachmentPanel（文件列表、标签 popover、操作按钮）。表格边框、斑马纹、输入框背景深色适配。

### Acceptance criteria

- [ ] CargoDetailsTable 表头、行、输入框在深色模式下层次分明
- [ ] ContainerDetailsTable 同上
- [ ] AttachmentPanel 文件行、标签 chip、popover 深色适配

---

## Phase 4: HS 归类页面

**User stories**: 3, 4, 6

### What to build

适配 HsClassifier（空状态搜索框、历史列表、结果卡片、补充信息弹窗、处理动画）和 BatchClassifier（上传区域、结果表格、展开详情）。主题色相关的 rgba 动态值在深色背景下微调透明度。

### Acceptance criteria

- [ ] HsClassifier 输入框、卡片、结果展示深色适配
- [ ] BatchClassifier 上传区、结果表格深色适配
- [ ] 处理动画在深色背景下可见

---

## Phase 5: 辅助界面

**User stories**: 3

### What to build

适配 Settings（设置页）、FileDropZone（拖拽区）、TitleBar（Windows 标题栏）、AboutModal / LicenseModal（弹窗）、Toast 通知、EnterpriseManager / CustomsOfficeManager（设置内组件）、ThemeColorPicker（主题选择器）。

### Acceptance criteria

- [ ] Settings 左侧导航 + 右侧卡片深色适配
- [ ] FileDropZone 拖拽区边框和背景深色适配
- [ ] AboutModal / LicenseModal 弹窗深色适配
- [ ] Toast 通知在深色下可读

---

## Phase 6: 测试 + 收尾

### What to build

补充 ThemeContext 的 themeMode 状态测试、localStorage 持久化测试、`data-theme` 属性设置测试。全应用回归测试。

### Acceptance criteria

- [ ] ThemeContext 测试覆盖三种模式切换
- [ ] localStorage 持久化测试
- [ ] 全应用编译无 error
- [ ] 所有现有 98 测试仍然通过
