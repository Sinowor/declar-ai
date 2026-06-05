import { useState, useEffect } from 'react'

interface TariffData {
  hs_code: string
  description: string
  mfn_rate: number | null
  general_rate: number | null
  vat_rate: number
  has_consumption_tax: boolean
  unit: string
  supervision: string | null
}

interface CalcResult {
  hs_code: string; hs_description: string; country_code: string
  fob_value: number; freight: number; insurance: number; cif_value: number
  quantity: number; currency: string
  duty_rate: number; duty_amount: number
  vat_rate: number; vat_amount: number
  consumption_tax_rate: number | null; consumption_tax_amount: number
  total_tax: number; total_price: number
  mode: 'calc'
}

interface HistoryItem extends CalcResult {
  id: string; created_at: string
}

type Mode = 'lookup' | 'calc'

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  return `${Math.floor(hr / 24)}天前`
}

function fmt(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const supMap: Record<string, string> = {
  A: '入境检验检疫', B: '出境检验检疫', M: '进口商品检验',
  N: '出口商品检验', P: '进口食品检验', Q: '出口食品检验',
  R: '进口食品接触材料', S: '出口食品接触材料',
  L: '民用商品验证', O: '自动进口许可', V: '农药登记',
  W: '麻醉药品进出口准许', X: '有毒化学品环境管理',
  Z: '音像制品进口批准', T: '关税配额',
  U: '合法捕捞产品', F: '濒危物种', E: '濒危物种出口',
  I: '精神药物进口', J: '金伯利证书',
}

function supLabel(code: string | null): string {
  if (!code) return '无'
  return code.split('').map(c => `${c}(${supMap[c] || c})`).join(' · ')
}

export default function Calculator() {
  const [mode, setMode] = useState<Mode>('lookup')
  const [priceTerm, setPriceTerm] = useState<'cif' | 'fob'>('cif')
  const [hsCode, setHsCode] = useState('')
  const [countryCode, setCountryCode] = useState('CN')
  const [cifValue, setCifValue] = useState('')
  const [fobValue, setFobValue] = useState('')
  const [freight, setFreight] = useState('')
  const [insurance, setInsurance] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [currency, setCurrency] = useState('CNY')
  const [countries, setCountries] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [tariff, setTariff] = useState<TariffData | null>(null)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if ((window as any).api?.countriesList) {
      (window as any).api.countriesList().then((l: any[]) => { if (Array.isArray(l)) setCountries(l) }).catch(() => {})
    }
    if ((window as any).api?.currenciesList) {
      (window as any).api.currenciesList().then((l: any[]) => { if (Array.isArray(l)) setCurrencies(l) }).catch(() => {})
    }
    loadHistory()
  }, [])

  const loadHistory = async () => {
    if ((window as any).api?.calculatorHistory) {
      const list = await (window as any).api.calculatorHistory()
      if (Array.isArray(list)) setHistory(list)
    }
  }

  const handleLookup = async () => {
    if (!hsCode.trim()) return
    setError('')
    setLoading(true)
    setResult(null)
    try {
      if ((window as any).api?.calculatorLookup) {
        const res = await (window as any).api.calculatorLookup(hsCode.trim())
        if (res.success && res.data) {
          setTariff(res.data)
          if (mode === 'calc') doCalculate(res.data)
        } else {
          setTariff(null)
          setError(res.error || '未找到税率')
        }
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const doCalculate = (t: TariffData) => {
    const cif = priceTerm === 'cif'
      ? (parseFloat(cifValue) || 0)
      : (parseFloat(fobValue) || 0) + (parseFloat(freight) || 0) + (parseFloat(insurance) || 0)
    const fob = priceTerm === 'cif' ? cif : (parseFloat(fobValue) || 0)
    const fr = priceTerm === 'cif' ? 0 : (parseFloat(freight) || 0)
    const ins = priceTerm === 'cif' ? 0 : (parseFloat(insurance) || 0)
    const qty = parseFloat(quantity) || 1
    const dutyRate = t.mfn_rate || 0
    const vatRate = t.vat_rate
    const dutyAmount = cif * dutyRate / 100
    const vatAmount = (cif + dutyAmount) * vatRate / 100
    const consRate = t.has_consumption_tax ? 5 : 0
    const consAmount = t.has_consumption_tax ? (cif + dutyAmount) / (1 - consRate / 100) * consRate / 100 : 0

    const r: CalcResult = {
      hs_code: t.hs_code, hs_description: t.description, country_code: countryCode,
      fob_value: fob, freight: fr, insurance: ins, cif_value: cif,
      quantity: qty, currency,
      duty_rate: dutyRate, duty_amount: dutyAmount,
      vat_rate: vatRate, vat_amount: vatAmount,
      consumption_tax_rate: t.has_consumption_tax ? consRate : null,
      consumption_tax_amount: consAmount,
      total_tax: dutyAmount + vatAmount + consAmount,
      total_price: cif + dutyAmount + vatAmount + consAmount,
      mode: 'calc',
    }
    setResult(r)
    if ((window as any).api?.calculatorSaveHistory) {
      (window as any).api.calculatorSaveHistory({ ...r, result_json: JSON.stringify(r) })
      setTimeout(loadHistory, 500)
    }
  }

  const renderInputPanel = () => (
    <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
      <div>
        <label className="block text-[12px] font-medium text-muted mb-1">HS 编码</label>
        <input value={hsCode} onChange={e => setHsCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
          placeholder="如 8414.1000"
          className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] font-mono outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans" />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-muted mb-1">原产国</label>
        <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
          className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 cursor-pointer">
          {countries.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      {mode === 'calc' && (
        <>
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">币制</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 cursor-pointer">
              {currencies.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          {/* Price term toggle */}
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">价格术语</label>
            <div className="flex bg-surface dark:bg-gray-800 rounded-md p-0.5">
              {[
                { id: 'cif' as const, label: 'CIF' },
                { id: 'fob' as const, label: 'FOB' },
              ].map(pt => (
                <button key={pt.id} onClick={() => { setPriceTerm(pt.id); setResult(null) }}
                  className={`flex-1 h-7 rounded text-[12px] font-medium cursor-pointer border-none transition-colors ${
                    priceTerm === pt.id ? 'bg-white dark:bg-gray-700 text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                  }`}>
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {priceTerm === 'cif' ? (
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1">完税价格 (CIF)</label>
              <input value={cifValue} onChange={e => setCifValue(e.target.value)}
                placeholder="100000"
                className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">FOB 货值</label>
                <input value={fobValue} onChange={e => setFobValue(e.target.value)}
                  placeholder="100000"
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[12px] font-medium text-muted mb-1">运费</label>
                  <input value={freight} onChange={e => setFreight(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-medium text-muted mb-1">保费</label>
                  <input value={insurance} onChange={e => setInsurance(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">数量</label>
            <div className="flex gap-2">
              <input value={quantity} onChange={e => setQuantity(e.target.value)}
                className="flex-1 h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
              <span className="h-9 flex items-center text-[13px] text-muted shrink-0">{tariff?.unit || '个'}</span>
            </div>
          </div>
        </>
      )}

      <button onClick={handleLookup} disabled={loading || !hsCode.trim()}
        className={`w-full h-10 rounded-md text-white border-none font-semibold text-sm cursor-pointer transition-colors active:scale-[0.98] ${loading || !hsCode.trim() ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'}`}>
        {loading ? '查询中...' : mode === 'calc' && result ? '重新计算' : mode === 'lookup' && tariff ? '重新查询' : mode === 'lookup' ? '查询税率' : '计算税费'}
      </button>
    </div>
  )

  const renderResult = () => {
    if (mode === 'lookup' && tariff) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card w-[480px]">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">税率信息</h3>
            <p className="text-[12px] text-muted mt-0.5">{tariff.description} ({tariff.hs_code})</p>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: '最惠国税率', value: tariff.mfn_rate != null ? `${tariff.mfn_rate}%` : '—' },
              { label: '普通税率', value: tariff.general_rate != null ? `${tariff.general_rate}%` : '—' },
              { label: '增值税率', value: `${tariff.vat_rate}%` },
              { label: '消费税率', value: tariff.has_consumption_tax ? '适用（见具体商品）' : '不适用' },
              { label: '监管条件', value: supLabel(tariff.supervision) },
              { label: '法定单位', value: tariff.unit },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-[14px]">
                <span className="text-muted">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (mode === 'calc' && result) {
      const cif = result.cif_value
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card w-[480px]">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">计算结果</h3>
            <p className="text-[12px] text-muted mt-0.5">{result.hs_description} ({result.hs_code})</p>
          </div>
          <div className="p-6 space-y-3">
            {[
              ...(result.fob_value > 0 && result.fob_value < result.cif_value ? [
                { label: '货值 (FOB)', value: `¥ ${fmt(result.fob_value)}` },
                { label: '运费', value: result.freight > 0 ? `¥ ${fmt(result.freight)}` : '—' },
                { label: '保费', value: result.insurance > 0 ? `¥ ${fmt(result.insurance)}` : '—' },
              ] : []),
              { label: '完税价格 (CIF)', value: `¥ ${fmt(cif)}`, bold: true },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-[14px]">
                <span className="text-muted">{row.label}</span>
                <span className={`tabular-nums ${row.bold ? 'font-semibold' : ''}`}>{row.value}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3" />
            {[
              { label: '关税税率', value: `${result.duty_rate}% (最惠国)` },
              { label: '关税金额', value: `¥ ${fmt(result.duty_amount)}` },
              { label: '增值税率', value: `${result.vat_rate}%` },
              { label: '增值税', value: `¥ ${fmt(result.vat_amount)}` },
              { label: '消费税率', value: result.consumption_tax_rate ? `${result.consumption_tax_rate}%` : '不适用' },
              { label: '消费税', value: result.consumption_tax_amount > 0 ? `¥ ${fmt(result.consumption_tax_amount)}` : '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-[14px]">
                <span className="text-muted">{row.label}</span>
                <span className="tabular-nums font-medium">{row.value}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <div className="flex items-center justify-between text-[16px] font-bold">
                <span>综合税费</span>
                <span className="text-primary-600 tabular-nums">¥ {fmt(result.total_tax)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted mt-1">
                <span>完税总价 (CIF + 税费)</span>
                <span className="tabular-nums">¥ {fmt(result.total_price)}</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      {/* Left: Input Panel */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="px-6 pt-6 pb-3 drag-region">
          <h1 className="text-[24px] font-bold">费率计算器</h1>
          <p className="text-muted text-[13px] mt-1">进口税费查询与计算</p>
        </div>

        {/* Mode tabs */}
        <div className="px-6 pb-4">
          <div className="flex bg-surface dark:bg-gray-800 rounded-lg p-0.5">
            {[
              { id: 'lookup' as Mode, label: '税率查询' },
              { id: 'calc' as Mode, label: '税费计算' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setResult(null); setTariff(null); setError('') }}
                className={`flex-1 h-8 rounded-md text-[12px] font-medium cursor-pointer border-none transition-colors ${
                  mode === tab.id ? 'bg-white dark:bg-gray-700 text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {renderInputPanel()}

        {history.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted mb-2">历史记录</div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto">
              {history.slice(0, 10).map(item => (
                <button key={item.id}
                  onClick={() => {
                    setMode('calc')
                    setHsCode(item.hs_code); setCountryCode(item.country_code || 'CN')
                    setPriceTerm(item.fob_value > 0 && item.fob_value < item.cif_value ? 'fob' : 'cif')
                    setCifValue(String(item.cif_value))
                    setFobValue(String(item.fob_value || item.cif_value))
                    setFreight(String(item.freight || 0)); setInsurance(String(item.insurance || 0))
                    setQuantity(String(item.quantity || 1)); setCurrency(item.currency || 'CNY')
                    setResult(item)
                    setTariff({ hs_code: item.hs_code, description: item.hs_description || '', mfn_rate: item.duty_rate, general_rate: null, vat_rate: item.vat_rate, has_consumption_tax: !!item.consumption_tax_rate, unit: '个', supervision: null })
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-md cursor-pointer bg-transparent hover:bg-surface dark:hover:bg-gray-800 transition-colors border-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium truncate flex-1">{item.hs_description || item.hs_code}</span>
                    <span className="text-[12px] font-mono font-semibold text-primary-500 shrink-0 ml-2">¥{fmt(item.total_tax)}</span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">{item.hs_code} · {timeAgo(item.created_at)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Result */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-[12vh]">
        {!tariff && !result && !error && (
          <div className="text-center text-muted">
            <div className="text-4xl mb-4 opacity-20">🖩</div>
            <div className="text-[15px] font-medium mb-1">输入 HS 编码查询税率或计算税费</div>
            <div className="text-[13px]">
              {mode === 'lookup' ? '查看最惠国税率、增值税率、监管条件' : '输入货值、运费、保费计算综合税费'}
            </div>
          </div>
        )}
        {error && (
          <div className="text-center">
            <div className="text-amber-500 text-4xl mb-4">⚠</div>
            <div className="text-[15px] font-medium text-amber-600 mb-1">{error}</div>
            <div className="text-[13px] text-muted">请检查 HS 编码是否正确</div>
          </div>
        )}
        {renderResult()}
      </div>
    </div>
  )
}
