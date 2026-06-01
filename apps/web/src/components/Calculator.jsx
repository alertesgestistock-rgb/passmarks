import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Calculator as CalcIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Math utilities
// ─────────────────────────────────────────────────────────────────────────────

function safeEval(expr) {
  if (!expr) return '0';
  try {
    const s = expr
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/π/g, String(Math.PI)).replace(/\be\b/g, String(Math.E))
      .replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict"; return (${s})`)();
    if (!isFinite(r) || isNaN(r)) return 'Error';
    return String(parseFloat(r.toFixed(10)));
  } catch { return 'Error'; }
}

function applyFn(fn, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return 'Erreur';
  const RAD = Math.PI / 180;
  const map = {
    'sin': () => parseFloat(Math.sin(v * RAD).toFixed(10)),
    'cos': () => parseFloat(Math.cos(v * RAD).toFixed(10)),
    'tan': () => parseFloat(Math.tan(v * RAD).toFixed(10)),
    'log': () => v > 0 ? parseFloat(Math.log10(v).toFixed(10)) : null,
    'ln':  () => v > 0 ? parseFloat(Math.log(v).toFixed(10)) : null,
    'x²':  () => parseFloat((v ** 2).toFixed(10)),
    '√':   () => v >= 0 ? parseFloat(Math.sqrt(v).toFixed(10)) : null,
    '1/x': () => v !== 0 ? parseFloat((1 / v).toFixed(10)) : null,
    'abs': () => Math.abs(v),
  };
  const fn_ = map[fn];
  if (!fn_) return val;
  const r = fn_();
  return r === null || r === undefined ? 'Error' : String(r);
}

function computeStats(numbers) {
  const n = numbers.length;
  if (!n) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = numbers.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const freq = {};
  numbers.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const maxF = Math.max(...Object.values(freq));
  const modes = maxF > 1 ? Object.keys(freq).filter(k => freq[k] === maxF).map(Number) : [];
  return {
    n, sum: +sum.toFixed(6), mean: +mean.toFixed(6), median: +median.toFixed(6),
    mode: modes.length ? modes.join(', ') : '–',
    stddev: +Math.sqrt(variance).toFixed(6), variance: +variance.toFixed(6),
    min: sorted[0], max: sorted[n - 1], range: +(sorted[n - 1] - sorted[0]).toFixed(6),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Button definitions
// ─────────────────────────────────────────────────────────────────────────────

const STD_ROWS = [
  [
    { label: 'C', type: 'clear' },
    { label: '⌫', type: 'back' },
    { label: '%', type: 'pct' },
    { label: '÷', type: 'op' },
  ],
  ['7', '8', '9', { label: '×', type: 'op' }],
  ['4', '5', '6', { label: '−', type: 'op' }],
  ['1', '2', '3', { label: '+', type: 'op' }],
  [{ label: '0', wide: true }, '.', { label: '=', type: 'equal' }],
];

const SCI_ROWS = [
  [
    { label: 'sin', type: 'fn' }, { label: 'cos', type: 'fn' },
    { label: 'tan', type: 'fn' }, { label: '(', type: 'paren' },
    { label: ')', type: 'paren' },
  ],
  [
    { label: 'log', type: 'fn' }, { label: 'ln', type: 'fn' },
    { label: '√', type: 'fn' },  { label: 'x²', type: 'fn' },
    { label: '1/x', type: 'fn' },
  ],
  [
    { label: 'π', type: 'const' }, { label: 'e', type: 'const' },
    { label: 'xʸ', type: 'op' }, { label: 'abs', type: 'fn' },
    { label: '±', type: 'sign' },
  ],
];

// ─────────────────────────────────────────────────────────────────────────────
// Calc Button
// ─────────────────────────────────────────────────────────────────────────────

function CBtn({ label, type = 'digit', wide = false, onClick }) {
  const styles = {
    digit: 'bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-white text-[18px]',
    op:    'bg-[#22C55E]/20 text-[#22C55E] dark:text-[#4ADE80] text-[18px] font-bold',
    equal: 'bg-[#22C55E] text-[#052e16] text-[20px] font-bold',
    clear: 'bg-red-100 dark:bg-[#EF4444]/20 text-red-500 dark:text-[#F87171] text-[14px] font-bold',
    back:  'bg-slate-200 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] text-[15px]',
    pct:   'bg-slate-200 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] text-[15px]',
    sign:  'bg-slate-200 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] text-[15px]',
    fn:    'bg-blue-50 dark:bg-[#3B82F6]/15 text-blue-500 dark:text-[#93C5FD] text-[11px] font-semibold',
    const: 'bg-purple-50 dark:bg-[#A855F7]/15 text-purple-500 dark:text-[#C4B5FD] text-[13px] font-semibold',
    paren: 'bg-slate-200/60 dark:bg-[#475569]/40 text-slate-500 dark:text-[#94A3B8] text-[15px]',
  };
  return (
    <button
      className={cn(
        'h-12 rounded-xl flex items-center justify-center select-none cursor-pointer',
        'transition-all duration-75 active:scale-90 hover:brightness-110 focus:outline-none',
        styles[type] || styles.digit,
        wide && 'col-span-2'
      )}
      onClick={() => onClick(label, type)}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard / Scientific Calculator
// ─────────────────────────────────────────────────────────────────────────────

function StandardCalc({ scientific }) {
  const [s, setS] = useState({ display: '0', expr: '', evaled: false });

  const press = useCallback((label, type) => setS(prev => {
    const { display: d, expr: e, evaled: ev } = prev;

    if (type === 'clear')  return { display: '0', expr: '', evaled: false };
    if (type === 'back')   return { ...prev, display: d === 'Error' ? '0' : d.length > 1 ? d.slice(0, -1) : '0' };

    if (type === 'equal') {
      const full = e + d;
      return { display: safeEval(full), expr: full + ' =', evaled: true };
    }
    if (type === 'op') {
      const raw = label === 'xʸ' ? '^' : label;
      return d !== 'Erreur' ? { display: '0', expr: e + d + raw, evaled: false } : prev;
    }
    if (type === 'pct') {
      const v = parseFloat(d);
      return isNaN(v) ? prev : { ...prev, display: String(v / 100) };
    }
    if (type === 'sign') {
      if (d === '0' || d === 'Error') return prev;
      return { ...prev, display: d.startsWith('-') ? d.slice(1) : '-' + d };
    }
    if (type === 'fn') {
      return { display: applyFn(label, d), expr: `${label}(${d})`, evaled: true };
    }
    if (type === 'const') {
      const val = label === 'π' ? String(Math.PI) : String(Math.E);
      return { display: val, expr: ev ? '' : e, evaled: false };
    }
    if (type === 'paren') return { ...prev, expr: e + label };

    const base = ev ? '0' : d;
    const newE  = ev ? '' : e;
    if (label === '.') return { display: base.includes('.') ? base : base + '.', expr: newE, evaled: false };
    return { display: base === '0' ? label : base + label, expr: newE, evaled: false };
  }), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key >= '0' && e.key <= '9')      { press(e.key, 'digit'); return; }
      if (e.key === '.' || e.key === ',')    { press('.', 'digit'); return; }
      if (e.key === '+')                     { press('+', 'op'); return; }
      if (e.key === '-')                     { press('−', 'op'); return; }
      if (e.key === '*')                     { press('×', 'op'); return; }
      if (e.key === '/')                     { e.preventDefault(); press('÷', 'op'); return; }
      if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); press('=', 'equal'); return; }
      if (e.key === 'Backspace')             { press('⌫', 'back'); return; }
      if (e.key === 'Delete')                { press('C', 'clear'); return; }
      if (e.key === '%')                     { press('%', 'pct'); return; }
      if (e.key === '(' && scientific)       { press('(', 'paren'); return; }
      if (e.key === ')' && scientific)       { press(')', 'paren'); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [press, scientific]);

  return (
    <div>
      {/* Display */}
      <div className="bg-slate-100 dark:bg-[#0F172A] rounded-xl p-4 mb-3 text-right select-text cursor-text">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 min-h-[16px] truncate font-mono">{s.expr || ' '}</div>
        <div className={cn(
          'text-slate-900 dark:text-white font-mono font-bold mt-1 truncate transition-all',
          s.display.length > 14 ? 'text-[18px]' :
          s.display.length > 10 ? 'text-[24px]' :
          s.display.length > 7  ? 'text-[28px]' : 'text-[36px]'
        )}>
          {s.display}
        </div>
      </div>

      {/* Scientific extra rows */}
      {scientific && (
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {SCI_ROWS.flat().map((btn, i) => {
            const b = typeof btn === 'string' ? { label: btn } : btn;
            return <CBtn key={i} {...b} onClick={press} />;
          })}
        </div>
      )}

      {/* Standard rows */}
      <div className="grid grid-cols-4 gap-1.5">
        {STD_ROWS.flat().map((btn, i) => {
          const b = typeof btn === 'string' ? { label: btn } : btn;
          return <CBtn key={i} {...b} onClick={press} />;
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial helpers
// ─────────────────────────────────────────────────────────────────────────────

function InputField({ label, value, onChange, suffix }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
      <div className="flex items-center bg-slate-100 dark:bg-[#0F172A] rounded-lg px-3 h-10 border border-slate-200 dark:border-[#1E293B] focus-within:border-[#22C55E] transition-colors gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-slate-900 dark:text-white text-[14px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
          placeholder="0"
        />
        {suffix && <span className="text-slate-400 dark:text-slate-500 text-[12px] shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className={cn(
      'rounded-lg p-2.5',
      highlight
        ? 'bg-[#22C55E]/15 border border-[#22C55E]/30'
        : 'bg-slate-100 dark:bg-[#0F172A]'
    )}>
      <div className="text-[10px] text-slate-400 dark:text-slate-500">{label}</div>
      <div className={cn('text-[15px] font-bold font-mono mt-0.5', highlight ? 'text-[#22C55E]' : 'text-slate-900 dark:text-white')}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-10 bg-[#22C55E] text-[#052e16] rounded-xl font-bold text-[14px] hover:brightness-110 active:scale-95 transition-all"
    >
      {label}
    </button>
  );
}

function SubTabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-[#0F172A] rounded-xl mb-4">
      {tabs.map(t => (
        <button
          key={t.id ?? t.val}
          onClick={() => onChange(t.id ?? t.val)}
          className={cn(
            'flex-1 h-8 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap',
            (active === (t.id ?? t.val))
              ? 'bg-[#22C55E] text-[#052e16]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Percentage ───────────────────────────────────────────────────────────────
function PctSection() {
  const [amount, setAmount] = useState('');
  const [pct, setPct]       = useState('');
  const [res, setRes]       = useState(null);

  const calc = () => {
    const a = parseFloat(amount), p = parseFloat(pct);
    if (isNaN(a) || isNaN(p)) return;
    setRes({
      part:  (a * p / 100).toFixed(2),
      plus:  (a * (1 + p / 100)).toFixed(2),
      minus: (a * (1 - p / 100)).toFixed(2),
    });
  };

  return (
    <div className="space-y-3">
      <InputField label="Amount" value={amount} onChange={setAmount} suffix="FCFA" />
      <InputField label="Percentage" value={pct} onChange={setPct} suffix="%" />
      <ActionBtn label="Calculate" onClick={calc} />
      {res && (
        <div className="space-y-1.5">
          <ResultRow label={`${pct}% of ${amount}`}              value={`${res.part} FCFA`} />
          <ResultRow label={`${amount} increased by ${pct}%`}    value={`${res.plus} FCFA`} highlight />
          <ResultRow label={`${amount} decreased by ${pct}%`}    value={`${res.minus} FCFA`} />
        </div>
      )}
    </div>
  );
}

// ─── Margin ──────────────────────────────────────────────────────────────────
function MarginSection() {
  const [cost, setCost] = useState('');
  const [sell, setSell] = useState('');
  const [res, setRes]   = useState(null);

  const calc = () => {
    const c = parseFloat(cost), s = parseFloat(sell);
    if (isNaN(c) || isNaN(s) || c === 0 || s === 0) return;
    const profit = s - c;
    setRes({
      profit: profit.toFixed(2),
      margin: (profit / s * 100).toFixed(2),
      markup: (profit / c * 100).toFixed(2),
    });
  };

  return (
    <div className="space-y-3">
      <InputField label="Purchase price (cost)" value={cost} onChange={setCost} suffix="FCFA" />
      <InputField label="Selling price"         value={sell} onChange={setSell} suffix="FCFA" />
      <ActionBtn label="Calculate" onClick={calc} />
      {res && (
        <div className="space-y-1.5">
          <ResultRow label="Profit"        value={`${res.profit} FCFA`} highlight />
          <ResultRow label="Gross margin"  value={`${res.margin}%`} />
          <ResultRow label="Markup rate"   value={`${res.markup}%`} />
        </div>
      )}
    </div>
  );
}

// ─── Interest ────────────────────────────────────────────────────────────────
function InterestSection() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]           = useState('');
  const [years, setYears]         = useState('');
  const [res, setRes]             = useState(null);

  const calc = () => {
    const P = parseFloat(principal), r = parseFloat(rate) / 100, t = parseFloat(years);
    if (isNaN(P) || isNaN(r) || isNaN(t)) return;
    const si = P * r * t;
    const ci = P * (1 + r) ** t - P;
    setRes({ si: si.toFixed(2), ci: ci.toFixed(2), tsi: (P + si).toFixed(2), tci: (P + ci).toFixed(2) });
  };

  return (
    <div className="space-y-3">
      <InputField label="Initial capital" value={principal} onChange={setPrincipal} suffix="FCFA" />
      <InputField label="Annual rate"     value={rate}      onChange={setRate}      suffix="%" />
      <InputField label="Duration"        value={years}     onChange={setYears}     suffix="yrs" />
      <ActionBtn label="Calculate" onClick={calc} />
      {res && (
        <div className="grid grid-cols-2 gap-1.5">
          <ResultRow label="Simple interest"    value={`${res.si} FCFA`} />
          <ResultRow label="Compound interest"  value={`${res.ci} FCFA`} />
          <ResultRow label="Total (simple)"     value={`${res.tsi} FCFA`} highlight />
          <ResultRow label="Total (compound)"   value={`${res.tci} FCFA`} highlight />
        </div>
      )}
    </div>
  );
}

// ─── TVA ─────────────────────────────────────────────────────────────────────
function TVASection() {
  const [amount, setAmount]   = useState('');
  const [tvaRate, setTvaRate] = useState('19.25');
  const [isHT, setIsHT]       = useState(true);
  const [res, setRes]         = useState(null);

  const calc = () => {
    const a = parseFloat(amount), r = parseFloat(tvaRate) / 100;
    if (isNaN(a) || isNaN(r)) return;
    let ht, tva, ttc;
    if (isHT) { ht = a; tva = a * r; ttc = a + tva; }
    else       { ttc = a; ht = a / (1 + r); tva = ttc - ht; }
    setRes({ ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: ttc.toFixed(2) });
  };

  return (
    <div className="space-y-3">
      <SubTabBar
        tabs={[{ id: true, label: 'Pre-tax (HT)' }, { id: false, label: 'Tax-incl. (TTC)' }]}
        active={isHT}
        onChange={v => setIsHT(v === true || v === 'true')}
      />
      <InputField label={isHT ? 'Pre-tax amount (HT)' : 'Tax-inclusive amount (TTC)'} value={amount} onChange={setAmount} suffix="FCFA" />
      <InputField label="VAT rate" value={tvaRate} onChange={setTvaRate} suffix="%" />
      <p className="text-[10px] text-slate-400 dark:text-slate-600">💡 Default VAT: Cameroon 19.25%</p>
      <ActionBtn label="Calculate" onClick={calc} />
      {res && (
        <div className="space-y-1.5">
          <ResultRow label="Pre-tax (HT)"         value={`${res.ht} FCFA`} />
          <ResultRow label={`VAT (${tvaRate}%)`}   value={`${res.tva} FCFA`} />
          <ResultRow label="Tax-inclusive (TTC)"   value={`${res.ttc} FCFA`} highlight />
        </div>
      )}
    </div>
  );
}

// ─── Financial container ──────────────────────────────────────────────────────
function FinancialCalc() {
  const [tab, setTab] = useState('pct');
  const tabs = [
    { id: 'pct',      label: 'Percentage' },
    { id: 'margin',   label: 'Margin' },
    { id: 'interest', label: 'Interest' },
    { id: 'tva',      label: 'VAT' },
  ];

  return (
    <div>
      <SubTabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'pct'      && <PctSection />}
      {tab === 'margin'   && <MarginSection />}
      {tab === 'interest' && <InterestSection />}
      {tab === 'tva'      && <TVASection />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics Calculator
// ─────────────────────────────────────────────────────────────────────────────

function StatisticsCalc() {
  const [input, setInput] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const calculate = () => {
    const parts = input.split(/[\s,;]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (!parts.length || nums.some(isNaN)) {
      setError('Enter valid numbers separated by commas or spaces');
      setStats(null);
      return;
    }
    setError('');
    setStats(computeStats(nums));
  };

  const ITEMS = stats ? [
    { label: 'Count (n)',       value: stats.n },
    { label: 'Sum (Σx)',        value: stats.sum },
    { label: 'Mean (x̄)',        value: stats.mean },
    { label: 'Median',          value: stats.median },
    { label: 'Mode',            value: stats.mode },
    { label: 'Std dev (σ)',     value: stats.stddev },
    { label: 'Variance (σ²)',   value: stats.variance },
    { label: 'Min',             value: stats.min },
    { label: 'Max',             value: stats.max },
    { label: 'Range',           value: stats.range },
  ] : [];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 block">
          Data (comma, space or semicolon)
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. 12, 15, 18, 22, 9, 31..."
          rows={3}
          className="w-full bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-white text-[14px] rounded-xl p-3 outline-none border border-slate-200 dark:border-[#1E293B] focus:border-[#22C55E] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono transition-colors"
        />
      </div>
      {error && <p className="text-[12px] text-red-500 dark:text-[#F87171]">{error}</p>}
      <button
        onClick={calculate}
        className="w-full h-10 bg-[#22C55E] text-[#052e16] rounded-xl font-bold text-[14px] hover:brightness-110 active:scale-95 transition-all"
      >
        Calculate statistics
      </button>
      {stats && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {stats.n} value{stats.n > 1 ? 's' : ''} analysed
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEMS.map(({ label, value }) => (
              <div key={label} className="bg-slate-100 dark:bg-[#0F172A] rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400 dark:text-slate-500">{label}</div>
                <div className="text-[14px] font-bold text-slate-900 dark:text-white font-mono">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculator Modal
// ─────────────────────────────────────────────────────────────────────────────

const MODES = [
  { id: 'standard',   label: 'Standard' },
  { id: 'scientific', label: 'Scientific' },
  { id: 'financial',  label: 'Financial' },
  { id: 'statistics', label: 'Statistics' },
];

export default function Calculator({ onClose }) {
  const [mode, setMode] = useState('standard');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/80',
          'rounded-t-2xl sm:rounded-2xl shadow-2xl w-full',
          'max-h-[92vh] flex flex-col overflow-hidden',
          mode === 'scientific' ? 'sm:max-w-[460px]' : 'sm:max-w-[380px]'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-[#334155]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <CalcIcon size={16} />
            </div>
            <h2 className="text-slate-900 dark:text-white font-bold text-[15px]">Calculator</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto hide-scrollbar shrink-0">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0',
                mode === m.id
                  ? 'bg-[#22C55E] text-[#052e16] shadow-sm'
                  : 'bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-[#334155]/50 mx-4 mb-3 shrink-0" />

        {/* Content */}
        <div className="px-4 pb-5 overflow-y-auto">
          {mode === 'standard'   && <StandardCalc />}
          {mode === 'scientific' && <StandardCalc scientific />}
          {mode === 'financial'  && <FinancialCalc />}
          {mode === 'statistics' && <StatisticsCalc />}
        </div>
      </div>
    </div>,
    document.body
  );
}
