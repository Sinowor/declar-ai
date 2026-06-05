import { useState, useEffect } from 'react'

interface TariffData {
  hs_code: string
  description: string
  mfn_rate: number | null
  general_rate: number | null
  vat_rate: number
  has_consumption_tax: boolean
  unit: string
}

interface CalcResult {
  hs_code: string
  hs_description: string
  country_code: string
  cif_value: number
  quantity: number
  duty_rate: number
  duty_amount: number
  vat_rate: number
  vat_amount: number
  consumption_tax_rate: number | null
  consumption_tax_amount: number
  total_tax: number
  total_price: number
}

interface HistoryItem extends CalcResult {
  id: string
  created_at: string
}

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

export default function Calculator() {
  const [hsCode, setHsCode] = useState('')
  const [countryCode, setCountryCode] = useState('CN')
  const [cifValue, setCifValue] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [countries, setCountries] = useState<any[]>([])
  const [tariff, setTariff] = useState<TariffData | null>(null)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useManualRates, setUseManualRates] = useState(false)
  const [manualDuty, setManualDuty] = useState('')
  const [manualVat, setManualVat] = useState('13')

  useEffect(() => {
    if ((window as any).api?.countriesList) {
      (window as any).api.countriesList().then((list: any[]) => {
        if (Array.isArray(list)) setCountries(list)
      }).catch(() => {})
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
          setUseManualRates(false)
          doCalculate(res.data)
        } else {
          setTariff(null)
          setUseManualRates(true)
          setError(res.error || '未找到税率')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const doCalculate = (t: TariffData) => {
    const cif = parseFloat(cifValue) || 0
    const qty = parseFloat(quantity) || 1
    const dutyRate = useManualRates ? (parseFloat(manualDuty) || 0) : (t.mfn_rate || 0)
    const vatRate = useManualRates ? (parseFloat(manualVat) || 0) : t.vat_rate
    const dutyAmount = cif * dutyRate / 100
    const vatAmount = (cif + dutyAmount) * vatRate / 100
    const consRate = t.has_consumption_tax ? 5 : 0 // default 5% for applicable goods
    const consAmount = t.has_consumption_tax ? (cif + dutyAmount) / (1 - consRate / 100) * consRate / 100 : 0

    const r: CalcResult = {
      hs_code: t.hs_code,
      hs_description: t.description,
      country_code: countryCode,
      cif_value: cif,
      quantity: qty,
      duty_rate: dutyRate,
      duty_amount: dutyAmount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      consumption_tax_rate: t.has_consumption_tax ? consRate : null,
      consumption_tax_amount: consAmount,
      total_tax: dutyAmount + vatAmount + consAmount,
      total_price: cif + dutyAmount + vatAmount + consAmount,
    }
    setResult(r)

    // Save to history
    if ((window as any).api?.calculatorSaveHistory) {
      (window as any).api.calculatorSaveHistory({ ...r, result_json: JSON.stringify(r) })
      setTimeout(loadHistory, 500)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      {/* Left: Input Panel */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="px-6 pt-6 pb-4 drag-region">
          <h1 className="text-[24px] font-bold">费率计算器</h1>
          <p className="text-muted text-[13px] mt-1">进口税费快速估算</p>
        </div>

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
              {countries.map((c: any) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">完税价格 (CIF)</label>
            <div className="flex gap-2">
              <input value={cifValue} onChange={e => setCifValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
                placeholder="100000"
                className="flex-1 h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
              <span className="h-9 flex items-center text-[13px] text-muted shrink-0">CNY</span>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">数量</label>
            <div className="flex gap-2">
              <input value={quantity} onChange={e => setQuantity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
                className="flex-1 h-9 rounded-md border border-gray-200 dark:border-gray-700 px-3 text-[14px] outline-none focus:border-primary-500 bg-white dark:bg-gray-800 font-sans tabular-nums" />
              <span className="h-9 flex items-center text-[13px] text-muted shrink-0">{tariff?.unit || '个'}</span>
            </div>
          </div>

          {useManualRates && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <div className="text-[12px] text-amber-700 dark:text-amber-300 mb-2">税则未查到，手动输入税率</div>
              <div className="flex gap-2">
                <input value={manualDuty} onChange={e => setManualDuty(e.target.value)}
                  placeholder="关税%"
                  className="w-20 h-8 rounded-md border border-amber-300 px-2 text-[13px] outline-none bg-white dark:bg-gray-800 font-sans" />
                <input value={manualVat} onChange={e => setManualVat(e.target.value)}
                  placeholder="增值税%"
                  className="w-20 h-8 rounded-md border border-amber-300 px-2 text-[13px] outline-none bg-white dark:bg-gray-800 font-sans" />
              </div>
            </div>
          )}

          <button onClick={handleLookup} disabled={loading || !hsCode.trim()}
            className={`w-full h-10 rounded-md text-white border-none font-semibold text-sm cursor-pointer transition-colors active:scale-[0.98] ${loading || !hsCode.trim() ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'}`}>
            {loading ? '查询中...' : result ? '重新计算' : '计算税费'}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted mb-2">历史记录</div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto">
              {history.slice(0, 10).map(item => (
                <button key={item.id}
                  onClick={() => {
                    setHsCode(item.hs_code)
                    setCountryCode(item.country_code || 'CN')
                    setCifValue(String(item.cif_value))
                    setQuantity(String(item.quantity || 1))
                    setResult(item)
                    setTariff({ hs_code: item.hs_code, description: item.hs_description || '', mfn_rate: item.duty_rate, general_rate: null, vat_rate: item.vat_rate, has_consumption_tax: !!item.consumption_tax_rate, unit: '个' })
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
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-[15vh]">
        {!result && !error && (
          <div className="text-center text-muted">
            <div className="text-4xl mb-4 opacity-20">🖩</div>
            <div className="text-[15px] font-medium mb-1">输入 HS 编码、原产国、货值</div>
            <div className="text-[13px]">即可计算综合进口税费</div>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-card w-[480px]">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">计算结果</h3>
              <p className="text-[12px] text-muted mt-0.5">{result.hs_description} ({result.hs_code})</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: '关税税率', value: `${result.duty_rate}%`, note: '(最惠国)' },
                { label: '关税金额', value: `¥ ${fmt(result.duty_amount)}` },
                { label: '增值税率', value: `${result.vat_rate}%` },
                { label: '增值税', value: `¥ ${fmt(result.vat_amount)}` },
                { label: '消费税率', value: result.consumption_tax_rate ? `${result.consumption_tax_rate}%` : '不适用' },
                { label: '消费税', value: result.consumption_tax_amount > 0 ? `¥ ${fmt(result.consumption_tax_amount)}` : '—' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-[14px]">
                  <span className="text-muted">{row.label}</span>
                  <span className={`font-medium ${row.label.includes('金额') || row.label.includes('税 ') ? 'tabular-nums' : ''}`}>
                    {row.value}
                    {row.note && <span className="text-[11px] text-muted ml-1 font-normal">{row.note}</span>}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex items-center justify-between text-[16px] font-bold">
                  <span>综合税费</span>
                  <span className="text-primary-600 tabular-nums">¥ {fmt(result.total_tax)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] text-muted mt-1">
                  <span>完税总价</span>
                  <span className="tabular-nums">¥ {fmt(result.total_price)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
