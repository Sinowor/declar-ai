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
  tax_method?: string
  rate_type?: string
  exchange_rate?: number | null
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

function formatResultText(r: CalcResult, tariff: TariffData | null, dir: string): string {
  const taxLabel = r.tax_method === 'specific' ? '从量计征' : r.tax_method === 'compound' ? '复合计征' : '从价计征'
  const rateLabel = r.rate_type === 'preferential' ? '协定税率' : r.rate_type === 'general' ? '普通税率' : r.rate_type === 'manual' ? '手动税率' : '最惠国税率'
  return [
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  ${dir === 'import' ? '进口' : '出口'}税费计算结果`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `HS 编码: ${r.hs_code}  ${r.hs_description}`,
    `原产国: ${r.country_code}`,
    `币制: ${r.currency}${r.exchange_rate ? ` (汇率: ${r.exchange_rate})` : ''}`,
    `计税方式: ${taxLabel} · ${rateLabel}`,
    r.fob_value > 0 && r.fob_value < r.cif_value ? `FOB 货值: ¥ ${fmt(r.fob_value)}` : '',
    r.fob_value > 0 && r.fob_value < r.cif_value && r.freight > 0 ? `运费: ¥ ${fmt(r.freight)}` : '',
    r.fob_value > 0 && r.fob_value < r.cif_value && r.insurance > 0 ? `保费: ¥ ${fmt(r.insurance)}` : '',
    `完税价格(CIF): ¥ ${fmt(r.cif_value)}`,
    `数量: ${r.quantity}` + (tariff?.unit ? ` ${tariff.unit}` : ''),
    ``,
    `关税: ${r.duty_rate}%  ¥ ${fmt(r.duty_amount)}`,
    `增值税: ${r.vat_rate}%  ¥ ${fmt(r.vat_amount)}`,
    r.consumption_tax_rate ? `消费税: ${r.consumption_tax_rate}%  ¥ ${fmt(r.consumption_tax_amount)}` : `消费税: 不适用`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `综合税费: ¥ ${fmt(r.total_tax)}`,
    `完税总价: ¥ ${fmt(r.total_price)}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `DeclarAI 费率计算器 · ${new Date().toLocaleDateString('zh-CN')}`,
  ].filter(l => l !== '').join('\n')
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
  const [direction, setDirection] = useState<'import' | 'export'>('import')
  const [priceTerm, setPriceTerm] = useState<'cif' | 'fob'>('cif')
  const [hsCode, setHsCode] = useState('')
  const [countryCode, setCountryCode] = useState('CN')
  const [cifValue, setCifValue] = useState('')
  const [fobValue, setFobValue] = useState('')
  const [freight, setFreight] = useState('')
  const [insurance, setInsurance] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [currency, setCurrency] = useState('CNY')
  const [exchangeRate, setExchangeRate] = useState('7.15')
  const [rateType, setRateType] = useState<'mfn' | 'general' | 'preferential' | 'manual'>('mfn')
  const [taxMethod, setTaxMethod] = useState<'ad_valorem' | 'specific' | 'compound'>('ad_valorem')
  const [specificRate, setSpecificRate] = useState('') // 从量税: 元/单位
  const [prefRate, setPrefRate] = useState('') // 协定税率
  const [manualDutyRate, setManualDutyRate] = useState('')
  const [manualVatRate, setManualVatRate] = useState('13')
  const [manualConsRate, setManualConsRate] = useState('')
  const [countries, setCountries] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [tariff, setTariff] = useState<TariffData | null>(null)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyMsg, setCopyMsg] = useState('')

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
    if (!hsCode.trim() && mode === 'lookup') return
    setError('')
    setLoading(true)
    setResult(null)

    // In calc mode with manual rates, skip DB lookup
    if (mode === 'calc' && rateType === 'manual') {
      doCalculate(null); setLoading(false); return
    }

    if (mode === 'calc' && !hsCode.trim()) {
      setError('请输入 HS 编码或选择手动税率'); setLoading(false); return
    }

    if ((window as any).api?.calculatorLookup) {
      const res = await (window as any).api.calculatorLookup(hsCode.trim())
      if (res.success && res.data) {
        setTariff(res.data)
        if (mode === 'calc') doCalculate(res.data)
      } else {
        setTariff(null)
        if (mode === 'calc') setError(res.error + '，可选择手动税率')
        else setError(res.error || '未找到税率')
      }
    }
    setLoading(false)
  }

  const doCalculate = (t: TariffData | null) => {
    const cifCny = priceTerm === 'cif'
      ? (parseFloat(cifValue) || 0) * (currency === 'CNY' ? 1 : (parseFloat(exchangeRate) || 1))
      : ((parseFloat(fobValue) || 0) + (parseFloat(freight) || 0) + (parseFloat(insurance) || 0)) * (currency === 'CNY' ? 1 : (parseFloat(exchangeRate) || 1))
    const fob = priceTerm === 'cif' ? cifCny : (parseFloat(fobValue) || 0) * (currency === 'CNY' ? 1 : (parseFloat(exchangeRate) || 1))
    const fr = priceTerm === 'cif' ? 0 : (parseFloat(freight) || 0) * (currency === 'CNY' ? 1 : (parseFloat(exchangeRate) || 1))
    const ins = priceTerm === 'cif' ? 0 : (parseFloat(insurance) || 0) * (currency === 'CNY' ? 1 : (parseFloat(exchangeRate) || 1))
    const qty = parseFloat(quantity) || 1

    // Duty rate: manual > preferential > rateType selection > mfn default
    const dutyRate = rateType === 'manual' ? (parseFloat(manualDutyRate) || 0)
      : rateType === 'preferential' ? (parseFloat(prefRate) || (t?.mfn_rate || 0))
      : rateType === 'general' ? (t?.general_rate || 0)
      : (t?.mfn_rate || 0)
    const vatRate = rateType === 'manual' ? (parseFloat(manualVatRate) || 0) : (t?.vat_rate || 13)
    const consRate = rateType === 'manual' ? (parseFloat(manualConsRate) || 0) : (t?.has_consumption_tax ? 5 : 0)

    // Duty calculation by method
    const specRate = parseFloat(specificRate) || 0
    const dutyAmount = taxMethod === 'specific' ? qty * specRate
      : taxMethod === 'compound' ? (cifCny * dutyRate / 100) + (qty * specRate)
      : cifCny * dutyRate / 100

    const vatAmount = (cifCny + dutyAmount) * vatRate / 100
    const consAmount = consRate > 0 ? (cifCny + dutyAmount) / (1 - consRate / 100) * consRate / 100 : 0

    const r: CalcResult = {
      hs_code: t?.hs_code || hsCode, hs_description: t?.description || '(手动)', country_code: countryCode,
      fob_value: fob, freight: fr, insurance: ins, cif_value: cifCny,
      quantity: qty, currency,
      duty_rate: dutyRate, duty_amount: dutyAmount,
      vat_rate: vatRate, vat_amount: vatAmount,
      consumption_tax_rate: (t?.has_consumption_tax || consRate > 0) ? consRate : null,
      consumption_tax_amount: consAmount,
      total_tax: dutyAmount + vatAmount + consAmount,
      total_price: cifCny + dutyAmount + vatAmount + consAmount,
      mode: 'calc',
      tax_method: taxMethod,
      rate_type: rateType,
      exchange_rate: currency === 'CNY' ? null : (parseFloat(exchangeRate) || null),
    }
    setResult(r)
    if ((window as any).api?.calculatorSaveHistory) {
      (window as any).api.calculatorSaveHistory({ ...r, result_json: JSON.stringify(r) })
      setTimeout(loadHistory, 500)
    }
  }

  const renderInputPanel = () => (
    <div className="px-8 pb-6 space-y-4 flex-1 overflow-y-auto">
      {/* Import/Export toggle */}
      <div>
        <label className="block text-[12px] font-medium text-muted mb-1">进出口</label>
        <div className="flex bg-surface dark:bg-gray-800 rounded-md p-0.5">
          {[
            { id: 'import' as const, label: '进口' },
            { id: 'export' as const, label: '出口' },
          ].map(d => (
            <button key={d.id} onClick={() => setDirection(d.id)}
              className={`flex-1 h-7 rounded text-[12px] font-medium cursor-pointer border-none transition-colors ${
                direction === d.id ? 'bg-white dark:bg-gray-700 text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'
              }`}>{d.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-muted mb-1">HS 编码</label>
        <input value={hsCode} onChange={e => setHsCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
          placeholder="84141000 或 8414.1000"
          className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] font-mono outline-none focus:border-primary-500 bg-white dark:bg-gray-800" />
      </div>

      {/* Exchange rate — only when currency ≠ CNY */}
      {mode === 'calc' && currency !== 'CNY' && (
        <div>
          <label className="block text-[12px] font-medium text-muted mb-1">汇率 (对人民币)</label>
          <input value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
            className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 tabular-nums" />
        </div>
      )}

      {/* Rate type selector — calc mode */}
      {mode === 'calc' && (
        <div>
          <label className="block text-[12px] font-medium text-muted mb-1">税率类型</label>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'mfn' as const, label: tariff ? `最惠国 ${tariff.mfn_rate != null ? tariff.mfn_rate + '%' : ''}` : '最惠国' },
              { id: 'general' as const, label: tariff ? `普通 ${tariff.general_rate != null ? tariff.general_rate + '%' : ''}` : '普通' },
              { id: 'preferential' as const, label: '协定' },
              { id: 'manual' as const, label: '手动' },
            ].map(rt => (
              <button key={rt.id} onClick={() => setRateType(rt.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer border transition-colors ${
                  rateType === rt.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800' : 'bg-transparent text-muted border-gray-200 dark:border-gray-700 hover:text-ink'
                }`}>{rt.label}</button>
            ))}
          </div>
          {(rateType === 'preferential' || rateType === 'manual') && (
            <div className="flex gap-2 mt-2">
              <input value={rateType === 'preferential' ? prefRate : manualDutyRate}
                onChange={e => rateType === 'preferential' ? setPrefRate(e.target.value) : setManualDutyRate(e.target.value)}
                placeholder="关税%" className="w-20 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none bg-white dark:bg-gray-800 tabular-nums" />
              {rateType === 'manual' && (
                <>
                  <input value={manualVatRate} onChange={e => setManualVatRate(e.target.value)}
                    placeholder="增值税%" className="w-20 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none bg-white dark:bg-gray-800 tabular-nums" />
                  <input value={manualConsRate} onChange={e => setManualConsRate(e.target.value)}
                    placeholder="消费税%" className="w-20 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[12px] outline-none bg-white dark:bg-gray-800 tabular-nums" />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tax method — calc mode */}
      {mode === 'calc' && (
        <div>
          <label className="block text-[12px] font-medium text-muted mb-1">计税方式</label>
          <div className="flex bg-surface dark:bg-gray-800 rounded-md p-0.5">
            {[
              { id: 'ad_valorem' as const, label: '从价' },
              { id: 'specific' as const, label: '从量' },
              { id: 'compound' as const, label: '复合' },
            ].map(tm => (
              <button key={tm.id} onClick={() => setTaxMethod(tm.id)}
                className={`flex-1 h-7 rounded text-[12px] font-medium cursor-pointer border-none transition-colors ${
                  taxMethod === tm.id ? 'bg-white dark:bg-gray-700 text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                }`}>{tm.label}</button>
            ))}
          </div>
          {taxMethod !== 'ad_valorem' && (
            <div className="mt-2">
              <label className="block text-[11px] text-muted mb-0.5">从量税率（元/单位）</label>
              <input value={specificRate} onChange={e => setSpecificRate(e.target.value)}
                placeholder="如 0.5"
                className="w-24 h-7 rounded-md border border-gray-200 dark:border-gray-700 px-2 text-[13px] outline-none bg-white dark:bg-gray-800 tabular-nums" />
            </div>
          )}
        </div>
      )}
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card w-[520px]">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h3 className="text-lg font-semibold">税率信息</h3>
                <span className="text-[13px] font-mono text-primary-500">{tariff.hs_code}</span>
              </div>
              <button
                onClick={async () => {
                  const text = [
                    `HS 编码: ${tariff.hs_code}  ${tariff.description}`,
                    `最惠国税率: ${tariff.mfn_rate != null ? tariff.mfn_rate + '%' : '—'}`,
                    `普通税率: ${tariff.general_rate != null ? tariff.general_rate + '%' : '—'}`,
                    `增值税率: ${tariff.vat_rate}%`,
                    `消费税率: ${tariff.has_consumption_tax ? '适用' : '不适用'}`,
                    `监管条件: ${tariff.supervision || '无'}`,
                    `法定单位: ${tariff.unit}`,
                  ].join('\n')
                  await navigator.clipboard.writeText(text)
                  setCopyMsg('已复制'); setTimeout(() => setCopyMsg(''), 1500)
                }}
                className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink hover:border-gray-300 transition-colors active:scale-[0.97]"
              >{copyMsg || '复制结果'}</button>
            </div>
            <p className="text-[13px] text-muted mt-1">{tariff.description}</p>
          </div>
          <div className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: '最惠国税率', value: tariff.mfn_rate != null ? `${tariff.mfn_rate}%` : '—' },
                { label: '普通税率', value: tariff.general_rate != null ? `${tariff.general_rate}%` : '—' },
                { label: '增值税率', value: `${tariff.vat_rate}%` },
                { label: '法定单位', value: tariff.unit },
              ].map(row => (
                <div key={row.label}>
                  <div className="text-[12px] text-muted">{row.label}</div>
                  <div className="text-[16px] font-semibold mt-0.5">{row.value}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="text-[12px] text-muted mb-1">消费税率</div>
              <div className="text-[14px] font-medium">{tariff.has_consumption_tax ? '适用（见具体商品）' : '不适用'}</div>
            </div>
            {tariff.supervision && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="text-[12px] text-muted mb-1">监管条件</div>
                <div className="text-[13px] font-medium leading-relaxed">{supLabel(tariff.supervision)}</div>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (mode === 'calc' && result) {
      const cif = result.cif_value
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card w-[520px]">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h3 className="text-lg font-semibold">计算结果</h3>
                <span className="text-[13px] font-mono text-primary-500">{result.hs_code}</span>
              </div>
              <button
                onClick={async () => {
                  const text = formatResultText(result, tariff, direction)
                  await navigator.clipboard.writeText(text)
                  setCopyMsg('已复制'); setTimeout(() => setCopyMsg(''), 1500)
                }}
                className="h-7 px-3 rounded-sm text-[11px] font-medium cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted hover:text-ink hover:border-gray-300 transition-colors active:scale-[0.97]"
              >{copyMsg || '复制结果'}</button>
            </div>
            <p className="text-[13px] text-muted mt-1">{result.hs_description}</p>
          </div>
          <div className="p-8 space-y-4">
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
              { label: `关税税率${result.tax_method === 'specific' ? ' (从量)' : result.tax_method === 'compound' ? ' (复合)' : ''}`, value: result.tax_method !== 'specific' ? `${result.duty_rate}%${result.rate_type === 'preferential' ? ' (协定)' : result.rate_type === 'general' ? ' (普通)' : result.rate_type === 'manual' ? ' (手动)' : ' (最惠国)'}` : `¥${result.duty_rate}/单位` },
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
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold">综合税费</span>
                <span className="text-[20px] font-bold text-primary-600 tabular-nums">¥ {fmt(result.total_tax)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted mt-2">
                <span>完税总价 (CIF + 税费)</span>
                <span className="text-[15px] font-semibold tabular-nums">¥ {fmt(result.total_price)}</span>
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
      <div className="w-[420px] shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="px-8 pt-8 pb-5 drag-region">
          <h1 className="text-[26px] font-bold tracking-tight">费率计算器</h1>
          <p className="text-muted text-[13px] mt-1.5">进口税费查询与计算</p>
        </div>

        {/* Mode tabs */}
        <div className="px-8 pb-5">
          <div className="flex bg-surface dark:bg-gray-800 rounded-lg p-0.5">
            {[
              { id: 'lookup' as Mode, label: '税率查询', desc: '查看税率信息' },
              { id: 'calc' as Mode, label: '税费计算', desc: '计算综合税费' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setResult(null); setTariff(null); setError('') }}
                className={`flex-1 h-9 rounded-md text-[13px] font-medium cursor-pointer border-none transition-all duration-200 ${
                  mode === tab.id ? 'bg-white dark:bg-gray-700 text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {renderInputPanel()}

        {history.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted mb-2">历史记录</div>
            <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
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
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        {!tariff && !result && !error && (
          <div className="text-center text-muted -mt-10">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-4 opacity-20">
              <rect x="3" y="2" width="18" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><circle cx="8.5" cy="16.5" r="1.5" fill="currentColor" /><line x1="13" y1="16" x2="17" y2="16" />
            </svg>
            <div className="text-[15px] font-medium mb-1">输入 HS 编码查询税率或计算税费</div>
            <div className="text-[13px]">
              {mode === 'lookup' ? '查看最惠国税率、增值税率、监管条件' : '输入货值、运费、保费计算综合税费'}
            </div>
          </div>
        )}
        {error && (
          <div className="text-center -mt-10">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-amber-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-[15px] font-medium text-amber-600 mb-1">{error}</div>
            <div className="text-[13px] text-muted">请检查 HS 编码是否正确</div>
          </div>
        )}
        {renderResult()}
      </div>
    </div>
  )
}
