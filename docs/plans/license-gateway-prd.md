# PRD: DeclarAI 许可证 + API Gateway

> 日期: 2026-06-04 | 状态: 方案设计

## 目标

用户不直接持有 LLM API Key。所有 AI 请求通过自建 Gateway 中转。实现许可证验证、用量管控、收费基础。

## 架构

```
┌──────────────┐         ┌─────────────────────┐         ┌──────────┐
│  DeclarAI    │ ────→   │   License Gateway    │ ────→   │ DeepSeek │
│  (桌面端)     │ ←────   │   (独立 Node.js 服务)  │ ←────   │   API    │
│              │         │                      │         │          │
│  请求头带     │         │  POST /v1/chat       │         │  真实    │
│  X-License   │         │  验证 → 转发 → 计费   │         │  API Key │
└──────────────┘         └─────────────────────┘         └──────────┘
```

DeclarAI 不存 API Key。Gateway 持有真实 Key，用户只有 License。

## Gateway 服务

### 技术栈

- Node.js + Express
- SQLite（单文件数据库）
- 部署：阿里云轻量服务器 2C2G

### 数据库

```sql
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT UNIQUE NOT NULL,     -- DECLAR-XXXX-XXXX
  tier TEXT NOT NULL DEFAULT 'trial',  -- trial | personal | enterprise
  max_calls INTEGER NOT NULL,           -- 月调用上限
  calls_used INTEGER DEFAULT 0,        -- 本月已用
  reset_day INTEGER DEFAULT 1,         -- 每月几号重置
  expires_at TEXT,                      -- 到期时间，null=永不过期
  contact TEXT,                         -- 联系方式（微信/手机）
  notes TEXT,                            -- 备注
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,               -- classify / batchClassify / extract / review
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/chat/completions` | 转发 LLM 请求（OpenAI 兼容格式） |
| GET | `/v1/license/status` | 查询许可证状态（剩余次数、到期时间） |
| GET | `/admin/licenses` | 管理后台：列出所有许可证 |
| POST | `/admin/licenses` | 管理后台：生成新许可证 |
| DELETE | `/admin/licenses/:key` | 管理后台：吊销许可证 |

### 请求验证流程

```
收到 POST /v1/chat/completions
  ↓
提取 X-License-Key 头
  ↓
查询 licenses 表
  ↓ key 不存在 → 401
  ↓ 已过期 → 403 "已过期"
  ↓ 已超限 → 429 "本月已用 N 次，请升级"
  ↓ 验证通过
转发到 DeepSeek (附加服务端 API Key)
  ↓
成功 → 扣减 calls_used + 记录 call_logs
失败 → 返回错误（不扣减）
```

### 套餐设计

| 套餐 | 月调用次数 | 适用 |
|------|-----------|------|
| 试用 | 10 | 新用户体验 |
| 个人版 | 100 | 个体报关员 |
| 企业版 | 500 | 报关行 |

## DeclarAI 客户端改动

### 移除

- `.env` 文件中的 `DEEPSEEK_API_KEY`（不再需要）
- 所有直接调用 DeepSeek API 的代码不变（仍走 OpenAI SDK）

### 新增

**License 激活页**（首次启动）

```
┌─────────────────────────────────────┐
│                                     │
│         🏷  DeclarAI                │
│                                     │
│  请输入许可证密钥以激活软件           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ DECLAR-XXXX-XXXX-XXXX       │   │
│  └─────────────────────────────┘   │
│                                     │
│         [ 激活 ]                    │
│                                     │
│  还没有许可证？ 获取试用 →           │
│                                     │
└─────────────────────────────────────┘
```

**激活后**：设置页显示许可证信息

```
设置
├── 数据存储
├── 许可证
│   ├── 套餐：个人版
│   ├── 本月剩余：87/100 次
│   └── 到期：2026-07-04
├── 快捷键
├── 外观
└── 关于
```

### 配置

```typescript
// 硬编码在代码中（打包后不可见）
const GATEWAY_URL = 'https://api.yourdomain.com'
```

`config.ts` 中加载 `.env` 仅用于开发模式。打包后的生产版本只有 GATEWAY_URL。

## 管理后台

轻量 Web 页面（同一端口，Admin Key 认证）：

```
┌─────────────────────────────────┐
│  License 管理                    │
│                                 │
│  [+ 生成新 Key]                  │
│                                 │
│  Key             套餐    用量   到期    操作 │
│  DECLAR-01-xxxx  personal 45/100 2026-07-04 [吊销] │
│  DECLAR-02-xxxx  trial    3/10   2026-06-10 [吊销] │
│                                 │
└─────────────────────────────────┘
```

- 一键生成新 Key（选择套餐 + 到期时间）
- 密钥格式：`DECLAR-{T}-{random}`
- 吊销 Key 后立即生效

## 实施计划

| 步骤 | 内容 | 预估 |
|------|------|------|
| 1 | Gateway 服务开发（Express + SQLite + 转发逻辑） | 3 天 |
| 2 | 管理后台页面 | 1 天 |
| 3 | DeclarAI 客户端：激活页 + 设置页 + 环境切换 | 2 天 |
| 4 | 部署到阿里云 + 域名 + HTTPS | 0.5 天 |
| 5 | 端到端测试 | 0.5 天 |

## 不做

- 在线支付对接（初期手工收钱发 Key）
- 多租户/团队/子账户
- Token 精确计费（初期按调用次数）
- SSO/微信登录
- 监控告警（人工看）
