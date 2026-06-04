# PRD: DeclarAI 多单据类型通用平台

> 版本: 1.0 | 日期: 2026-06-04 | 状态: 设计中

## 问题陈述

DeclarAI 当前只支持"转关运输申报单"一种单据类型，数据模型、AI prompt、表单 UI 都是硬编码转关单 schema 的。报关员实际工作中需要处理多种报关单（进口、出口、备案清单、核注清单等），每种单据的字段集合不同、校验规则不同、输出格式不同。当前架构无法扩展到其他类型。

## 解决方案

将 DeclarAI 重构为**通用提取 + 类型映射**两层架构：

1. **通用提取层**：AI 从单证中提取所有关键信息，存入一个覆盖国际物流全场景的通用字段池。提取时不做单据类型假设，看到什么提取什么。
2. **类型映射层**：每种报关单类型定义一个注册表（Registry），描述它需要哪些字段、如何校验、缺失时给什么提醒、字段在不同输出中的展示名是什么。

用户工作流：
```
导入文件 → AI提取（通用字段）→ 查看/编辑 → 选择单据类型 → 类型映射视图（填充+提醒）→ 导出
```

## 用户故事

### 核心流程
1. 作为报关员，我希望导入贸易单证后，AI 自动提取所有关键信息（运输、贸易、货物明细），不需要先指定做哪种申报单
2. 作为报关员，我希望在一批数据上可以切换查看不同单据类型的视角（进口报关单、转关单、核注清单），每种视角只显示相关的字段
3. 作为报关员，我希望在单据类型视角下，看到哪些字段已填充、哪些缺失、哪些需要人工补充
4. 作为报关员，我希望对同一批提取数据，可以分别导出为进口报关单、核注清单等不同格式
5. 作为报关员，我希望创建申报单时先不选类型，AI 提取后再选择输出类型

### 字段与数据
6. 作为报关员，我希望 AI 提取的字段使用英文 key + 中文 label，不同单据类型可以给同一个字段不同的展示名
7. 作为报关员，我希望货物明细保留结构化数组（表格形式），每条货物有完整字段
8. 作为报关员，我希望通用字段池覆盖：运输信息、贸易当事人、单证编号、口岸信息、贸易条件、海关参数等国际物流常用字段
9. 作为报关员，我希望 AI 提取不到可选字段时字段值为 null，不影响后续处理

### 类型管理
10. 作为开发者，我希望新增一种报关单类型只需添加一个配置对象（字段列表 + 校验规则 + 输出格式），不需改解析逻辑
11. 作为报关员，我希望不同单据类型可以给同一通用字段不同的 label 名（如"提单号"在进口单中叫"进口提单号"）
12. 作为报关员，我希望系统校验该单据类型的必填字段是否已填充，并在缺失时给出提醒

### 数据持久化
13. 作为用户，我希望申报单数据存储在本地 SQLite，不依赖网络
14. 作为用户，我希望现有的转关单测试数据可以丢弃，新版本数据模型不受旧数据约束

## 架构设计

### 两层数据模型

**通用字段池（AI 提取层）**

```
DeclarationData {
  fields: Record<string, any>           // 扁平字典，所有顶层字段
  cargo_details: Array<Record<string, any>>  // 货物明细数组
  extraction_notes: ExtractionNote[]    // 每字段置信度
  file_warnings: FileWarning[]          // 文件相关性警告
}
```

`fields` 中的 key 使用英文标识符（如 `transport_tool_name`），搭配中文 label 映射表。AI 提取时，system prompt 中包含所有 key 的中文说明，AI 按 key 返回 JSON。

**字段全景**

| 类别 | key | 中文 label | 示例值 |
|------|-----|-----------|--------|
| 单证基础 | `declaration_type` | 申报类型 | (由用户选择，非AI提取) |
| | `pre_entry_number` | 预录入编号 | 2002029999509318 |
| | `contract_number` | 合同号 | CON-2024-001 |
| | `invoice_number` | 发票号 | INV-2024-001 |
| | `invoice_date` | 发票日期 | 2024-03-15 |
| | `declaration_date` | 申报日期 | 2024-03-20 |
| 运输信息 | `transport_tool_name` | 运输工具名称 | COSCO HAIFA |
| | `voyage_flight_number` | 航次/航班号 | 072N |
| | `transport_mode` | 运输方式 | 水路运输 |
| | `domestic_transport_mode` | 境内运输方式 | 铁路运输 |
| | `customs_transfer_method` | 海关转运方式 | 过境 |
| | `border_transport_mode` | 进出境关别 | ... |
| 贸易当事人 | `exporter_name` | 出口商 | ABC Trading Co. |
| | `exporter_address` | 出口商地址 | ... |
| | `consignee_name` | 收货人 | XYZ Import Ltd. |
| | `consignee_address` | 收货人地址 | ... |
| | `consignor_name` | 发货人 | ... |
| | `notify_party_name` | 通知方 | ... |
| | `manufacturer_name` | 生产厂商 | ... |
| 口岸与地域 | `port_of_loading` | 启运港 | SHANGHAI |
| | `port_of_discharge` | 卸货港 | HAMBURG |
| | `port_of_entry` | 入境口岸 | ... |
| | `port_of_exit` | 出境口岸 | ... |
| | `country_of_origin` | 原产国 | CHINA |
| | `country_of_destination` | 目的国 | GERMANY |
| | `country_of_export` | 出口国 | CHINA |
| 贸易条件 | `trade_mode` | 监管方式 | 一般贸易 |
| | `trade_terms` | 成交方式 | FOB |
| | `currency` | 币制 | USD |
| | `exchange_rate` | 汇率 | 7.2 |
| | `payment_method` | 付款方式 | T/T |
| | `insurance_amount` | 保险费 | ... |
| | `freight_amount` | 运费 | ... |
| 海关参数 | `transit_method` | 转关方式 | 过境 |
| | `manifest_number` | 载货清单号 | ... |
| | `seal_number` | 关锁号 | ... |
| | `supervision_mode` | 监管方式 | ... |
| | `tax_category` | 征免性质 | ... |
| 包装与物流 | `package_type` | 包装种类 | 纸箱 |
| | `package_count` | 总件数 | 120 |
| | `gross_weight` | 毛重(KG) | 24000 |
| | `net_weight` | 净重(KG) | 22000 |
| | `container_count` | 集装箱数 | 3 |
| | `marks` | 唛头 | ... |
| 保税加工 (核注清单特有) | `record_book_number` | 备案号/手册号 | ... |
| | `bonded_mode` | 保税方式 | ... |

**货物明细字段池**

| key | 中文 label |
|-----|-----------|
| `seq_no` | 序号 |
| `cargo_name` | 商品名称 |
| `cargo_name_en` | 商品英文名称 |
| `hs_code` | HS编码 |
| `specification` | 规格型号 |
| `quantity` | 数量 |
| `unit` | 单位 |
| `unit_price` | 单价 |
| `total_price` | 总价 |
| `gross_weight` | 毛重(KG) |
| `net_weight` | 净重(KG) |
| `package_type` | 包装类型 |
| `package_count` | 件数 |
| `container_number` | 集装箱号 |
| `bill_of_lading_number` | 提单号 |
| `country_of_origin` | 原产国 |
| `seal_number` | 关锁号 |
| `domestic_transport_tool` | 境内运输工具 |

### 单据类型注册表（DeclarationTypeRegistry）

每种单据类型在代码中定义为一个配置对象，存储在 `src/main/declaration-types/` 目录下。

```typescript
interface DeclarationTypeConfig {
  type: string                    // 唯一标识，如 'import_declaration'
  title: string                   // 中文名称，如 '进口货物报关单'
  description: string             // 简要说明
  field_mappings: FieldMapping[]  // 字段映射列表
  validation_rules: ValidationRule[]
  output_formats: string[]        // 支持的导出格式标识
}

interface FieldMapping {
  source_key: string              // 通用字段 key
  display_label: string           // 该类型下的展示名
  section: 'header' | 'transport' | 'trade' | 'customs' | 'cargo'  // 所属区块
  required: boolean               // 是否必填
  editable: boolean               // 是否可人工编辑
  default_value?: any             // 默认值
  options?: string[]              // 下拉选项（如运输方式）
}

interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'consistency'
  field?: string
  expression?: string
  message: string                 // 人类可读的校验失败提示
}
```

**首批单据类型**

| 标识 | 标题 | 说明 |
|------|------|------|
| `import_declaration` | 进口货物报关单 | 一般进口货物整合申报（含两步申报） |
| `export_declaration` | 出口货物报关单 | 一般出口货物整合申报 |
| `inbound_filing_list` | 进境备案清单 | 海关特殊监管区域进境 |
| `outbound_filing_list` | 出境备案清单 | 海关特殊监管区域出境 |
| `transit_transport` | 转关运输申报单 | 进口/出口转关、过境（当前已支持） |
| `verification_list` | 核注清单 | 加工贸易保税货物核注 |
| `consolidated_list` | 集报清单 | 集中申报模式进出清单 |

### UI 设计

**三块布局保留**，变化点：

**Block ②（AI 提取结果）** 不变——仍然展示通用字段提取的摘要。

**Block ③（申报单表单）** 改为动态渲染：

```
┌─ ③ 申报单数据 ─── [单据类型下拉: 进口报关单 ▾] ── [保存] ──┐
│                                                              │
│  ── 运输信息 ──                               已填 3/5        │
│  运输工具名称  [COSCO HAIFA       ]                          │
│  启运港        [SHANGHAI          ]                          │
│  卸货港        [HAMBURG           ]                          │
│  入境口岸      [________          ] ⚠ 进口报关单必填          │
│  ...                                                         │
│                                                              │
│  ── 贸易信息 ──                               已填 4/6        │
│  监管方式      [一般贸易 ▾        ]                          │
│  ...                                                         │
│                                                              │
│  ── 货物明细 ──                              + 添加货物       │
│  # │ 商品名称 │ HS编码 ⚠ │ 单价 │ 总价 │ ...                │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

- 顶部**单据类型下拉选择器**，默认显示"通用视图（全部字段）"
- 切换类型后，表单**只显示该类型需要的字段**，按区块分组
- 该类型必填但缺失的字段 → 琥珀色边框 + "XX申报单必填"提示
- 字段 label 使用该类型的 `display_label`
- 切换类型只改变视图和校验，**不改动数据本身**

**类型切换交互**
- 选择不同的单据类型 → 字段列表动态切换，不重新请求 AI
- 每种类型的缺失字段计数显示在顶部
- 用户可以在不同类型之间自由切换，互不影响

### 数据库变更

**declarations 表**
- 删除 `type` 列的 `NOT NULL` 约束（提取时 type 为空）
- `data` 列存储 `{ fields: {...}, cargo_details: [...] }` 格式的 JSON

**新增 declaration_types 表**
```sql
CREATE TABLE declaration_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  declaration_id TEXT NOT NULL,
  type_key TEXT NOT NULL,            -- 如 'import_declaration'
  output_config JSON,                -- 该类型的输出配置快照
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
);
```
记录用户选择了哪种输出类型，允许一条申报单关联多种类型。

### AI Prompt 变更

**提取 System Prompt 重构**：
- 删除所有"转关运输"特定描述
- 字段 Schema 从固定结构改为完整通用字段池（全部字段均为可选）
- 保留"文件相关性检查"、"extraction_notes"逻辑

**审核 Prompt**：
- 不再做单据类型特定校验
- 改为通用数据质量检查：完整性、一致性、合理性

## 实施决策

1. **字段 key 使用英文标识符**，中文 label 在类型注册表中定义，AI prompt 中包含 key↔label 对照表
2. **提取不做类型假设**，AI 看到什么提取什么，所有字段均为可选
3. **单据类型由用户在提取后选择**，可切换、可多选
4. **货物明细始终是数组结构**，不在扁平字段中展开
5. **现有转关单数据直接丢弃**，不迁移，更新数据库 schema
6. **注册表文件化**：每种类型一个 .ts 文件在 `src/main/declaration-types/`
7. **表单动态渲染**：根据选中类型动态显示字段列表、分组、校验状态

## 测试决策

- 单元测试：字段映射逻辑、校验规则引擎、类型注册表加载
- 集成测试：AI 提取 → 通用数据 → 类型映射 → 校验提醒 的完整链路
- 测试使用 mock AI 响应，避免依赖外部 API

## 不做

- 具体导出格式（xlsx/PDF）的实现——本次只设计数据结构，导出逐个做
- OCR 图片 PDF 识别
- 单一窗口 API 直连
- 多人协作 / 云端同步
- 报关数据的历史版本管理

## 实施顺序

Phase 1: 数据层重构
- 通用字段类型定义 (`shared/types.ts`)
- 数据库 schema 更新（破坏性变更）
- 单据类型注册表架构 + 首批类型配置

Phase 2: AI 层重构
- System prompt 从转关特定 → 通用字段提取
- 审核 prompt 通用化
- 响应解析适配新 `{ fields, cargo_details }` 格式

Phase 3: UI 层
- 类型选择器
- 动态表单渲染（按类型过滤字段，按区块分组）
- 缺失字段提醒
- 通用视图 vs 类型视图切换

Phase 4: 串联验证
- 端到端测试
- AI 提取+审核在新架构下跑通
