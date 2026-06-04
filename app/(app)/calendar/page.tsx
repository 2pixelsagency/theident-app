'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  all_day: boolean
  location: string | null
  related_job_id: string | null
  status: string
  color: string | null
}

const EVENT_TYPES = [
  { id: 'audition', label: 'Audition', color: '#4ade80' },
  { id: 'casting', label: 'Casting', color: '#5B7CFA' },
  { id: 'rehearsal', label: 'Rehearsal', color: '#f59e0b' },
  { id: 'performance', label: 'Performance', color: '#ec4899' },
  { id: 'work', label: 'Work', color: '#8b5cf6' },
  { id: 'holiday', label: 'Holiday', color: '#06b6d4' },
  { id: 'personal', label: 'Personal', color: '#a8a29e' },
]

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = []
  for (let i = startDay - 1; i >= 0; i--) days.push({ date: prevDays - i, month: month - 1, year, isCurrentMonth: false })
  for (let i = 1; i <= daysInMonth; i++) days.push({ date: i, month, year, isCurrentMonth: true })
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) days.push({ date: i, month: month + 1, year, isCurrentMonth: false })
  return days
}

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  if (hour === 0) return '12:' + m + 'am'
  if (hour < 12) return hour + ':' + m + 'am'
  if (hour === 12) return '12:' + m + 'pm'
  return (hour - 12) + ':' + m + 'pm'
}

function getTypeColor(type: string) { return EVENT_TYPES.find(t => t.id === type)?.color || '#a8a29e' }
function getTypeLabel(type: string) { return EVENT_TYPES.find(t => t.id === type)?.label || 'Event' }

export default function CalendarPage() {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('personal')
  const [formDate, setFormDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formAllDay, setFormAllDay] = useState(false)
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setProfileId(user.id)
      const { data } = await supabase.from('calendar_events').select('*').eq('profile_id', user.id).order('start_date').order('start_time')
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  const days = getMonthDays(currentYear, currentMonth)
  const getEventsForDate = (dateStr: string) => events.filter(e => e.start_date === dateStr || (e.end_date && e.start_date <= dateStr && e.end_date >= dateStr))

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }
  const goToToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDate(todayStr) }

  const openAdd = (date?: string) => {
    setEditingEvent(null)
    setFormTitle(''); setFormType('personal'); setFormDate(date || todayStr); setFormEndDate(''); setFormStartTime('09:00'); setFormEndTime('10:00'); setFormAllDay(false); setFormLocation(''); setFormDescription('')
    setShowAdd(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title); setFormType(event.event_type); setFormDate(event.start_date); setFormEndDate(event.end_date || ''); setFormStartTime(event.start_time || '09:00'); setFormEndTime(event.end_time || '10:00'); setFormAllDay(event.all_day); setFormLocation(event.location || ''); setFormDescription(event.description || '')
    setShowAdd(true)
  }

  const handleSave = async () => {
    if (!profileId || !formTitle || !formDate) return
    setSaving(true)
    const payload = { profile_id: profileId, title: formTitle, event_type: formType, start_date: formDate, end_date: formEndDate || null, start_time: formAllDay ? null : (formStartTime || null), end_time: formAllDay ? null : (formEndTime || null), all_day: formAllDay, location: formLocation || null, description: formDescription || null, color: getTypeColor(formType), status: 'confirmed' }
    if (editingEvent) {
      await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id)
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...payload, id: e.id } : e))
      showToast('Event updated')
    } else {
      const { data } = await supabase.from('calendar_events').insert(payload).select().single()
      if (data) setEvents(prev => [...prev, data])
      showToast('Event added')
    }
    setSaving(false); setShowAdd(false)
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    await supabase.from('calendar_events').delete().eq('id', editingEvent.id)
    setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
    setShowAdd(false); showToast('Event removed')
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const upcoming = events.filter(e => e.start_date >= todayStr).sort((a, b) => a.start_date.localeCompare(b.start_date) || (a.start_time || '').localeCompare(b.start_time || '')).slice(0, 5)

  const inputStyle: React.CSSProperties = { width:'100%',padding:'13px 14px',border:'1px solid #e0ddd5',borderRadius:'12px',fontSize:'14px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }
  const labelStyle: React.CSSProperties = { fontSize:'11px',color:'#888',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,display:'block',marginBottom:'6px' }

  if (loading) return <div style={{ minHeight:'100vh',background:'#f1f0ee' }} />

  return (
    <div style={{ fontFamily:'system-ui, sans-serif',background:'#f1f0ee',minHeight:'100vh',paddingBottom:'120px' }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } }
        .cal-sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .cal-day { -webkit-tap-highlight-color: transparent; cursor: pointer; transition: background 0.15s ease; }
        .cal-day:active { background: #e8e4de !important; }
      `}</style>

      {toast && <div className="toast-anim" style={{ position:'fixed',bottom:'100px',left:'50%',transform:'translateX(-50%)',background:'#0c2520',color:'#f1f0ee',padding:'12px 24px',borderRadius:'30px',fontSize:'13px',fontWeight:500,zIndex:700,whiteSpace:'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ padding:'24px 16px 16px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <p style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'22px',fontWeight:700,color:'#0c2520',margin:0 }}>Calendar</p>
          <div style={{ display:'flex',gap:'8px' }}>
            <button onClick={goToToday} style={{ background:'white',border:'1px solid #e0ddd5',padding:'8px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:'#0c2520' }}>Today</button>
            <button onClick={() => openAdd()} style={{ background:'#0c2520',border:'none',padding:'8px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:'#f1f0ee' }}>+ Add</button>
          </div>
        </div>

        {/* Month nav */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <button onClick={prevMonth} style={{ background:'none',border:'none',cursor:'pointer',padding:'8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'18px',fontWeight:700,color:'#0c2520',margin:0 }}>{MONTHS[currentMonth]} {currentYear}</p>
          <button onClick={nextMonth} style={{ background:'none',border:'none',cursor:'pointer',padding:'8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7, 1fr)',marginBottom:'4px' }}>
          {DAYS.map(d => <div key={d} style={{ textAlign:'center',fontSize:'11px',color:'#aaa',fontWeight:600,padding:'4px 0' }}>{d}</div>)}
        </div>

        {/* Grid */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:'2px' }}>
          {days.map((day, i) => {
            const dateStr = day.year + '-' + String(day.month + 1).padStart(2, '0') + '-' + String(day.date).padStart(2, '0')
            const dayEvents = getEventsForDate(dateStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            return (
              <div key={i} className="cal-day" onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{ aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:'12px',background:isSelected ? '#0c2520' : isToday ? '#e8efea' : 'transparent',position:'relative',gap:'3px' }}>
                <span style={{ fontSize:'14px',fontWeight:isToday ? 700 : 400,color:isSelected ? '#f1f0ee' : day.isCurrentMonth ? '#0c2520' : '#ccc' }}>{day.date}</span>
                {dayEvents.length > 0 && (
                  <div style={{ display:'flex',gap:'2px' }}>
                    {dayEvents.slice(0, 3).map((e, j) => <div key={j} style={{ width:'5px',height:'5px',borderRadius:'50%',background:isSelected ? '#4ade80' : getTypeColor(e.event_type) }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
            <p style={{ fontSize:'14px',fontWeight:600,color:'#0c2520',margin:0 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
            </p>
            <button onClick={() => openAdd(selectedDate)} style={{ background:'none',border:'none',fontSize:'12px',color:'#0c2520',fontWeight:500,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline' }}>+ Add event</button>
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{ background:'white',borderRadius:'14px',border:'1px solid #e8e4de',padding:'24px',textAlign:'center' }}>
              <p style={{ fontSize:'13px',color:'#aaa',margin:0 }}>No events</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
              {selectedEvents.map(e => (
                <div key={e.id} onClick={() => openEdit(e)} style={{ background:'white',borderRadius:'14px',border:'1px solid #e8e4de',padding:'14px 16px',cursor:'pointer',display:'flex',gap:'12px',alignItems:'start' }}>
                  <div style={{ width:'4px',borderRadius:'2px',background:getTypeColor(e.event_type),alignSelf:'stretch',flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:'14px',fontWeight:600,color:'#0c2520',margin:'0 0 3px' }}>{e.title}</p>
                    <div style={{ display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap' }}>
                      <span style={{ fontSize:'10px',fontWeight:600,color:getTypeColor(e.event_type),background:getTypeColor(e.event_type) + '18',padding:'2px 8px',borderRadius:'4px',textTransform:'uppercase',letterSpacing:'0.04em' }}>{getTypeLabel(e.event_type)}</span>
                      <span style={{ fontSize:'12px',color:'#888' }}>
                        {e.all_day ? 'All day' : (e.start_time ? formatTime(e.start_time) + (e.end_time ? ' - ' + formatTime(e.end_time) : '') : '')}
                      </span>
                    </div>
                    {e.location && <p style={{ fontSize:'12px',color:'#aaa',margin:'4px 0 0' }}>{e.location}</p>}
                  </div>
                  {e.status === 'pending' && <span style={{ fontSize:'10px',fontWeight:600,color:'#f59e0b',background:'#fef3c7',padding:'2px 8px',borderRadius:'4px' }}>PENDING</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && !selectedDate && (
        <div style={{ padding:'0 16px' }}>
          <p style={{ fontSize:'11px',color:'#888',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,margin:'0 0 10px' }}>Upcoming</p>
          <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
            {upcoming.map(e => (
              <div key={e.id} onClick={() => openEdit(e)} style={{ background:'white',borderRadius:'14px',border:'1px solid #e8e4de',padding:'14px 16px',cursor:'pointer',display:'flex',gap:'12px',alignItems:'start' }}>
                <div style={{ width:'4px',borderRadius:'2px',background:getTypeColor(e.event_type),alignSelf:'stretch',flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'14px',fontWeight:600,color:'#0c2520',margin:'0 0 3px' }}>{e.title}</p>
                  <div style={{ display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap' }}>
                    <span style={{ fontSize:'10px',fontWeight:600,color:getTypeColor(e.event_type),background:getTypeColor(e.event_type) + '18',padding:'2px 8px',borderRadius:'4px',textTransform:'uppercase',letterSpacing:'0.04em' }}>{getTypeLabel(e.event_type)}</span>
                    <span style={{ fontSize:'12px',color:'#888' }}>
                      {new Date(e.start_date + 'T12:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      {e.start_time ? ' · ' + formatTime(e.start_time) : ''}
                    </span>
                  </div>
                  {e.location && <p style={{ fontSize:'12px',color:'#aaa',margin:'2px 0 0' }}>{e.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit sheet */}
      {showAdd && (
        <>
          <div onClick={() => setShowAdd(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:500 }} />
          <div className="cal-sheet" style={{ position:'fixed',bottom:0,left:0,right:0,background:'#f1f0ee',borderRadius:'20px 20px 0 0',zIndex:501,maxHeight:'90vh',overflowY:'auto',paddingBottom:'env(safe-area-inset-bottom)' }}>
            <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px' }}><div style={{ width:'36px',height:'4px',borderRadius:'2px',background:'#d4d2cc' }} /></div>
            <div style={{ padding:'8px 20px 24px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
                <p style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'18px',fontWeight:700,color:'#0c2520',margin:0 }}>{editingEvent ? 'Edit event' : 'New event'}</p>
                <button onClick={() => setShowAdd(false)} style={{ background:'#0c2520',border:'none',borderRadius:'50%',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Type — colour coded pills */}
              <label style={labelStyle}>Type</label>
              <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px' }}>
                {EVENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => setFormType(t.id)} style={{ padding:'8px 14px',borderRadius:'20px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',border:formType === t.id ? '2px solid ' + t.color : '1px solid #e0ddd5',background:formType === t.id ? t.color + '18' : 'white',color:formType === t.id ? t.color : '#888',fontWeight:formType === t.id ? 600 : 400,transition:'all 0.15s ease',WebkitTapHighlightColor:'transparent' }}>
                    <span style={{ display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:t.color,marginRight:'6px',verticalAlign:'middle' }} />
                    {t.label}
                  </button>
                ))}
              </div>

              <label style={labelStyle}>Title</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Wicked audition callback" style={{ ...inputStyle, marginBottom:'14px' }} />

              {/* Date row */}
              <div style={{ background:'white',borderRadius:'14px',border:'1px solid #e0ddd5',marginBottom:'14px',overflow:'hidden' }}>
                <div style={{ display:'flex',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid #f0ede5' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" style={{ marginRight:'12px',flexShrink:0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <div style={{ flex:1,display:'flex',alignItems:'center',gap:'8px' }}>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',flex:1 }} />
                    {formEndDate && <span style={{ fontSize:'13px',color:'#aaa' }}>to</span>}
                    {formEndDate ? (
                      <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',flex:1 }} />
                    ) : (
                      <button onClick={() => setFormEndDate(formDate)} style={{ background:'none',border:'none',fontSize:'12px',color:'#888',cursor:'pointer',fontFamily:'inherit' }}>+ End date</button>
                    )}
                  </div>
                </div>

                {/* All day toggle */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:formAllDay ? 'none' : '1px solid #f0ede5' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize:'14px',color:'#0c2520' }}>All day</span>
                  </div>
                  <div onClick={() => setFormAllDay(!formAllDay)} style={{ width:'44px',height:'26px',borderRadius:'13px',background:formAllDay ? '#4ade80' : '#e0ddd5',cursor:'pointer',position:'relative',transition:'background 0.2s ease' }}>
                    <div style={{ width:'22px',height:'22px',borderRadius:'50%',background:'white',position:'absolute',top:'2px',left:formAllDay ? '20px' : '2px',transition:'left 0.2s ease',boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
                  </div>
                </div>

                {/* Time row */}
                {!formAllDay && (
                  <div style={{ display:'flex',alignItems:'center',padding:'14px 16px',gap:'8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',width:'auto' }} />
                    <span style={{ fontSize:'13px',color:'#aaa' }}>to</span>
                    <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',width:'auto' }} />
                  </div>
                )}
              </div>

              {/* Location */}
              <div style={{ background:'white',borderRadius:'14px',border:'1px solid #e0ddd5',marginBottom:'14px',display:'flex',alignItems:'center',padding:'14px 16px',gap:'12px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="Add location" style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',flex:1 }} />
              </div>

              {/* Notes */}
              <div style={{ background:'white',borderRadius:'14px',border:'1px solid #e0ddd5',marginBottom:'20px',display:'flex',alignItems:'start',padding:'14px 16px',gap:'12px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0,marginTop:'2px' }}><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Add notes" rows={2} style={{ border:'none',fontSize:'14px',fontFamily:'inherit',color:'#0c2520',background:'transparent',outline:'none',flex:1,resize:'vertical' }} />
              </div>

              <button onClick={handleSave} disabled={saving || !formTitle || !formDate} style={{ width:'100%',padding:'16px',background:'#0c2520',color:'#f1f0ee',border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : (editingEvent ? 'Update' : 'Add event')}
              </button>

              {editingEvent && (
                <button onClick={handleDelete} style={{ width:'100%',padding:'14px',background:'transparent',color:'#c0392b',border:'1px solid #e8e4de',borderRadius:'30px',fontSize:'14px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginTop:'10px' }}>Delete event</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
