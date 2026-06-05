# Plan: 转关运输申报单制单模块

> Source PRD: docs/prd-transit-declaration.md

## Architectural decisions

- **数据库**: SQL.js (SQLite)，3 张新表：`customs_offices`、`declaration_enterprises`、`declaration_templates`
- **IPC 模式**: `ipcMain.handle` + preload bridge，与现有 `file:*`、`declaration:*` 一致
- **前端**: React + TypeScript + Tailwind，复用 Workspace Block 卡片风格 + CargoDetailsTable 表格模式
- **声明单类型**: 扩展 `transit_transport` 的 `field_mappings` 和 `cargo_column_mappings`
- **集装箱-商品关系**: 商品行加 `container_numbers` 字段（逗号分隔集装箱号）

---

## Phase 1: 基础数据维护（海关代码表 + 企业库）

**User stories**: 17-21

### What to build

数据库建 `customs_offices` 表和 `declaration_enterprises` 表。内置约 30 个常用海关口岸种子数据。Settings 页面新增两个卡片：「海关关区管理」（表格 + 搜索 + 增删）和「申报单位管理」（表格 + 增删 + 设默认）。新增 IPC 通道：`data:customs-offices:*` 和 `data:enterprises:*`。

### Acceptance criteria

- [ ] Settings 页面可查看海关关区列表，支持搜索、添加、删除
- [ ] Settings 页面可查看企业列表，支持添加、编辑、删除、设为默认
- [ ] 预设约 30 个常用海关口岸
- [ ] 设置默认企业后，新建申报单可读取默认值

---

## Phase 2: 基本信息 + 提运单信息

**User stories**: 1-6 (基本信息的录入部分), 11

### What to build

重构 `transit_transport` 类型定义，新增 Section ① 基本信息（11 字段，7 必填）和 Section ② 提运单信息（10 字段，6 必填）。申报地海关/进出口岸使用 autocomplete 从 Phase 1 数据源查询。申报单位下拉选择。运输方式/集装箱尺寸/币制使用下拉。日期字段使用 date input。必填字段标注红色星号并校验。

### Acceptance criteria

- [ ] 转关单表单展示基本信息和提运单信息两个 Section
- [ ] 海关字段 autocomplete 正常工作
- [ ] 申报单位下拉从企业库读取，可切换
- [ ] 必填字段缺失时红色提示

---

## Phase 3: 集装箱信息 + 商品信息

**User stories**: 7-10, 25-26

### What to build

Section ③ 集装箱可编辑表格（10 列，5 必填），Section ④ 商品可编辑表格（9 列 + 集装箱号关联列，7 必填）。复用 CargoDetailsTable 组件模式，支持添加/删除行。商品行「所在集装箱号」字段输入时校验箱号是否在集装箱列表中。件数/重量累计值与基本信息交叉校验。

### Acceptance criteria

- [ ] 集装箱表格可添加/删除行，必填字段标记
- [ ] 商品表格可添加/删除行，含「所在集装箱号」列
- [ ] 商品引用的集装箱号不在列表中时发出警告
- [ ] 件数/重量累计显示

---

## Phase 4: AI 提取集成

**User stories**: 12-13

### What to build

扩展现有 AI 提取 prompt 以识别转关单四个 Section 的字段。提取后自动填充到表单，低置信度字段展示为 Review Issues 待确认。

### Acceptance criteria

- [ ] 上传单据后 AI 提取能识别基本信息和提运单字段
- [ ] 集装箱和商品信息从单据中提取并填充
- [ ] 低置信度字段以待确认项展示

---

## Phase 5: 模板系统

**User stories**: 14-16

### What to build

`declaration_templates` 表 + 保存/加载模板 UI。Workspace 头部增加「保存为模板」按钮，将基本信息+提运单固定字段存入。新建时从模板下拉选择自动填充。

### Acceptance criteria

- [ ] 可保存当前申报单为模板（命名）
- [ ] 新建时可选择模板自动填充基本信息+提运单
- [ ] 模板列表支持重命名和删除

---

## Phase 6: Excel + PDF 导出

**User stories**: 22-24

### What to build

Excel：xlsx 库生成 4 个 Sheet（基本信息+提运单+集装箱+商品明细）。PDF：HTML 模板渲染后 Electron printToPDF 生成 A4 PDF。

### Acceptance criteria

- [ ] 导出 Excel 文件，4 个 Sheet 数据完整
- [ ] 导出 PDF 文件，排版适合打印
