# Design & Feature Audit Report — DeclarAI

> 日期: 2026-06-03 | 设计合规度: 6.5/10 | 总计问题: 40 (13🔴 19🟡 8🔵)

---

## 🔴 高优先级 (13)

### Visual Consistency

| # | 文件:行 | 问题 | 期望 | 修复方案 |
|---|---------|------|------|---------|
| 1 | Workspace.tsx:338 | 内容区无 max-width 约束 | 1200px 居中 | ✅ 已修复: 添加 `max-w-[1200px] mx-auto w-full` |
| 2 | Sidebar.tsx:39 | 折叠宽度 52px | 48px | `collapsed ? 48 : 280` |
| 3 | 全组件按钮 | 圆角 16px (rounded-lg) | 8px (rounded-sm) | ✅ 已修复: 全部按钮已统一为 rounded-sm |
| 4 | 全卡片头部 | padding py-4 (16px) | py-18px | `py-[18px]` |
| 5 | Sidebar.tsx:80 | 搜索框圆角 16px | 10px (rounded-md) | rounded-lg → rounded-md |
| 6 | AiPanel.tsx:141 | 回复输入框圆角 16px | 10px | rounded-lg → rounded-md |
| 7 | FileDropZone.tsx:68 | 拖拽 hover 保持虚线 | 紫色实线 | 添加 `border-solid` |
| 8 | AiPanel.tsx:50 | 渐变终点色不对 | #FAFAFE | `to-[#FAFAFE]` 替换 to-slate-50 |

### Functional

| # | 文件:行 | 问题 | 修复方案 |
|---|---------|------|---------|
| 9 | Workspace.tsx:144 | Ctrl+S 闭包过期 (deps=[]) | 用 useRef 持有最新 handleSave |
| 10 | App.tsx | 无未保存变更警告 | ✅ 已修复: 添加 dirtyRef + beforeunload 事件 |
| 11 | AiPanel.tsx | 多 Primary 按钮并存 | "开始审核"改为 Secondary 样式 |
| 12 | Workspace.tsx:454 | Toast 失败也显示 ✓ | 添加 toastType: success/error/info |
| 13 | 全表单 | 缺少必填字段标记 | 添加 * 号或红点 |

---

## 🟡 中优先级 (19)

| # | 问题 | 修复方案 |
|---|------|---------|
| 14 | 无 ESC 退出申报单 | 添加 keydown 监听 Escape |
| 15 | 缺少「全部确认」按钮 | AI 面板 header 添加 |
| 16 | 审核零问题无成功状态 | 显示「数据质量良好」 |
| 17 | 无窗口关闭保护 | ✅ 已修复: beforeunload 事件 + dirtyRef 检查 |
| 18 | 侧栏无计数 | 显示「共 N 份申报单」 |
| 19 | 禁用按钮无提示 | 添加 title/tooltip |
| 20 | 删除最后一行静默失败 | 隐藏或禁用删除按钮 |
| 21 | 节标题 16px 应为 18px | text-base → text-lg |
| 22 | 保存失败无重试 | ✅ 已修复: 自动重试最多 2 次，间隔 1s |
| 23 | AI 提取按钮禁用无说明 | 添加 tooltip |
| 24 | 已解决问题缺绿色标记 | 添加「已处理」徽章 |
| 25 | 加载状态缺视觉设计 | 添加 spinner/骨架屏 |
| 26 | 空状态背景应为渐变 | ✅ 已修复: 空状态使用品牌渐变背景 |
| 27 | 无快捷键提示 | ✅ 已修复: 保存按钮旁显示 ⌘S / Ctrl+S |
| 28 | 删除按钮始终可见 | 仅1行时隐藏 |
| 29 | 汇总行颜色稍偏紫 | 改为 bg-[#FAFAFE] |
| 30 | 内联编辑 hover 效果 | ✅ 已修复: hover 改为 bg-slate-50 背景高亮 |
| 31 | 按钮 emoji 应改为 SVG | ✅ 已修复: 所有 emoji 已替换为 IconAI SVG 组件 |
| 32 | Toast 缺 ARIA 属性 | 添加 role="alert" |

---

## 🔵 低优先级 (8)

| # | 问题 | 修复方案 |
|---|------|---------|
| 33 | 底部间距 16px 应为 48px | ✅ 已修复: pb-4 → pb-12 |
| 34 | 侧栏列表项圆角用硬编码 [10px] | 改为 rounded-md |
| 35 | 侧栏各区块左边距不一致 | ✅ 已修复: 统一为 px-4 (16px) |
| 36 | 禁用按钮灰色不品牌化 | ✅ 已修复: gray-300 → primary-300 |
| 37 | 拖拽 ring 仅 dragOver 无 hover | hover 也加 ring |
| 38 | 按钮 emoji 跨平台渲染差异 | 考虑 SVG 图标 |
| 39 | Toast 圆角硬编码 12px | 用 rounded-xl |
| 40 | 字体平台差异 (PingFang vs YaHei) | 文档记录或 bundle 字体 |

---

## 缺失功能 (8)

1. **KPI 摘要卡片** — 申报单总数、待确认数、AI 提取成功率
2. **未保存变更警告** — 导航离开/新建/关闭前确认
3. **必填字段标记** — 表单字段 * 号
4. **运输表单置信点** — 扩展 confidenceMap 到 transport_info 字段
5. **ESC 退出申报单** — 键盘快捷键
6. **全部确认按钮** — AI 审核面板批量确认
7. **审核零问题成功状态** — "数据质量良好"消息
8. **快捷键提示** — ⌘S / Ctrl+S 在保存按钮旁
