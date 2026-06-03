# Code Review Report — DeclarAI

> 日期: 2026-06-03 | 范围: `src/` 下 24 个文件 (~2800 行) | 质量评分: 6.5/10

---

## CRITICAL (P0) — 会导致运行时错误

### 1. `ai/client.ts:19` — `AI_MODEL` 在 `loadEnv()` 之前求值

```ts
export const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
```

模块级常量在 import 时立即求值，但 `loadEnv()` 在 `initApp()` 中才调用，晚于所有模块 import。用户设置 `DEEPSEEK_MODEL=custom-model` 不会生效。

**Fix**: 改为函数

```ts
export function getModel() {
  return process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
}
```

---

### 2. `ai/extractor.ts:151` — `runAIReview` 用 `json_object` 格式但要求返回数组

```ts
response_format: { type: 'json_object' },
```

prompt 说「返回 JSON 数组」，但 `json_object` 模式要求输出必须是 `{}` 包裹的对象。数组会触发 DeepSeek API 错误。

**Fix**: 修改 prompt 让 LLM 返回 `{"issues": [...]}` 格式，或去掉 `response_format` 限制

---

### 3. `FileDropZone.tsx:45,78,99` — 文件导入使用占位 declarationId `'current'`

```ts
window.api.importFiles('current', paths)
```

文件先导入后才有 declarationId，拖拽时可能还没创建申报单。文件会写入 `userData/files/current/` 且关联到不存在的 declaration。

**Fix**: 先创建申报单 → 获取 id → 再导入文件；或先暂存文件路径，选申报单后再导入

---

## HIGH (P1) — 功能缺陷

### 4. `file/extractor.ts:57` — PDF.js worker 未配置

```ts
const pdfjsLib = await import('pdfjs-dist')
const doc = await pdfjsLib.getDocument({ data }).promise
```

pdfjs-dist 4.x 需要设置 worker 路径，否则报错或回退到假 worker。

**Fix**: 添加

```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.mjs'
```

---

### 5. `ai/extractor.ts:190` — `submitAnswer` 抛出异常而非返回错误对象

```ts
if (!conv) {
  throw new Error('对话记录不存在')
}
```

其他函数都返回 `{ success: false, error: '...' }`，这个 throw 会导致 IPC 传递未处理异常。

**Fix**: `return { success: false, error: '对话记录不存在' }`

---

### 6. `Workspace.tsx:44-49` — formData 扁平结构与嵌套数据模型不匹配

```ts
const [formData, setFormData] = useState<Record<string, string>>({...})
```

AI 提取返回 `{ transport_info: { entry_exit_transport_tool_name: ... } }` 但 form 用扁平 key。保存时需要手动重组，容易丢失数据。

**Fix**: 使用嵌套 state 或映射层

---

### 7. `Workspace.tsx:188` — 「保存草稿」按钮无 onClick

```tsx
<button className="...">💾 保存草稿</button>
```

点击无效果。

**Fix**: 添加 `onClick={() => window.api.updateDeclaration(declaration.id, data)}`

---

### 8. `Workspace.tsx:120` — `handleReviewAnswer` 未调用 IPC

```ts
const handleReviewAnswer = useCallback(async (index, answer) => {
  showToast('已记录答复')
}, [])
```

确认按钮点击后数据不持久化。

**Fix**: 调用 `window.api.aiAnswer(conversationId, answer)`

---

### 9. `ai/extractor.ts:106,171,200` — 循环中 `require('uuid')`

```ts
const { v4: uuid } = require('uuid')
```

每次迭代执行模块解析，低效。

**Fix**: `import { v4 as uuid } from 'uuid'` 放文件头部

---

### 10. `ipc/declaration.ts:78` — `declaration:update` 无数据校验

```ts
ipcMain.handle('declaration:update', (_event, id, data) => {
  db.prepare(...).run(JSON.stringify(data), id)
```

任何 data 都可以写入。

**Fix**: 添加 JSON Schema 校验，至少检查必要字段存在

---

## MEDIUM (P2) — 代码质量

### 11. `main/index.ts:28` — `sandbox: false`

Electron 安全最佳实践要求启用 sandbox。当前有 `contextIsolation: true` + `nodeIntegration: false`，风险较低但可改进。

### 12. `App.tsx:48` — 每次输入触发 API 重查

`loadDeclarations` 依赖 `searchQuery`，每次键入触发 `declaration:list` IPC。建议 300ms debounce。

### 13. `ipc/file.ts:51` — 不校验 declaration 是否存在

导入文件时不检查 declarationId 对应的申报单是否存在，可创建孤儿记录。

### 14. `file/archive.ts:26` — ZIP 解压静默覆盖

```ts
zip.extractEntryTo(entry, destDir, false, true)
```

多个压缩包有同名文件时，后解压的覆盖先解压的，无提示。

### 15. `file/extractor.ts:85` — XLSX 用 `require('xlsx')` 混用模块系统

CommonJS require 与 ES import 混用，风格不一致。

---

## LOW (P3) — 改进建议

| # | 文件 | 问题 |
|---|------|------|
| 16 | `CargoDetailsTable.tsx:1` | `useState` 导入但未使用 |
| 17 | `ipc/declaration.ts:97` | `getTransportName` 对每行两次 `JSON.parse(r.data)` |
| 18 | `ai/prompts.ts:7` | prompt 缓存在内存，修改文件需重启 |
| 19 | `ipc/file.ts:55` | RAR 错误用字符串匹配 `startsWith('[')` 判断，脆弱 |
| 20 | `App.tsx:106` | `handleExitDeclaration` 缺少 `await` |

---

## 修复优先级

| 优先级 | 数量 | 预估时间 |
|--------|------|---------|
| P0 (阻断) | 3 | ~30 min |
| P1 (功能缺陷) | 7 | ~60 min |
| P2 (代码质量) | 5 | ~30 min |
| P3 (改进) | 5 | ~20 min |

---

## 做得好的地方

- IPC 桥接设计清晰，preload 提供类型安全的 API
- SQLite schema 设计合理，WAL + FK + 索引
- UI 组件的空状态、加载状态、错误状态处理较完整
- System prompt 文件化设计，易于迭代
- cargo_summary 自动重算逻辑正确
- 文件提取支持多种格式，错误降级合理
