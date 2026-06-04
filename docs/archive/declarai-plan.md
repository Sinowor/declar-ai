# Plan: DeclarAI 过境转关报关单自动化制单

> Source PRD: https://github.com/Sinowor/declar-ai/issues/1

## Architectural decisions

- **Tech Stack**: Electron 42 + React 18 + TypeScript 6 + Vite 8 + Tailwind CSS 3
- **IPC Channels**: `declaration:*` (CRUD), `file:*` (import/extract), `ai:*` (extract/review/answer), `schema:*` (registry)
- **Database**: SQLite via better-sqlite3, WAL mode, foreign keys ON
- **AI Service**: DeepSeek V4 Pro via OpenAI-compatible SDK, API Key from .env
- **Declaration Schema**: Registry pattern — each type registers schema + field config
- **State flow**: Main Process owns all data (DB + AI API), Renderer is pure UI, Preload provides typed bridge

### Key models
- `Declaration`: id, type, status (draft|processing|review|done|error), data (JSON), created_at, updated_at
- `CargoDetail`: id, declaration_id, 8 cargo fields, sort_order
- `DeclarationFile`: id, declaration_id, file metadata + extracted_text
- `AiConversation`: id, declaration_id, role (ai|user), question, answer, status

### Routes
- No web routes — single-window Electron app with sidebar-state-driven navigation

---

## Phase 1: Project scaffolding & Electron foundation ✅

**User stories**: #13 (.env config)

**What was built**: Electron + React + TypeScript + Vite + Tailwind CSS setup. Main process with window management. Preload script with typed IPC bridge. React app shell with sidebar layout.

**Acceptance criteria**:
- [x] `npm run dev` starts Vite + Electron
- [x] Window opens at 1440x900 with macOS titlebar style
- [x] React renders sidebar + workspace layout
- [x] .env.example in place

---

## Phase 2: Declaration schema registry & SQLite persistence ✅

**User stories**: #8 (local persistence), #12 (extensible architecture), #13 (.env)

**What was built**: DeclarationSchema registry with transit transport schema. SQLite database (declarations, cargo_details, declaration_files, ai_conversations tables). IPC handlers for declaration CRUD. Schema retrieval IPC. .env loader for API key.

**Acceptance criteria**:
- [x] DB auto-creates on first launch in userData directory
- [x] Declaration CRUD operations work via IPC
- [x] Schema registry returns correct field definitions
- [x] .env values loaded into process.env

---

## Phase 3: Multi-declaration management & sidebar ✅

**User stories**: #5 (list search), #7 (lock mode)

**What was built**: Collapsible sidebar (280px → 52px). Declaration list with search filter. Active item highlight with purple left border. Lock mode when editing (list grayed out, exit button). New declaration button.

**Acceptance criteria**:
- [x] Sidebar collapses/expands with animation
- [x] Search filters list by pre-entry number or transport name
- [x] Active declaration highlighted
- [x] Lock mode prevents switching during edit

---

## Phase 4: File import pipeline ✅

**User stories**: #1 (drag-drop import), #9 (archive support)

**What was built**: Drag-and-drop zone with visual feedback (dashed border → purple). File dialog fallback. Text extraction: PDF (pdfjs-dist), DOCX (mammoth), XLSX (SheetJS). ZIP extraction (adm-zip). File tags with remove capability. File storage in userData/files/.

**Acceptance criteria**:
- [x] Drag files onto drop zone triggers import
- [x] Click opens native file dialog
- [x] ZIP archives auto-extract and import contents
- [x] File tags display with remove button
- [x] Extracted text stored in DB

---

## Phase 5: AI structured data extraction ✅

**User stories**: #2 (auto-extract and fill)

**What was built**: DeepSeek V4 Pro client (OpenAI SDK). System prompt loader (from prompts/extraction-system-prompt.md). AI extraction: aggregate file texts → send to LLM → parse JSON → save to DB. Auto-recalculation of cargo_summary from detail rows. Confidence marking per field via extraction_notes.

**Acceptance criteria**:
- [x] System prompt loaded from file
- [x] Extraction sends file contents to DeepSeek API
- [x] Response JSON parsed into declaration data
- [x] Summary recalculated from details
- [x] Status updated to 'review' on success, 'error' on failure

---

## Phase 6: Form engine & cargo details table ✅

**User stories**: #3 (confidence highlights), #5 (edit add delete rows), #10 (summary calculation)

**What was built**: Transport info form with select dropdowns for transit/method. CargoDetailsTable: inline-editable cells, add/delete rows, auto-summary footer (total pieces/weight/containers/bills), confidence dot indicators. Workspace component integrating all modules.

**Acceptance criteria**:
- [x] Transport form fields editable
- [x] Cargo table supports inline editing
- [x] Add/delete rows works
- [x] Summary row auto-calculates totals
- [x] Confidence dots show per field

---

## Phase 7: AI review panel ✅

**User stories**: #4 (consistency check), #11 (Q&A correction)

**What was built**: AI review prompt (data completeness, consistency, logic, format). Review panel UI: severity badges (high/medium/low), user reply inputs, confirm flow, re-review button. Issues saved as ai_conversations records.

**Acceptance criteria**:
- [x] AI review detects missing/inconsistent data
- [x] Issues displayed with severity and suggestions
- [x] User can reply to each issue
- [x] Resolved issues visually marked
- [x] Re-review button available

---

## Phase 8: Integration & polish ✅

**User stories**: End-to-end flow

**What was built**: Full wiring between all modules. Real IPC integration replacing mock data. Toast notification system. Error handling throughout the pipeline. Implementation plan documentation.

**Acceptance criteria**:
- [x] Complete flow: new declaration → import files → AI extract → edit form → AI review → save
- [x] Error states handled gracefully
- [x] Toast notifications for user feedback
- [x] All TypeScript builds pass

---

## Phase 9: Packaging & distribution (future)

**User stories**: Production deployment

- Package with electron-builder for macOS/Windows
- Code signing configuration
- Auto-update mechanism
- Error reporting (Sentry or similar)

---

## Phase 10: Export & integration (future)

**User stories**: xlsx/pdf export, data transfer

- xlsx export using SheetJS
- PDF export using pdf-lib or similar
- Customs system API integration (单一窗口)
- Import declaration & 核注清单 schema support
