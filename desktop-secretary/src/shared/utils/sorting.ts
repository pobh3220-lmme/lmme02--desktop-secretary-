import type { TodoItem, TodoItemRuntime, SortMode } from '../types/index'

// ============================================================
// 待办排序逻辑
// ============================================================

// Task 11.1 — recencyBonus 指数衰减，半衰期约1天（86400000ms）
const HALF_LIFE_MS = 86_400_000

export function recencyBonus(lastOpenedAt: number | null): number {
  if (lastOpenedAt === null) return 0
  const elapsed = Date.now() - lastOpenedAt
  if (elapsed <= 0) return 1
  return Math.exp((-elapsed * Math.LN2) / HALF_LIFE_MS)
}

// Task 11.2 — quadrantWeight 映射
const QUADRANT_WEIGHT: Record<1 | 2 | 3 | 4, number> = { 1: 4, 2: 3, 3: 2, 4: 1 }

// Task 11.2 — Score 公式
export function calcScore(todo: TodoItem): number {
  const qw = QUADRANT_WEIGHT[todo.quadrant]
  const rb = recencyBonus(todo.lastOpenedAt)
  return todo.openCount * 0.6 + qw * 0.2 + rb * 0.2
}

// Task 11.3 — 常规区降序排列
export function sortRegular(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => calcScore(b) - calcScore(a))
}

// Task 11.4 — 置顶区排序：逾期项置顶 → 按 dueDate 升序
export function sortPinned(todos: TodoItemRuntime[]): TodoItemRuntime[] {
  return [...todos].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return (a.dueDate ?? 0) - (b.dueDate ?? 0)
  })
}

// 将 TodoItem 转为运行时对象（计算 isOverdue）
export function toRuntime(todo: TodoItem): TodoItemRuntime {
  const now = Date.now()
  const isOverdue =
    todo.status === 'active' && todo.dueDate !== null && todo.dueDate < now
  return { ...todo, isOverdue }
}

// 将所有活跃待办分为置顶区 / 常规区
const PINNED_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24小时

export function partitionTodos(todos: TodoItem[]): {
  pinned: TodoItemRuntime[]
  regular: TodoItemRuntime[]
} {
  const now = Date.now()
  const pinned: TodoItemRuntime[] = []
  const regular: TodoItemRuntime[] = []

  todos
    .filter(t => t.status === 'active')
    .forEach(t => {
      const rt = toRuntime(t)
      const isPinned =
        t.dueDate !== null && (rt.isOverdue || t.dueDate - now <= PINNED_THRESHOLD_MS)
      if (isPinned) {
        pinned.push(rt)
      } else {
        regular.push(rt)
      }
    })

  return {
    pinned: sortPinned(pinned),
    regular: sortRegular(regular) as TodoItemRuntime[],
  }
}

// Feature 8 — 用户自定义排序
export function sortTodos(todos: TodoItemRuntime[], mode: SortMode): TodoItemRuntime[] {
  const list = [...todos]
  switch (mode) {
    case 'default':
      return list
    case 'created-desc':
      return list.sort((a, b) => b.createdAt - a.createdAt)
    case 'created-asc':
      return list.sort((a, b) => a.createdAt - b.createdAt)
    case 'dueDate-asc': {
      // null DDL 排到最后
      return list.sort((a, b) => {
        if (a.dueDate === null && b.dueDate === null) return 0
        if (a.dueDate === null) return 1
        if (b.dueDate === null) return -1
        return a.dueDate - b.dueDate
      })
    }
    case 'dueDate-desc': {
      return list.sort((a, b) => {
        if (a.dueDate === null && b.dueDate === null) return 0
        if (a.dueDate === null) return 1
        if (b.dueDate === null) return -1
        return b.dueDate - a.dueDate
      })
    }
    case 'quadrant-1to4':
      return list.sort((a, b) => a.quadrant - b.quadrant)
    case 'quadrant-4to1':
      return list.sort((a, b) => b.quadrant - a.quadrant)
    default:
      return list
  }
}

export const SORT_LABELS: Record<SortMode, string> = {
  'default': '默认排序',
  'created-desc': '最新创建',
  'created-asc': '最早创建',
  'dueDate-asc': '截止时间 ↑',
  'dueDate-desc': '截止时间 ↓',
  'quadrant-1to4': '象限 Q1→Q4',
  'quadrant-4to1': '象限 Q4→Q1',
}
