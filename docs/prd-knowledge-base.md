# PRD: 知识库系统（Phase 1→2→3）

## 概述

三阶段渐进式知识库系统。Phase 1 轻量笔记（本地），Phase 2 本地 RAG 检索增强，Phase 3 服务端 RAG + 多用户 + 账号体系。每阶段在前一阶段基础上叠加，不推翻重建。

---

## 数据模型（贯穿三阶段）

### Phase 1 表结构

```sql
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,              -- UUID
  title TEXT NOT NULL,              -- 标题
  content TEXT NOT NULL,            -- Markdown 正文
  hs_code TEXT,                     -- 关联 HS 编码（可选）
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON 数组：["归类经验","口岸须知"]
  source_type TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'uploaded'
  is_pinned INTEGER DEFAULT 0,     -- 置顶
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE knowledge_tags (
  name TEXT PRIMARY KEY,            -- 标签名
  color TEXT                        -- 标签颜色（可选）
);
```

### Phase 2 新增表

```sql
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,           -- 关联 knowledge_entries.id
  chunk_index INTEGER NOT NULL,     -- 序号
  content TEXT NOT NULL,            -- 分块文本（512 tokens）
  embedding BLOB,                   -- 向量（384维 float32）
  FOREIGN KEY (entry_id) REFERENCES knowledge_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_entry ON knowledge_chunks(entry_id);
```

### Phase 3 新增表（服务端）

```sql
-- 服务端
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  license_type TEXT NOT NULL DEFAULT 'standard',  -- 'standard' | 'premium' | 'enterprise'
  license_expires_at TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE shared_entries (
  id TEXT PRIMARY KEY,
  source_url TEXT,                  -- 原始 URL
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'policy'|'tariff'|'regulation'|'notice'
  published_at TEXT,                -- 来源发布时间
  crawled_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1       -- 1=有效, 0=废止
);

CREATE TABLE shared_chunks (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,
  FOREIGN KEY (entry_id) REFERENCES shared_entries(id) ON DELETE CASCADE
);

CREATE TABLE user_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'private',  -- 'private' | 'shared'
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url TEXT,
  status TEXT NOT NULL,             -- 'success' | 'failed' | 'duplicate'
  error_message TEXT,
  crawled_at TEXT NOT NULL
);
```

---

## Phase 1: 轻量笔记（本地）

### 目标
用户在 DeclarAI 内创建、编辑、搜索笔记。标签分类，HS 编码关联。归类结果页显示相关笔记。

### 技术栈
- SQLite（现有）
- react-markdown（渲染）
- textarea + Markdown 预览

### IPC 通道

| 通道 | 说明 |
|---|---|
| `knowledge:list` | 获取笔记列表（支持标签/HS/搜索过滤） |
| `knowledge:get` | 获取单条笔记 |
| `knowledge:save` | 创建/更新笔记 |
| `knowledge:delete` | 删除笔记 |
| `knowledge:tags` | 获取标签列表 |
| `knowledge:search` | 全文搜索 |

### 前端设计

**布局**：类似 Apple Notes 三栏结构

```
┌──────────┬──────────────────────┬─────────────────────────┐
│ NavRail  │ 知识库侧栏            │  正文/编辑区              │
│  74px    │  280px               │  flex-1                 │
│          │                      │                         │
│          │  ┌──────────────┐    │  ┌─────────────────┐    │
│          │  │ 🔍 搜索...   │    │  │ 标题             │    │
│          │  └──────────────┘    │  │                 │    │
│          │                      │  │ Markdown 正文     │    │
│          │  标签过滤             │  │                 │    │
│          │  [归类经验] [口岸]    │  │ 支持实时预览      │    │
│          │  [+ 新建笔记]         │  │                 │    │
│          │  ─────────────────   │  └─────────────────┘    │
│          │  ● 真空泵归类经验     │                         │
│          │    8414.10 · 2天前   │  HS 关联: [8414.1000]  │
│          │  ● 天津港注意事项     │  标签: [归类经验] [口岸] │
│          │    3天前              │                         │
│          │  ● RCEP 关税备忘     │                         │
│          │    1周前              │                         │
└──────────┴──────────────────────┴─────────────────────────┘
```

### 与现有模块集成

**归类模块**：归类结果页底部显示关联笔记卡片
```
┌─ 相关知识 ──────────────────────┐
│ 📄 真空泵归类经验 · 8414.10     │  ← 点击打开笔记
│ 📄 RCEP 协定税率备忘            │
└────────────────────────────────┘
```

**制单模块**：申报类型关联的知识提示（如"转关运输注意事项"）

### NavRail 集成

NavRail 新增「知识库」图标，排在制单/归类/计算器之后，设置之前。

---

## Phase 2: 本地 RAG（本地增强）

### 目标
在 Phase 1 基础上增加：
1. 文件拖入自动分块 + embedding
2. 语义搜索
3. 对话式问答（基于知识库内容）

### 新增依赖

| 包 | 用途 |
|---|---|
| `@xenova/transformers` | 本地 embedding（all-MiniLM-L6-v2，384维） |
| `hnswlib-node` | 高性能向量索引 |

### 新增 IPC 通道

| 通道 | 说明 |
|---|---|
| `knowledge:import-file` | 导入文件（PDF/Word/MD），自动分块+embedding |
| `knowledge:search-semantic` | 语义搜索（向量相似度） |
| `knowledge:ask` | 对话问答（语义搜索 → 拼 prompt → DeepSeek 回答） |

### 分块策略

- 每块 512 tokens，前后重叠 50 tokens
- 保留文档结构（标题/段落边界）
- 分块结果存入 `knowledge_chunks`

### Embedding 管线

```
文件导入 → 文本提取（复用现有 extractor）
       → RecursiveCharacterTextSplitter（512 tokens）
       → transformers.js embedding（本地 CPU，384 维）
       → 存入 knowledge_chunks.embedding
       → hnswlib 构建索引
```

### 对话问答流程

```
用户提问 → embedding(提问)
        → hnswlib 搜索 top-5 相关块
        → 拼接上下文 prompt
        → DeepSeek API 生成回答
        → 返回 { answer, sources[] }
```

### 前端交互

知识库页新增「提问」模式（Toggle 切换：笔记 / 提问）

```
┌─ 提问模式 ──────────────────────────────────────┐
│                                                  │
│  🔍  二连口岸有什么新规定？        [搜索]         │
│                                                  │
│  ┌─ AI 回答 ─────────────────────────────────┐   │
│  │ 根据知识库内容，二连口岸近期主要变化：      │   │
│  │ 1. 跨境运输车辆备案新规（2026-03）         │   │
│  │ 2. 进口煤炭监管方式调整                    │   │
│  │                                            │   │
│  │ 来源（3条）：                                │   │
│  │ 📄 二连海关业务指引 · 2026-03-15            │   │
│  │ 📄 海关总署公告2026年第12号                 │   │
│  │ 📄 我的笔记：口岸注意事项                    │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  [拖拽文件到此处添加知识]                          │
└──────────────────────────────────────────────────┘
```

---

## Phase 3: 服务端 RAG + 账号体系

### 系统架构

```
┌── 服务端 (云服务器 4C8G) ────────────────────────────┐
│                                                       │
│  ┌─ Nginx ───────────────────────────────────────┐   │
│  │  反向代理 + HTTPS + 限流 + 静态资源              │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ API Server (Express/Fastify) ───────────────┐   │
│  │  POST /api/auth/login    账号登录               │   │
│  │  POST /api/auth/register 账号注册               │   │
│  │  POST /api/auth/refresh  刷新 token              │   │
│  │  GET  /api/kb/search     知识库搜索              │   │
│  │  POST /api/kb/ask        RAG 问答                │   │
│  │  POST /api/kb/upload     用户上传文档             │   │
│  │  GET  /api/kb/stats      知识库统计              │   │
│  │  GET  /api/user/profile  用户信息                │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ Crawler (node-cron) ─────────────────────────┐   │
│  │  Every 6h:                                       │   │
│  │  customs.gov.cn → 海关总署公告                   │   │
│  │  gss.mofcom.gov.cn → 贸易救济                   │   │
│  │  chinatax.gov.cn → 税收政策                     │   │
│  │  去重（URL + 内容相似度 > 90%）                  │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ Embedding Pipeline ──────────────────────────┐   │
│  │  新文章 → 清洗 → 分块 → embedding → 入库        │   │
│  │  增量更新 hnswlib 索引                           │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ SQLite / PostgreSQL ─────────────────────────┐   │
│  │  users + sessions + shared_entries + chunks     │   │
│  └───────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
         │                          │
    HTTPS (TLS 1.3)            HTTPS
    JWT Bearer Token           JWT Bearer Token
         │                          │
    ┌────┴────┐              ┌────┴────┐
    │ 用户A    │              │ 用户B    │
    │ DeclarAI │              │ DeclarAI │
    │ 桌面端    │              │ 桌面端    │
    │         │              │         │
    │ 本地笔记  │              │ 本地笔记  │
    │ (私有)   │              │ (私有)   │
    └─────────┘              └─────────┘
```

### 认证鉴权

| 层级 | 机制 |
|---|---|
| 传输安全 | HTTPS (TLS 1.3) |
| 认证 | JWT Bearer Token（access: 2h, refresh: 30d） |
| 鉴权 | 中间件验证 token → 注入 `req.user` |
| 限流 | 60 req/min/user，burst 120 |
| License | 到期或超过设备数 → 403 Forbidden |

### 账号体系

**注册**：邮箱 + 密码 → bcrypt 哈希 → 入库 → 返回 JWT

**License 绑定**：
- License Key 包含：类型（standard/premium/enterprise）、设备数上限、到期日
- 客户端首次登录时绑定设备 ID（硬件指纹 hash）
- 超过设备数 → 拒绝登录，提示升级

**用户信息**：邮箱、显示名、License 类型、到期时间、已绑定设备数

### 桌面端集成

在现有 License 验证基础上扩展：

```
DeclarAI 启动
  → 读取本地 License Key
  → POST /api/auth/verify { license_key, device_id }
  → 服务端验证：
      ✓ License 有效，设备未超限 → 返回 JWT
      ✗ License 过期 → 提示续费
      ✗ 设备数超限 → 提示升级或解绑
  → 存储 JWT 到本地
  → 后续 API 请求携带 Authorization: Bearer <token>
```

### 客户端知识库交互

知识库页分为「我的笔记」（本地 + 可同步上传）和「共享库」（服务端政策知识）：

```
知识库
├── 📁 我的笔记
│   ├── 真空泵归类经验            ← 本地 SQLite
│   ├── 天津港注意事项
│   └── [上传到云端] 按钮          ← 可选同步
│
├── 🌐 共享知识库
│   ├── 🔍 搜索政策法规...         ← 调服务端 API
│   ├── 📄 海关总署2026年第12号公告
│   ├── 📄 RCEP 协定税率调整通知
│   └── 结果来自服务端
│
└── 💬 提问
    ├── 搜索范围: [ ] 仅我的笔记 [✓] 共享库 [✓] 两者
    ├── 输入问题...
    └── AI 回答（标注来源）
```

### 部署清单

| 组件 | 配置 |
|---|---|
| 云服务器 | 阿里云/腾讯云轻量 4C8G，CentOS/Ubuntu |
| 反向代理 | Nginx + Let's Encrypt 自动续签 |
| 进程管理 | PM2 |
| 数据库 | SQLite（轻量）或 PostgreSQL（多用户） |
| 监控 | Uptime Kuma + 爬取失败邮件告警 |
| 备份 | 每日自动备份数据库 + 上传到云存储 |

---

## 实施顺序

| 阶段 | 工作内容 | 预计时间 |
|---|---|---|
| **Phase 1** | SQLite 表 + CRUD + Markdown 编辑器 + 三栏布局 + NavRail 图标 + 归类集成 | 3-4 天 |
| **Phase 2** | transformers.js + hnswlib + 分块 + embedding + 语义搜索 + 对话问答 | 1-2 周 |
| **Phase 3** | 服务器搭建 + API + 认证 + License 绑定 + 爬虫 + 部署运维 | 3-4 周 |

## Testing Decisions

- Phase 1：测试 CRUD、标签过滤、搜索、渲染
- Phase 2：测试分块逻辑、embedding 一致性、语义搜索召回率
- Phase 3：测试认证流程、API 鉴权、爬虫去重、限流

## Out of Scope

- AI 自动打标签（Phase 2 可选特性）
- 知识图谱（HS → 监管条件 → 政策法规）
- 多语言翻译
- 协作编辑
- 版本历史
