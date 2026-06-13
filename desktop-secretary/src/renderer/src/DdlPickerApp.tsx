import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  setHours, setMinutes, startOfDay,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ============================================================
// DdlPickerApp — 独立窗口中的日历日期选择器 (Bug 6)
// 接收当前 dueDate，选择后通过 IPC 通知主进程转发给面板
// ============================================================

interface QuickTime {
  label: string
  hour: number
  minute: number
}

const QUICK_TIMES: QuickTime[] = [
  { label: '09:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '14:00', hour: 14, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
]

function CalendarMonth({
  selectedDate,
  onSelectDate,
  baseDate,
  onBaseDateChange,
}: {
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
  baseDate: Date
  onBaseDateChange: (d: Date) => void
}) {
  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(monthStart)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const rows: Date[][] = []
  let day = calStart
  while (day <= calEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(day)
      day = addDays(day, 1)
    }
    rows.push(week)
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <button onClick={() => onBaseDateChange(subMonths(baseDate, 1))}
          style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>
          {format(baseDate, 'yyyy年M月', { locale: zhCN })}
        </span>
        <button onClick={() => onBaseDateChange(addMonths(baseDate, 1))}
          style={navBtnStyle}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {weekDays.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, color: '#8E8E93', padding: '4px 0',
            fontWeight: 500,
          }}>{d}</div>
        ))}
      </div>

      {rows.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {week.map(d => {
            const inMonth = isSameMonth(d, baseDate)
            const selected = selectedDate && isSameDay(d, selectedDate)
            const today = isToday(d)
            return (
              <button
                key={d.toISOString()}
                onClick={() => inMonth && onSelectDate(d)}
                disabled={!inMonth}
                style={{
                  width: '100%', aspectRatio: '1',
                  border: 'none', borderRadius: 8,
                  cursor: inMonth ? 'pointer' : 'default',
                  background: selected ? '#007AFF' : today ? 'rgba(0,122,255,0.08)' : 'transparent',
                  color: selected ? 'white' : inMonth ? '#333' : '#CCC',
                  fontWeight: today || selected ? 600 : 400,
                  fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  if (inMonth && !selected) e.currentTarget.style.background = 'rgba(0,122,255,0.06)'
                }}
                onMouseLeave={e => {
                  if (inMonth && !selected) e.currentTarget.style.background = today ? 'rgba(0,122,255,0.08)' : 'transparent'
                }}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function DdlPickerApp() {
  const [currentDueDate, setCurrentDueDate] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [baseDate, setBaseDate] = useState<Date>(startOfMonth(new Date()))
  const [showCustom, setShowCustom] = useState(false)
  const [customHour, setCustomHour] = useState('18')
  const [customMinute, setCustomMinute] = useState('00')

  // 接收 init
  useEffect(() => {
    const handler = (dueDate: number | null) => {
      setCurrentDueDate(dueDate)
      if (dueDate) {
        setSelectedDate(startOfDay(new Date(dueDate)))
        setBaseDate(startOfMonth(new Date(dueDate)))
      }
    }
    window.electronAPI?.on('ddl:init', handler)
    return () => window.electronAPI?.off('ddl:init', handler)
  }, [])

  const handleSelect = useCallback((ts: number) => {
    window.electronAPI?.ddlPicker.select(ts)
  }, [])

  const handleQuickTime = useCallback((hour: number, minute: number) => {
    const ts = setMinutes(setHours(startOfDay(selectedDate), hour), minute).getTime()
    if (ts > Date.now()) handleSelect(ts)
  }, [selectedDate, handleSelect])

  const handleToday18 = () => {
    handleSelect(setMinutes(setHours(startOfDay(new Date()), 18), 0).getTime())
  }

  const handleTomorrow9 = () => {
    const tomorrow = addDays(startOfDay(new Date()), 1)
    handleSelect(setMinutes(setHours(tomorrow, 9), 0).getTime())
  }

  const handleCustomConfirm = () => {
    const h = parseInt(customHour, 10) || 18
    const m = parseInt(customMinute, 10) || 0
    const ts = setMinutes(setHours(startOfDay(selectedDate), h), m).getTime()
    if (ts > Date.now()) handleSelect(ts)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        width: '100%', height: '100vh',
        background: 'white',
        padding: 16,
        fontFamily: '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        borderRadius: 12,
      }}
    >
      {/* 标题栏 (drag area) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>设置截止时间</span>
        <button
          onClick={() => window.electronAPI?.ddlPicker.close()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#8E8E93', padding: '2px 4px',
          }}
        >×</button>
      </div>

      {/* 日历 */}
      <CalendarMonth
        selectedDate={selectedDate}
        onSelectDate={d => { setSelectedDate(d); setShowCustom(false) }}
        baseDate={baseDate}
        onBaseDateChange={setBaseDate}
      />

      <div style={{ borderTop: '1px solid #F0F0F0', margin: '12px 0' }} />

      {/* 快捷时间 */}
      <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: 600 }}>
        选择时间
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {QUICK_TIMES.map(qt => (
          <button
            key={qt.label}
            onClick={() => handleQuickTime(qt.hour, qt.minute)}
            style={{
              padding: '5px 10px', borderRadius: 8,
              border: '1px solid #E5E5EA',
              background: '#F9F9F9',
              cursor: 'pointer', fontSize: 12, color: '#333',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EEF5FF'; e.currentTarget.style.borderColor = '#C3D9FF' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F9F9F9'; e.currentTarget.style.borderColor = '#E5E5EA' }}
          >
            {qt.label}
          </button>
        ))}
      </div>

      {/* 预设按钮 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button onClick={handleToday18} style={presetBtnStyle}>今天 18:00</button>
        <button onClick={handleTomorrow9} style={presetBtnStyle}>明天 09:00</button>
        <button onClick={() => setShowCustom(!showCustom)} style={{ ...presetBtnStyle, color: '#007AFF' }}>
          {showCustom ? '关闭' : '自定义'}
        </button>
      </div>

      {/* 自定义时间输入 */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 8 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F9F9F9', borderRadius: 8, padding: '8px 10px',
            }}>
              <span style={{ fontSize: 12, color: '#8E8E93', whiteSpace: 'nowrap' }}>
                {format(selectedDate, 'M月d日')}
              </span>
              <input
                type="number" min={0} max={23}
                value={customHour}
                onChange={e => setCustomHour(e.target.value)}
                style={{
                  width: 42, padding: '4px 6px', borderRadius: 6,
                  border: '1px solid #E5E5EA', fontSize: 13, textAlign: 'center',
                  background: 'white',
                }}
              />
              <span style={{ color: '#8E8E93' }}>:</span>
              <input
                type="number" min={0} max={59}
                value={customMinute}
                onChange={e => setCustomMinute(e.target.value)}
                style={{
                  width: 42, padding: '4px 6px', borderRadius: 6,
                  border: '1px solid #E5E5EA', fontSize: 13, textAlign: 'center',
                  background: 'white',
                }}
              />
              <button onClick={handleCustomConfirm} style={{
                padding: '5px 12px', borderRadius: 6,
                border: 'none', background: '#007AFF', color: 'white',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>确认</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移除 DDL */}
      {currentDueDate !== null && (
        <button
          onClick={() => window.electronAPI?.ddlPicker.select(null)}
          style={{
            width: '100%', padding: '10px 0', border: 'none',
            background: 'transparent', color: '#E53935',
            cursor: 'pointer', fontSize: 13,
            borderTop: '1px solid #F0F0F0', marginTop: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          移除截止时间
        </button>
      )}
    </motion.div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 20, color: '#8E8E93', padding: '4px 8px', borderRadius: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const presetBtnStyle: React.CSSProperties = {
  flex: 1, padding: '6px 6px', borderRadius: 8,
  border: '1px solid #E5E5EA', background: '#F9F9F9',
  cursor: 'pointer', fontSize: 12, color: '#333',
  transition: 'background 0.15s',
}
