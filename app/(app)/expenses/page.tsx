'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Expense = { id: string; amount: number; description: string | null; category: string; receipt_url: string | null; expense_date: string; created_at: string }

const CATEGORIES = ['Classes','Travel','Costumes','Headshots','Equipment','Subscriptions','Food','Accommodation','Marketing','Other']
const CAT_COLORS: Record<string, string> = { Classes: '#4ade80', Travel: '#5B7CFA', Costumes: '#f59e0b', Headshots: '#ec4899', Equipment: '#8b5cf6', Subscriptions: '#06b6d4', Food: '#f97316', Accommodation: '#14b8a6', Marketing: '#e11d48', Other: '#888' }

export default function ExpensesPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Classes')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState<string | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
  const [tab, setTab] = useState<'expenses' | 'dashboard'>('expenses')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('expenses').select('*').eq('profile_id', user.id).order('expense_date', { ascending: false })
      setExpenses(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = async () => {
      const result = reader.result as string
      setReceiptPreview(result)
      setScanning(true)
      showToast('Scanning receipt...')
      try {
        const Tesseract = (await import('tesseract.js')).default
        const { data: { text } } = await Tesseract.recognize(result, 'eng')
        var lines = text.split('\n').map(function(l) { return l.trim() }).filter(Boolean)
        var amountMatch = text.match(/[£$]\s*(\d+[.,]\d{2})/g) || text.match(/(\d+[.,]\d{2})/g)
        if (amountMatch) {
          var amounts = amountMatch.map(function(a) { return parseFloat(a.replace(/[£$\s]/g, '').replace(',', '.')) })
          var biggest = Math.max.apply(null, amounts)
          setAmount(String(biggest.toFixed(2)))
        }
        var dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
        if (dateMatch) {
          var day = dateMatch[1].padStart(2, '0')
          var month = dateMatch[2].padStart(2, '0')
          var year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]
          setExpenseDate(year + '-' + month + '-' + day)
        }
        var descLine = lines.find(function(l) { return l.length > 5 && !/^\d/.test(l) && !/total|subtotal|vat|tax|change|cash|card|visa|mastercard|receipt|thank/i.test(l) })
        if (descLine) { setDescription(descLine.slice(0, 60)) }
        var lowerText = text.toLowerCase()
        if (/uber|train|bus|taxi|flight|parking|petrol/.test(lowerText)) { setCategory('Travel') }
        else if (/class|lesson|workshop|studio|rehearsal/.test(lowerText)) { setCategory('Classes') }
        else if (/coffee|cafe|restaurant|food|eat|lunch|dinner|breakfast|pret|greggs|mcdonald/.test(lowerText)) { setCategory('Food') }
        else if (/hotel|airbnb|accommodation|hostel/.test(lowerText)) { setCategory('Accommodation') }
        else if (/camera|lens|tripod|mic|light/.test(lowerText)) { setCategory('Equipment') }
        else if (/costume|dress|shoes|wig|makeup/.test(lowerText)) { setCategory('Costumes') }
        else if (/headshot|photo shoot|photographer/.test(lowerText)) { setCategory('Headshots') }
        else if (/spotify|netflix|subscription|monthly|annual/.test(lowerText)) { setCategory('Subscriptions') }
        showToast('Receipt scanned!')
      } catch (err) {
        showToast('Could not read receipt')
      }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!userId || !amount) return
    setSaving(true)
    var receiptUrl: string | null = null
    if (receiptFile) {
      var path = 'expenses/' + userId + '/' + Date.now() + '-receipt.jpg'
      var { error } = await supabase.storage.from('headshots').upload(path, receiptFile, { upsert: true })
      if (!error) {
        var { data: urlData } = supabase.storage.from('headshots').getPublicUrl(path)
        receiptUrl = urlData.publicUrl
      }
    }
    var { data } = await supabase.from('expenses').insert({ profile_id: userId, amount: parseFloat(amount), description: description || null, category: category, receipt_url: receiptUrl, expense_date: expenseDate }).select().single()
    if (data) { setExpenses([data, ...expenses]); showToast('Expense added') }
    setAmount(''); setDescription(''); setCategory('Classes'); setReceiptFile(null); setReceiptPreview(null); setShowForm(false); setSaving(false)
  }

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(expenses.filter(function(e) { return e.id !== id }))
    showToast('Deleted')
  }

  var filtered = expenses
  if (filterCat) { filtered = filtered.filter(function(e) { return e.category === filterCat }) }
  if (filterMonth) { filtered = filtered.filter(function(e) { return e.expense_date.startsWith(filterMonth) }) }

  var totalAll = expenses.reduce(function(s, e) { return s + Number(e.amount) }, 0)
  var totalFiltered = filtered.reduce(function(s, e) { return s + Number(e.amount) }, 0)
  var months = Array.from(new Set(expenses.map(function(e) { return e.expense_date.slice(0, 7) }))).sort().reverse()

  var catTotals = CATEGORIES.map(function(c) {
    var total = expenses.filter(function(e) { return e.category === c }).reduce(function(s, e) { return s + Number(e.amount) }, 0)
    return { name: c, total: total, color: CAT_COLORS[c] || '#888' }
  }).filter(function(c) { return c.total > 0 }).sort(function(a, b) { return b.total - a.total })

  var last6 = months.slice(0, 6).reverse()
  var monthlyData = last6.map(function(m) {
    var total = expenses.filter(function(e) { return e.expense_date.startsWith(m) }).reduce(function(s, e) { return s + Number(e.amount) }, 0)
    var label = new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short' })
    return { month: m, label: label, total: total }
  })
  var maxMonthly = Math.max.apply(null, monthlyData.map(function(d) { return d.total }).concat([1]))

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <style>{`@keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } } .toast-anim { animation: toastIn 0.25s ease-out; } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } } .scan-pulse { animation: pulse 1.5s ease-in-out infinite; }`}</style>
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {viewingReceipt && (
        <div onClick={() => setViewingReceipt(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <img src={viewingReceipt} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Expenses</p>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{showForm ? 'Cancel' : '+ Add'}</button>
        </div>

        <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '16px' }}>
          <button onClick={() => setTab('expenses')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'expenses' ? '#0c2520' : 'transparent', color: tab === 'expenses' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'expenses' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>Expenses</button>
          <button onClick={() => setTab('dashboard')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'dashboard' ? '#0c2520' : 'transparent', color: tab === 'dashboard' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'dashboard' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>Dashboard</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: '#0c2520', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: '#4ade80', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total spend</p>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '26px', fontWeight: 700, color: '#f1f0ee', margin: 0 }}>{'£' + totalAll.toFixed(2)}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{expenses.length + ' expense' + (expenses.length !== 1 ? 's' : '')}</p>
          </div>
          {(filterCat || filterMonth) && (
            <div style={{ flex: 1, background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de' }}>
              <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Filtered</p>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '26px', fontWeight: 700, color: '#0c2520', margin: 0 }}>{'£' + totalFiltered.toFixed(2)}</p>
              <p style={{ fontSize: '11px', color: '#aaa', margin: '4px 0 0' }}>{filtered.length + ' expense' + (filtered.length !== 1 ? 's' : '')}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {showForm && (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '14px' }}>
              {receiptPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={receiptPreview} alt="Receipt" className={scanning ? 'scan-pulse' : ''} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: scanning ? '2px solid #4ade80' : '1px solid #e8e4de' }} />
                  {scanning && <p style={{ fontSize: '11px', color: '#4ade80', margin: '4px 0 0', fontWeight: 500 }}>Scanning...</p>}
                  <button onClick={() => { setReceiptFile(null); setReceiptPreview(null) }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#c0392b', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} style={{ padding: '24px', border: '2px dashed #e0ddd5', borderRadius: '12px', background: '#f9f8f6', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', color: '#888', fontFamily: 'inherit', width: '100%' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span style={{ fontWeight: 500 }}>Scan receipt to auto-fill</span>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>or fill in manually below</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptSelect} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Amount (£)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" style={{ width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '10px', fontSize: '16px', fontFamily: 'inherit', color: '#0c2520', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', color: '#0c2520', boxSizing: 'border-box' }} />
              </div>
            </div>

            <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Jazz class at Pineapple" style={{ width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', color: '#0c2520', boxSizing: 'border-box', marginBottom: '12px' }} />

            <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Category</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {CATEGORIES.map(function(c) { return (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: category === c ? '1.5px solid ' + (CAT_COLORS[c] || '#0c2520') : '1px solid #e0ddd5', background: category === c ? (CAT_COLORS[c] || '#0c2520') + '18' : 'white', color: category === c ? CAT_COLORS[c] || '#0c2520' : '#888', cursor: 'pointer', fontFamily: 'inherit', fontWeight: category === c ? 600 : 400 }}>{c}</button>
              ) })}
            </div>

            <button onClick={handleSave} disabled={saving || scanning || !amount} style={{ width: '100%', padding: '14px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || scanning || !amount ? 0.5 : 1 }}>
              {saving ? 'Saving...' : 'Add expense'}
            </button>
          </div>
        )}

        {tab === 'expenses' && (
          <>
            {months.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
                <button onClick={() => setFilterMonth(null)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: filterMonth === null ? 'none' : '1px solid #e0ddd5', background: filterMonth === null ? '#0c2520' : 'white', color: filterMonth === null ? '#f1f0ee' : '#888', fontWeight: filterMonth === null ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>All</button>
                {months.map(function(m) {
                  var label = new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  return <button key={m} onClick={() => setFilterMonth(filterMonth === m ? null : m)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: filterMonth === m ? 'none' : '1px solid #e0ddd5', background: filterMonth === m ? '#0c2520' : 'white', color: filterMonth === m ? '#f1f0ee' : '#888', fontWeight: filterMonth === m ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{label}</button>
                })}
              </div>
            )}

            {filtered.map(function(e) { return (
              <div key={e.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e4de', padding: '14px 16px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                {e.receipt_url ? (
                  <div onClick={() => setViewingReceipt(e.receipt_url)} style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'url(' + e.receipt_url + ') center/cover', backgroundSize: 'cover', flexShrink: 0, cursor: 'pointer', border: '1px solid #e8e4de' }} />
                ) : (
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: (CAT_COLORS[e.category] || '#888') + '15', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: CAT_COLORS[e.category] || '#888' }}>{'£'}</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px' }}>{'£' + Number(e.amount).toFixed(2)}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px' }}>{e.description || 'No description'}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: CAT_COLORS[e.category] || '#888', background: (CAT_COLORS[e.category] || '#888') + '18', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>{e.category}</span>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>{new Date(e.expense_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) })}

            {filtered.length === 0 && (
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No expenses yet</p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Tap + Add to log your first expense</p>
              </div>
            )}
          </>
        )}

        {tab === 'dashboard' && (
          <>
            {monthlyData.length > 0 && (
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 14px' }}>Monthly spending</p>
                <div style={{ display: 'flex', alignItems: 'end', gap: '6px', height: '120px' }}>
                  {monthlyData.map(function(d) { return (
                    <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 600, color: '#0c2520' }}>{'£' + Math.round(d.total)}</span>
                      <div style={{ width: '100%', background: '#4ade80', borderRadius: '6px 6px 0 0', height: Math.max(4, (d.total / maxMonthly) * 90) + 'px', transition: 'height 0.3s ease' }} />
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{d.label}</span>
                    </div>
                  ) })}
                </div>
              </div>
            )}

            {catTotals.length > 0 && (
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 14px' }}>By category</p>
                <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
                  {catTotals.map(function(c) { return (
                    <div key={c.name} style={{ width: (c.total / totalAll * 100) + '%', background: c.color, transition: 'width 0.3s ease' }} />
                  ) })}
                </div>
                {catTotals.map(function(c) { return (
                  <div key={c.name} onClick={() => setFilterCat(filterCat === c.name ? null : c.name)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '13px', color: filterCat === c.name ? '#0c2520' : '#666', fontWeight: filterCat === c.name ? 600 : 400 }}>{c.name}</span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>{Math.round(c.total / totalAll * 100) + '%'}</span>
                    <span style={{ fontSize: '13px', color: '#0c2520', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>{'£' + c.total.toFixed(2)}</span>
                  </div>
                ) })}
              </div>
            )}

            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Biggest expenses</p>
              {expenses.slice().sort(function(a, b) { return Number(b.amount) - Number(a.amount) }).slice(0, 5).map(function(e) { return (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede5' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#0c2520', margin: '0 0 2px', fontWeight: 500 }}>{e.description || e.category}</p>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>{new Date(e.expense_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520' }}>{'£' + Number(e.amount).toFixed(2)}</span>
                </div>
              ) })}
              {expenses.length === 0 && <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '16px 0' }}>No data yet</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
