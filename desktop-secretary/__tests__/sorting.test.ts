/**
 * 排序逻辑单元测试
 */

import { calcScore, recencyBonus, partitionTodos, sortPinned } from '../src/shared/utils/sorting'
import type { TodoItem, TodoItemRuntime } from '../src/shared/types/index'

const baseTodo: TodoItem = {
  id: '1',
  title: '测试',
  rawInput: '测试',
  quadrant: 1,
  status: 'active',
  dueDate: null,
  overdueSeverity: 0,
  linkedFiles: [],
  linkedFolders: [],
  matchedFilePath: null,
  createdAt: Date.now(),
  completedAt: null,
  lastOpenedAt: null,
  openCount: 0,
}

describe('recencyBonus', () => {
  test('null 时返回 0', () => {
    expect(recencyBonus(null)).toBe(0)
  })

  test('刚操作时接近 1', () => {
    const bonus = recencyBonus(Date.now() - 1000)
    expect(bonus).toBeGreaterThan(0.99)
  })

  test('1天前操作时约等于 0.5', () => {
    const bonus = recencyBonus(Date.now() - 86_400_000)
    expect(bonus).toBeCloseTo(0.5, 1)
  })
})

describe('calcScore', () => {
  test('象限1比象限4分高（其他条件相同）', () => {
    const q1 = { ...baseTodo, quadrant: 1 as const }
    const q4 = { ...baseTodo, quadrant: 4 as const }
    expect(calcScore(q1)).toBeGreaterThan(calcScore(q4))
  })

  test('openCount 越高分数越高', () => {
    const lo = { ...baseTodo, openCount: 0 }
    const hi = { ...baseTodo, openCount: 10 }
    expect(calcScore(hi)).toBeGreaterThan(calcScore(lo))
  })
})

describe('partitionTodos', () => {
  test('无 DDL 的待办进入常规区', () => {
    const todos: TodoItem[] = [{ ...baseTodo, dueDate: null }]
    const { pinned, regular } = partitionTodos(todos)
    expect(pinned).toHaveLength(0)
    expect(regular).toHaveLength(1)
  })

  test('逾期的待办进入置顶区', () => {
    const todos: TodoItem[] = [{ ...baseTodo, dueDate: Date.now() - 3600_000 }]
    const { pinned } = partitionTodos(todos)
    expect(pinned).toHaveLength(1)
    expect(pinned[0].isOverdue).toBe(true)
  })

  test('24小时内到期的进入置顶区', () => {
    const todos: TodoItem[] = [{ ...baseTodo, dueDate: Date.now() + 3600_000 }]
    const { pinned } = partitionTodos(todos)
    expect(pinned).toHaveLength(1)
  })

  test('25小时后到期的进入常规区', () => {
    const todos: TodoItem[] = [{ ...baseTodo, dueDate: Date.now() + 25 * 3600_000 }]
    const { regular } = partitionTodos(todos)
    expect(regular).toHaveLength(1)
  })
})

describe('sortPinned', () => {
  test('逾期项排在临近到期项之前', () => {
    const overdue: TodoItemRuntime = {
      ...baseTodo, id: 'a',
      dueDate: Date.now() - 1000, isOverdue: true, overdueSeverity: 1
    }
    const near: TodoItemRuntime = {
      ...baseTodo, id: 'b',
      dueDate: Date.now() + 3600_000, isOverdue: false
    }
    const sorted = sortPinned([near, overdue])
    expect(sorted[0].id).toBe('a') // 逾期的在前
  })
})
