# PRD: DeclarAI 商业化平台

> 日期: 2026-06-04 | 状态: 方案设计

## 已有基础设施

| 资产 | 用途 |
|------|------|
| 阿里云服务器 | 生产环境（Gateway + Web + 数据库） |
| 企业域名 + ICP 备案 | API 端点 + 用户门户 |
| 企业法人资质 | 签约微信支付/招行支付 |
| Mac Mini M4 | 开发/预发布环境 |
| 招行企业网银 | 对公收款 |
| 微信支付（待申请） | 扫码支付 |

## 架构全景

```
┌──────────────────┐
│   DeclarAI 桌面端  │  用户持有 License Key
└────────┬─────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    api.yourdomain.com                        │
│                    (阿里云 + Nginx + HTTPS)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Gateway │  │  用户门户     │  │  管理后台     │      │
│  │  /v1/chat/*  │  │  /portal/*   │  │  /admin/*    │      │
│  │  转发+计费    │  │  购买+发票    │  │  License管理  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  ┌──────────────────────────────────────────────────┐      │
│  │                   PostgreSQL                      │      │
│  │  users + licenses + orders + invoices + call_logs │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  支付服务      │  │  邮件服务     │                        │
│  │  (微信/招行)   │  │  (发票发送)   │                        │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────┐
│   DeepSeek    │
│     API       │
└──────────────┘
```

## 功能模块

### 1. API Gateway（核心）

转发 LLM 请求，验证 License，计费。

```
DeclarAI → api.yourdomain.com/v1/chat/completions
  Header: X-License-Key: DECLAR-XXXX-XXXX-XXXX
  Body: { model, messages, ... }  ← OpenAI 兼容
  ↓
验证 → 转发 DeepSeek → 扣减 → 返回
```

### 2. 套餐体系

| 套餐 | 月费 | 调用次数 | 批量归类 | HS 归类 | 发票 |
|------|------|---------|---------|---------|------|
| 免费试用 | ¥0 | 10 | ✗ | ✓ | ✗ |
| 个人版 | ¥29 | 100 | ✓ | ✓ | 电子 |
| 专业版 | ¥99 | 500 | ✓ | ✓ | 电子 |
| 企业版 | ¥299 | 2000 | ✓ | ✓ | 专票 |

### 3. 购买流程

```
用户访问门户（或软件内打开链接）
  ↓
选择套餐 → 填写信息（手机/邮箱/企业名）
  ↓
选择支付方式：微信扫码 / 招行转账
  ↓
微信扫码 → 微信支付 Native 二维码 → 扫码支付 → 回调确认
招行转账 → 显示收款账户 → 人工确认到账
  ↓
自动生成 License Key → 显示 + 发送短信/邮件
  ↓
用户在软件中激活
```

### 4. 发票系统

企业用户购买后可申请开票：

```
用户填写开票信息
  ├── 发票类型：电子普票 / 增值税专用发票
  ├── 发票抬头
  ├── 税号
  ├── 收票邮箱
  └── 备注（可选）

提交 → 后台审核 → 开具 → PDF 发送至邮箱
```

管理后台可：
- 查看待开票申请列表
- 上传已开具的发票文件（PDF）
- 标记"已开票" + 自动发邮件通知
- 记录快递单号（纸质专票）

### 5. 用户门户 `/portal`

```
┌─────────────────────────────────┐
│  DeclarAI 用户中心               │
│                                 │
│  套餐                             │
│  ┌─────────┐ ┌─────────┐        │
│  │ 个人版   │ │ 专业版   │ ...    │
│  │ ¥29/月  │ │ ¥99/月  │        │
│  │ 100次   │ │ 500次   │        │
│  └─────────┘ └─────────┘        │
│                                 │
│  已有账号？查询 License →         │
│  ┌─────────────────────────┐   │
│  │ 输入手机号/邮箱查询       │   │
│  └─────────────────────────┘   │
│                                 │
│  企业用户？申请发票 →            │
└─────────────────────────────────┘
```

极简设计。不需要注册登录——用户凭手机号+License Key 查询。

### 6. 管理后台 `/admin`

```
┌─────────────────────────────────┐
│  仪表盘                         │
│  今日调用 1,234   活跃用户 87    │
│  本月收入 ¥4,560               │
├─────────────────────────────────┤
│  License 管理                   │
│  [生成Key] [批量生成]            │
│  搜索: [________] 筛选: [套餐▾] │
│                                 │
│  Key │ 套餐 │ 用量 │ 到期 │ 操作  │
│  ... │ ... │ ... │ ... │ ...   │
├─────────────────────────────────┤
│  订单管理                       │
│  [全部▾] [待支付▾]              │
│  ...                            │
├─────────────────────────────────┤
│  发票管理                       │
│  [待开票▾]                      │
│  ...                            │
└─────────────────────────────────┘
```

Admin Key 认证（浏览器 Cookie），不对外暴露。

## 数据库设计

```sql
-- ═══ 用户 + License ═══
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'trial',
  max_calls INTEGER NOT NULL,
  calls_used INTEGER DEFAULT 0,
  reset_day INTEGER DEFAULT 1,
  activated_at TEXT,
  expires_at TEXT,
  user_name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  created_at TEXT DEFAULT (now()),
  updated_at TEXT DEFAULT (now())
);

-- ═══ 订单 ═══
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  license_key TEXT,
  tier TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | paid | cancelled
  pay_method TEXT,                 -- wechat | cmb_transfer | manual
  wechat_trade_no TEXT,            -- 微信支付交易号
  paid_at TEXT,
  created_at TEXT DEFAULT (now())
);

-- ═══ 发票 ═══
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  license_key TEXT,
  invoice_type TEXT NOT NULL,       -- electronic_normal | vat_special
  title TEXT NOT NULL,
  tax_id TEXT,
  email TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',    -- pending | issued | mailed
  file_path TEXT,                   -- 发票文件路径
  tracking_number TEXT,             -- 快递单号
  notes TEXT,
  created_at TEXT DEFAULT (now())
);

-- ═══ 调用日志 ═══
CREATE TABLE call_logs (
  id SERIAL PRIMARY KEY,
  license_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (now())
);

-- ═══ Admin 账号 ═══
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (now())
);
```

## 支付接入方式

### 微信支付 Native

用户选择套餐 → 后端调用微信支付「统一下单」API → 返回 `code_url` → 前端生成二维码 → 用户扫码支付 → 微信回调 `notify_url` → 更新订单状态 → 自动生成 License Key。

需要：微信商户号、API v3 Key、商户证书。

### 招行转账（兜底）

用户选择招行转账 → 显示对公账户信息 + 转账附言 → 用户转账 → 后台手动确认到账 → 生成 Key。

低优先级，作为备选方案。

## 部署架构

```
Mac Mini M4（本地）           阿里云 ECS
┌─────────────┐            ┌──────────────────┐
│  Dev Server  │            │  生产环境          │
│             │            │                  │
│  DeclarAI   │            │  Nginx (HTTPS)    │
│  桌面端构建  │            │  Node.js App      │
│             │            │  PostgreSQL       │
│  本地测试    │            │  微信支付回调      │
└─────────────┘            └──────────────────┘
                                   │
                              Mac Mini 也可作为
                              备份/灾备环境
```

- **阿里云**：生产环境。Nginx 反代 + Node.js + PostgreSQL + SSL 证书。
- **Mac Mini M4**：开发构建 + 预发布验证。可用 frp 或 Cloudflare Tunnel 暴露预发布 Gateway 给测试用户。
- **域名**：`api.yourdomain.com` 指向阿里云 ECS IP。

## DeclarAI 客户端改动

### 首次启动引导

```
┌──────────────────────────────────┐
│                                  │
│          DeclarAI                │
│     报关单 AI 辅助制单系统         │
│                                  │
│   ┌──────────────────────┐      │
│   │ 输入许可证密钥         │      │
│   │ DECLAR-XXXX-XXXX      │      │
│   └──────────────────────┘      │
│          [ 激活 ]               │
│                                  │
│  ───────── 或 ─────────          │
│                                  │
│  [ 免费试用 10 次 ]              │
│  [ 购买许可证 ]  → 打开浏览器     │
│                                  │
└──────────────────────────────────┘
```

### 设置页新增

```
许可证
├── 状态：已激活
├── 套餐：专业版
├── 本月调用：87 / 500
├── 到期：2026-07-04
├── [升级套餐] → 打开门户
├── [申请开票] → 打开门户
└── [解除绑定]
```

### 代码改造

- `src/main/ai/client.ts`：baseURL 改为 Gateway 地址，每次请求带 `X-License-Key` 头
- `src/main/config.ts`：加载本地存储的 License Key，不再加载 DeepSeek Key
- 首次启动检测：无 License Key → 显示激活页
- 每次 API 调用：检查剩余次数，超限提示升级

## 实施计划

| 阶段 | 内容 | 预估 |
|------|------|------|
| 1. Gateway 核心 | Express + LLM 转发 + License 验证 + 计费 | 3 天 |
| 2. 数据库 | PostgreSQL schema + 迁移脚本 | 0.5 天 |
| 3. 用户门户 | 套餐展示 + 查询 License + 开票申请 | 2 天 |
| 4. 管理后台 | License CRUD + 订单 + 发票管理 + 仪表盘 | 2 天 |
| 5. 微信支付 | Native 支付接入 + 回调处理 | 2 天 |
| 6. 邮件服务 | 发票 PDF 发送 + 通知邮件 | 0.5 天 |
| 7. DeclarAI 客户端 | 激活页 + 设置页 + Gateway 切换 | 2 天 |
| 8. 部署上线 | 阿里云 Nginx + SSL + 域名 + 发布 | 1 天 |
| 9. 测试 | 端到端全链路 + 压力测试 | 1 天 |

总计约 14 天。

## 不做（本期）

- 用户注册登录体系（凭手机号+License Key 查询）
- 多租户/子账户/团队管理
- Token 精确计费（按调用次数，简单可控）
- 发票 OCR 自动识别
- 移动端 App
- 知识库/帮助中心
