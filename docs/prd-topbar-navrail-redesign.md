# PRD: NavRail + Sidebar 顶部重整

## Problem Statement

当前 NavRail 顶部需要 28px 空白区域放置 macOS 红绿灯，红绿灯挤在导航图标上方导致整体布局不够紧凑。Sidebar 头部的 Logo 和名称与 NavRail 不在同一视觉层级，缺乏统一的顶部识别区。

## Solution

将红绿灯 + Logo + 应用名称整合为统一的顶部 Header 行，横跨 NavRail 和 Sidebar。NavRail 右侧边框保留但被 Header 分隔线截断，形成清晰的视觉分区。

## 三种状态设计

### 状态 1：正常展开（Sidebar 280px）

```
┌──┬──────────────────────┬──────────────────────────┐
│🔴🟡🟢▶  ● DeclarAI v1.0   │                          │
│  ├──────────────────────┤                          │
│  │  🔍 搜索申报单...     │                          │
│  │  ─────────────────── │                          │
│📄│  INV-2024-001         │                          │
│制│  进口报关 · 待确认     │       Workspace           │
│单│  INV-2024-002         │                          │
│  │  转关运输 · 已完成     │                          │
│🔍│                       │                          │
│归│                       │                          │
│类│                       │                          │
│  │  [    新建申报单    ]  │                          │
│⚙│                       │                          │
│设│                       │                          │
│置│                       │                          │
└──┴──────────────────────┴──────────────────────────┘
 64px       280px
 NavRail    Sidebar
```

- 红绿灯在 NavRail 区域内（`titleBarStyle: "hiddenInset"` 提供原生位置）
- NavRail 顶部留 24px → 红绿灯下方 8px → Header 行
- Header 行：折叠按钮(▶) + Logo(18px SVG) + "DeclarAI"(13px bold) + 版本号(10px muted)
- Header 行下方：一条细横线（Sidebar 范围），分割 Header 和内容
- NavRail 右边框 `border-r` 从分割线开始到最底部

### 状态 2：编辑中（折叠 0px + NavRail 编辑按钮）

```
┌──┬──────────────────────────────────────────────────┐
│🔴🟡🟢▶  ● DeclarAI v1.0                               │
│  │──────────────────────────────────────────────────│
│  │                                                   │
│📄│                                                   │
│制│                                                   │
│单│              Workspace (全宽编辑)                  │
│  │                                                   │
│🔍│                                                   │
│归│                                                   │
│类│                                                   │
│  │  ──                                              │
│▤ │  侧栏                                             │
│↩ │  退出                                             │
│  │  ──                                              │
│⚙ │                                                   │
│设│                                                   │
│置│                                                   │
└──┴──────────────────────────────────────────────────┘
 64px
 NavRail (Sidebar 0px)
```

- Header 行仍然显示 Logo+名称（但无搜索等 Sidebar 内容）
- NavRail 编辑按钮在底部分隔区内
- 横分割线从 Header 下方跨 NavRail 到窗口右边缘

### 状态 3：非编辑手动折叠（48px）

```
┌──┬─┬────────────────────────────────────────────────┐
│🔴🟡🟢▶  ● DeclarAI v1.0▶                              │
│  ├─┤                                                │
│  │ │                                                │
│📄│ │              Workspace                          │
│制│ │                                                │
│单│ │                                                │
└──┴─┴────────────────────────────────────────────────┘
 64  48
 Nav Sidebar(仅有折叠按钮)
```

- 红绿灯下方 8px Header 行 + 分割线
- 右侧折叠按钮在 Sidebar 的 48px 内

## Implementation Decisions

### Header 行

- 高度：32px（从红绿灯下缘到分割线）
- Logo：18px 圆形 SVG（`Logo size={18}`），左侧距 NavRail 右边缘 8px
- 文字：「DeclarAI」13px semibold + 「v1.0.0」10px muted
- 水平排列：Logo | 名称 | 版本 | 分割线

### NavRail

- 宽度：64px（红绿灯 52px + 6px 两侧呼吸）
- 顶部留白：24px（红绿灯占据区域）
- 右侧 `border-r` 从 Header 下缘分隔线开始（CSS 实现）
- 下半部编辑按钮区用分隔线隔开

### Sidebar Header

- 去掉当前 Logo+名称（移到 Header 行）
- 搜索框 + 列表计数 + 列表保持不变
- 折叠态仅显示折叠按钮

### 窗口配置

- macOS：`titleBarStyle: "hiddenInset"`，`frame: false`
- Header 行背景统一为 Sidebar 背景色

### 深色模式

- Header 行背景跟随 `bg-white dark:bg-gray-900`
- 所有文字色跟随 CSS 变量

## Out of Scope

- 自定义红绿灯按钮
- Windows/Linux 平台适配（已有 TitleBar 组件处理）

## Further Notes

- 当前 NavRail 和 Sidebar 是两个独立 `div`，Header 行需要跨两个区域渲染。可在 App 层新加 `<TopHeader>` 组件，位于 NavRail 和 Sidebar 之上。
- 分割线可用 `after:` 伪元素或绝对定位的 `div` 实现。
