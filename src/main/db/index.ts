import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { ensureStorageRoot, folderPath } from '../storage'

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null
let dbPath: string = ''
let transactionDepth = 0

async function getSQL(): Promise<SqlJsStatic> {
  if (SQL) return SQL
  SQL = await initSqlJs()
  return SQL
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const root = ensureStorageRoot()
  dbPath = path.join(root, 'declaraidb.sqlite')
  const sql = await getSQL()

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new sql.Database(buffer)
    } else {
      db = new sql.Database()
    }
  } catch (err: any) {
    console.error(`[db] Failed to open database at ${dbPath}:`, err.message)
    throw new Error(`无法打开数据库: ${err.message}`)
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')

  try {
    initSchema()
  } catch (err: any) {
    console.error('[db] Schema initialization failed:', err.message)
    db.close(); db = null
    throw new Error(`数据库初始化失败: ${err.message}`)
  }

  return db
}

function initSchema() {
  if (!db) throw new Error('数据库未初始化')

  db.run(`
    CREATE TABLE IF NOT EXISTS declarations (
      id TEXT PRIMARY KEY,
      sequence_no INTEGER UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '(未命名)',
      status TEXT NOT NULL DEFAULT 'draft',
      type TEXT,
      folder_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      declaration_id TEXT NOT NULL,
      type_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_files (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'unknown',
      file_size INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ai','user')),
      field_path TEXT,
      question TEXT,
      answer TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_outputs_decl ON declaration_outputs(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_files_decl ON declaration_files(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_decl ON ai_conversations(declaration_id)')

  // ═══ Migrations ═══
  // v1.1: attachment management — add category, tags, purpose, output_type to declaration_files
  const fileCols = db.exec("PRAGMA table_info('declaration_files')")
  if (fileCols.length > 0) {
    const existingCols = new Set(fileCols[0].values.map((r: any) => r[1]))
    if (!existingCols.has('category')) {
      db.run("ALTER TABLE declaration_files ADD COLUMN category TEXT NOT NULL DEFAULT 'uploaded'")
    }
    if (!existingCols.has('tags')) {
      db.run("ALTER TABLE declaration_files ADD COLUMN tags TEXT DEFAULT '[\"其他\"]'")
    }
    if (!existingCols.has('purpose')) {
      db.run('ALTER TABLE declaration_files ADD COLUMN purpose TEXT')
    }
    if (!existingCols.has('output_type')) {
      db.run('ALTER TABLE declaration_files ADD COLUMN output_type TEXT')
    }
  }

  // ═══ v1.2: transit declaration — customs offices + enterprises + templates ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS customs_offices (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_enterprises (
      id TEXT PRIMARY KEY,
      credit_code TEXT,
      customs_code TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type_key TEXT NOT NULL,
      template_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  // Seed customs offices if empty
  const customsCount = queryOne('SELECT COUNT(*) as cnt FROM customs_offices') as any
  if (customsCount && customsCount.cnt === 0) {
    const seedOffices = [
      ['0200', '天津关区', '天津海关'],
      ['0201', '天津海关', '天津关区'],
      ['0202', '新港海关', '天津关区'],
      ['0203', '津开发区海关', '天津关区'],
      ['0204', '东港海关', '天津关区'],
      ['0205', '津机场海关', '天津关区'],
      ['0206', '津保税区海关', '天津关区'],
      ['0207', '蓟县海关', '天津关区'],
      ['0208', '津关税处', '天津关区'],
      ['0400', '石家庄关区', '石家庄海关'],
      ['0401', '石家庄海关', '石家庄关区'],
      ['0500', '太原海关', '太原海关'],
      ['0600', '满洲里关区', '满洲里海关'],
      ['0601', '满洲里海关', '满洲里关区'],
      ['0602', '海拉尔海关', '满洲里关区'],
      ['0603', '额尔古纳海关', '满洲里关区'],
      ['0604', '满十八里海关', '满洲里关区'],
      ['0605', '满赤峰海关', '满洲里关区'],
      ['0700', '呼和浩特关区', '呼和浩特海关'],
      ['0701', '呼和浩特海关', '呼和浩特关区'],
      ['0702', '二连海关', '呼和浩特关区'],
      ['0703', '包头海关', '呼和浩特关区'],
      ['0800', '沈阳关区', '沈阳海关'],
      ['0801', '沈阳海关', '沈阳关区'],
      ['0900', '大连关区', '大连海关'],
      ['0901', '大连海关', '大连关区'],
      ['1500', '长春关区', '长春海关'],
      ['1900', '哈尔滨关区', '哈尔滨海关'],
      ['2200', '上海关区', '上海海关'],
      ['2201', '上海海关', '上海关区'],
      ['2300', '南京关区', '南京海关'],
      ['2900', '杭州关区', '杭州海关'],
      ['3100', '宁波关区', '宁波海关'],
      ['3700', '厦门关区', '厦门海关'],
      ['4000', '南昌关区', '南昌海关'],
      ['4200', '青岛关区', '青岛海关'],
      ['4600', '郑州关区', '郑州海关'],
      ['4700', '武汉关区', '武汉海关'],
      ['4900', '长沙关区', '长沙海关'],
      ['5100', '广州关区', '广州海关'],
      ['5200', '黄埔关区', '黄埔海关'],
      ['5300', '深圳关区', '深圳海关'],
      ['5700', '拱北关区', '拱北海关'],
      ['6000', '汕头关区', '汕头海关'],
      ['6400', '海口关区', '海口海关'],
      ['6700', '湛江关区', '湛江海关'],
      ['6800', '江门关区', '江门海关'],
      ['7200', '南宁关区', '南宁海关'],
      ['7900', '成都关区', '成都海关'],
      ['8000', '重庆关区', '重庆海关'],
      ['8300', '贵阳关区', '贵阳海关'],
      ['8600', '昆明关区', '昆明海关'],
      ['8800', '拉萨关区', '拉萨海关'],
      ['9000', '西安关区', '西安海关'],
      ['9400', '乌鲁木齐关区', '乌鲁木齐海关'],
      ['9401', '乌鲁木齐海关', '乌鲁木齐关区'],
      ['9402', '阿拉山口海关', '乌鲁木齐关区'],
      ['9403', '霍尔果斯海关', '乌鲁木齐关区'],
      ['9404', '喀什海关', '乌鲁木齐关区'],
      ['9500', '兰州关区', '兰州海关'],
      ['9600', '西宁关区', '西宁海关'],
      ['9900', '银川关区', '银川海关'],
    ]
    for (const [code, name, parent] of seedOffices) {
      db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', [code, name, parent])
    }
  }

  // ═══ v1.3: basic data — currencies, packaging, countries ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS packaging_types (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  // Seed basic data if empty
  const seedIfEmpty = (table: string, data: [string, string][]) => {
    if (!db) return
    const c = queryOne(`SELECT COUNT(*) as cnt FROM ${table}`) as any
    if (c && c.cnt === 0) {
      for (const [code, name] of data) {
        db.run(`INSERT INTO ${table} (code, name) VALUES (?, ?)`, [code, name])
      }
    }
  }

  seedIfEmpty('currencies', [
    // ISO 4217 active currency codes
    ['CNY', '人民币'], ['USD', '美元'], ['EUR', '欧元'], ['JPY', '日元'],
    ['GBP', '英镑'], ['HKD', '港币'], ['KRW', '韩元'], ['AUD', '澳元'],
    ['CAD', '加元'], ['CHF', '瑞士法郎'], ['SGD', '新加坡元'], ['RUB', '卢布'],
    ['TWD', '新台币'], ['MOP', '澳门元'], ['MYR', '马来西亚林吉特'],
    ['THB', '泰铢'], ['VND', '越南盾'], ['IDR', '印尼卢比'],
    ['INR', '印度卢比'], ['PHP', '菲律宾比索'], ['NZD', '新西兰元'],
    ['SEK', '瑞典克朗'], ['NOK', '挪威克朗'], ['DKK', '丹麦克朗'],
    ['AED', '阿联酋迪拉姆'], ['SAR', '沙特里亚尔'], ['TRY', '土耳其里拉'],
    ['BRL', '巴西雷亚尔'], ['MXN', '墨西哥比索'], ['ZAR', '南非兰特'],
    ['PLN', '波兰兹罗提'], ['CZK', '捷克克朗'], ['HUF', '匈牙利福林'],
    ['CLP', '智利比索'], ['ARS', '阿根廷比索'], ['COP', '哥伦比亚比索'],
    ['PEN', '秘鲁索尔'], ['NGN', '尼日利亚奈拉'], ['EGP', '埃及镑'],
    ['KZT', '哈萨克斯坦坚戈'], ['UZS', '乌兹别克斯坦苏姆'],
    ['MNT', '蒙古图格里克'], ['PKR', '巴基斯坦卢比'], ['BDT', '孟加拉塔卡'],
    ['MMK', '缅甸元'], ['KHR', '柬埔寨瑞尔'], ['LAK', '老挝基普'],
    ['BND', '文莱元'], ['NPR', '尼泊尔卢比'], ['LKR', '斯里兰卡卢比'],
    ['MVR', '马尔代夫拉菲亚'], ['IRR', '伊朗里亚尔'], ['IQD', '伊拉克第纳尔'],
    ['ILS', '以色列新谢克尔'], ['QAR', '卡塔尔里亚尔'], ['KWD', '科威特第纳尔'],
    ['BHD', '巴林第纳尔'], ['OMR', '阿曼里亚尔'], ['JOD', '约旦第纳尔'],
    ['UAH', '乌克兰格里夫纳'], ['BYN', '白俄罗斯卢布'], ['RSD', '塞尔维亚第纳尔'],
    ['RON', '罗马尼亚列伊'], ['BGN', '保加利亚列弗'], ['ISK', '冰岛克朗'],
    ['MAD', '摩洛哥迪拉姆'], ['DZD', '阿尔及利亚第纳尔'], ['TND', '突尼斯第纳尔'],
    ['GHS', '加纳塞地'], ['KES', '肯尼亚先令'], ['ETB', '埃塞俄比亚比尔'],
    ['TZS', '坦桑尼亚先令'], ['UGX', '乌干达先令'], ['ZMW', '赞比亚克瓦查'],
    ['XAF', '中非法郎'], ['XOF', '西非法郎'], ['XPF', '太平洋法郎'],
  ])

  seedIfEmpty('packaging_types', [
    // China Customs Packaging Codes (海关总署包装种类代码)
    ['00', '散装'], ['01', '裸装'], ['04', '球状罐类'],
    ['06', '包/袋'], ['22', '纸箱'], ['23', '木箱'],
    ['29', '其他材料制盒/箱'], ['32', '纸桶'], ['33', '木桶'],
    ['39', '其他材料制桶'], ['41', '中型散装容器'], ['42', '便携式罐体'],
    ['43', '可移动罐柜'], ['92', '再生木托'], ['93', '天然木托'],
    ['98', '植物性铺垫材料'], ['99', '其他包装'],
  ])

  // ═══ v2.5: calculator history ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS calculator_history (
      id TEXT PRIMARY KEY,
      hs_code TEXT,
      hs_description TEXT,
      country_code TEXT,
      cif_value REAL,
      quantity REAL,
      duty_rate REAL,
      duty_amount REAL,
      vat_rate REAL,
      vat_amount REAL,
      consumption_tax_rate REAL,
      consumption_tax_amount REAL,
      total_tax REAL,
      total_price REAL,
      result_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  seedIfEmpty('countries', [
    // ISO 3166-1 alpha-2 country codes
    ['CN', '中国'], ['US', '美国'], ['GB', '英国'], ['FR', '法国'],
    ['DE', '德国'], ['IT', '意大利'], ['ES', '西班牙'], ['PT', '葡萄牙'],
    ['NL', '荷兰'], ['BE', '比利时'], ['LU', '卢森堡'], ['IE', '爱尔兰'],
    ['AT', '奥地利'], ['CH', '瑞士'], ['SE', '瑞典'], ['NO', '挪威'],
    ['DK', '丹麦'], ['FI', '芬兰'], ['IS', '冰岛'],
    ['PL', '波兰'], ['CZ', '捷克'], ['SK', '斯洛伐克'], ['HU', '匈牙利'],
    ['RO', '罗马尼亚'], ['BG', '保加利亚'], ['RS', '塞尔维亚'], ['HR', '克罗地亚'],
    ['SI', '斯洛文尼亚'], ['BA', '波黑'], ['AL', '阿尔巴尼亚'], ['MK', '北马其顿'],
    ['GR', '希腊'], ['CY', '塞浦路斯'], ['MT', '马耳他'],
    ['EE', '爱沙尼亚'], ['LV', '拉脱维亚'], ['LT', '立陶宛'],
    ['UA', '乌克兰'], ['BY', '白俄罗斯'], ['MD', '摩尔多瓦'],
    ['RU', '俄罗斯'], ['KZ', '哈萨克斯坦'], ['UZ', '乌兹别克斯坦'],
    ['TM', '土库曼斯坦'], ['KG', '吉尔吉斯斯坦'], ['TJ', '塔吉克斯坦'],
    ['AZ', '阿塞拜疆'], ['GE', '格鲁吉亚'], ['AM', '亚美尼亚'],
    ['MN', '蒙古'], ['KP', '朝鲜'], ['KR', '韩国'], ['JP', '日本'],
    ['TW', '中国台湾'], ['HK', '中国香港'], ['MO', '中国澳门'],
    ['VN', '越南'], ['LA', '老挝'], ['KH', '柬埔寨'], ['TH', '泰国'],
    ['MM', '缅甸'], ['MY', '马来西亚'], ['SG', '新加坡'], ['ID', '印度尼西亚'],
    ['PH', '菲律宾'], ['BN', '文莱'], ['TL', '东帝汶'],
    ['IN', '印度'], ['PK', '巴基斯坦'], ['BD', '孟加拉国'], ['LK', '斯里兰卡'],
    ['NP', '尼泊尔'], ['BT', '不丹'], ['MV', '马尔代夫'],
    ['AF', '阿富汗'], ['IR', '伊朗'], ['IQ', '伊拉克'], ['TR', '土耳其'],
    ['SY', '叙利亚'], ['LB', '黎巴嫩'], ['JO', '约旦'], ['IL', '以色列'],
    ['SA', '沙特阿拉伯'], ['AE', '阿联酋'], ['QA', '卡塔尔'], ['KW', '科威特'],
    ['BH', '巴林'], ['OM', '阿曼'], ['YE', '也门'],
    ['EG', '埃及'], ['LY', '利比亚'], ['TN', '突尼斯'], ['DZ', '阿尔及利亚'],
    ['MA', '摩洛哥'], ['SD', '苏丹'], ['SS', '南苏丹'], ['ET', '埃塞俄比亚'],
    ['KE', '肯尼亚'], ['TZ', '坦桑尼亚'], ['UG', '乌干达'], ['RW', '卢旺达'],
    ['BI', '布隆迪'], ['CD', '刚果金'], ['CG', '刚果布'], ['AO', '安哥拉'],
    ['ZA', '南非'], ['ZW', '津巴布韦'], ['ZM', '赞比亚'], ['MW', '马拉维'],
    ['MZ', '莫桑比克'], ['MG', '马达加斯加'], ['MU', '毛里求斯'],
    ['NA', '纳米比亚'], ['BW', '博茨瓦纳'], ['SZ', '斯威士兰'], ['LS', '莱索托'],
    ['NG', '尼日利亚'], ['GH', '加纳'], ['CI', '科特迪瓦'], ['SN', '塞内加尔'],
    ['CM', '喀麦隆'], ['GA', '加蓬'], ['GQ', '赤道几内亚'],
    ['ML', '马里'], ['BF', '布基纳法索'], ['NE', '尼日尔'], ['TD', '乍得'],
    ['MR', '毛里塔尼亚'], ['GM', '冈比亚'], ['GW', '几内亚比绍'],
    ['GN', '几内亚'], ['SL', '塞拉利昂'], ['LR', '利比里亚'],
    ['TG', '多哥'], ['BJ', '贝宁'], ['CF', '中非'],
    ['CA', '加拿大'], ['MX', '墨西哥'], ['CU', '古巴'],
    ['JM', '牙买加'], ['HT', '海地'], ['DO', '多米尼加'],
    ['GT', '危地马拉'], ['HN', '洪都拉斯'], ['SV', '萨尔瓦多'],
    ['NI', '尼加拉瓜'], ['CR', '哥斯达黎加'], ['PA', '巴拿马'],
    ['CO', '哥伦比亚'], ['VE', '委内瑞拉'], ['EC', '厄瓜多尔'],
    ['PE', '秘鲁'], ['BO', '玻利维亚'], ['PY', '巴拉圭'], ['UY', '乌拉圭'],
    ['CL', '智利'], ['AR', '阿根廷'], ['BR', '巴西'],
    ['AU', '澳大利亚'], ['NZ', '新西兰'], ['PG', '巴布亚新几内亚'],
    ['FJ', '斐济'], ['SB', '所罗门群岛'], ['VU', '瓦努阿图'],
  ])

  saveDb()
}

function saveDb() {
  if (!db || !dbPath) return
  if (transactionDepth > 0) return
  try {
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  } catch (err: any) {
    console.error('[db] Failed to save database:', err.message)
  }
}

export function closeDb() {
  if (db) { saveDb(); db.close(); db = null }
}

export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('数据库未初始化')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('数据库未初始化')
  db.run(sql, params)
  saveDb()
}

export function transaction(fn: () => void): void {
  if (!db) throw new Error('数据库未初始化')
  transactionDepth++
  try {
    db.run('BEGIN'); fn(); db.run('COMMIT'); saveDb()
  } catch (err) {
    try { db.run('ROLLBACK') } catch {}
    throw err
  } finally {
    transactionDepth--
  }
}

/** Get next sequence number for new declarations */
export function nextSequenceNo(): number {
  const row = queryOne('SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no FROM declarations')
  return (row as any)?.next_no || 1
}

export { uuid, saveDb }
