import { format, isToday, isTomorrow, startOfDay, addDays, nextFriday, isFriday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ============================================================
// DDL 工具函数
// ============================================================

// Task 6.3 / 8.7 — 人性化时间显示
export function formatDueDate(dueDate: number): string {
  const d = new Date(dueDate)
  const timeStr = format(d, 'HH:mm')
  if (isToday(d)) return `今天 ${timeStr}`
  if (isTomorrow(d)) return `明天 ${timeStr}`
  return format(d, 'M月d日 HH:mm', { locale: zhCN })
}

// Task 8.2 — 今天18:00
export function todayAt18(): number {
  const d = startOfDay(new Date())
  d.setHours(18, 0, 0, 0)
  return d.getTime()
}

// Task 8.3 — 明天09:00
export function tomorrowAt9(): number {
  const d = addDays(startOfDay(new Date()), 1)
  d.setHours(9, 0, 0, 0)
  return d.getTime()
}

// Task 8.4 — 本周五17:00（若今天是周五则取下周五）
export function thisFridayAt17(): number {
  const today = new Date()
  let friday: Date
  if (isFriday(today)) {
    friday = addDays(today, 7)
  } else {
    friday = nextFriday(today)
  }
  friday = startOfDay(friday)
  friday.setHours(17, 0, 0, 0)
  return friday.getTime()
}

// Task 8.7 — isOverdue 实时计算
export function calcIsOverdue(dueDate: number | null, status: string): boolean {
  if (status !== 'active' || dueDate === null) return false
  return Date.now() > dueDate
}

// DDL 是否在24小时内
export function isDueWithin24h(dueDate: number | null): boolean {
  if (dueDate === null) return false
  const diff = dueDate - Date.now()
  return diff > 0 && diff <= 24 * 60 * 60 * 1000
}

// DDL 是否在60分钟内（濒临逾期）
export function isDueWithin60min(dueDate: number | null): boolean {
  if (dueDate === null) return false
  const diff = dueDate - Date.now()
  return diff > 0 && diff <= 60 * 60 * 1000
}
