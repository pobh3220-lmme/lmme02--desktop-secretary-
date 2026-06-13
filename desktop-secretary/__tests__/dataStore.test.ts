/**
 * DataStore 单元测试
 * Task 2.8 — CRUD、逾期计算、损坏恢复
 */

// 由于 DataStore 依赖 Electron app.getPath，在 Jest 中 mock

jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-desktop-secretary',
    isPackaged: false,
  },
}))

jest.mock('fs', () => {
  const actual = jest.requireActual('fs')
  return {
    ...actual,
    // 使用内存文件系统模拟，简化测试
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    copyFileSync: jest.fn(),
  }
})

import { DataStore } from '../src/main/store/DataStore'

describe('DataStore', () => {
  let store: DataStore

  beforeEach(() => {
    // 重置 mock
    jest.clearAllMocks()
    const fs = require('fs')
    fs.existsSync.mockReturnValue(false)
    store = new DataStore()
    store.init()
  })

  // ── CRUD ──────────────────────────────────────────────────

  test('create: 创建待办后可通过 getAll 获取', () => {
    const todo = store.create({ title: '测试任务', rawInput: '测试任务', quadrant: 1 })
    expect(todo.id).toBeTruthy()
    expect(todo.title).toBe('测试任务')
    expect(todo.quadrant).toBe(1)
    expect(todo.status).toBe('active')
    expect(todo.openCount).toBe(0)
    const all = store.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(todo.id)
  })

  test('create: 创建多个待办', () => {
    store.create({ title: '任务A', rawInput: '任务A', quadrant: 1 })
    store.create({ title: '任务B', rawInput: '任务B', quadrant: 2 })
    store.create({ title: '任务C', rawInput: '任务C', quadrant: 4 })
    expect(store.getAll()).toHaveLength(3)
  })

  test('delete: 删除后 getAll 不再返回该项', () => {
    const todo = store.create({ title: '待删除', rawInput: '待删除', quadrant: 1 })
    expect(store.getAll()).toHaveLength(1)
    store.delete(todo.id)
    expect(store.getAll()).toHaveLength(0)
  })

  test('delete: 删除不存在的ID返回false', () => {
    const result = store.delete('nonexistent-id')
    expect(result).toBe(false)
  })

  test('complete: 完成后状态变为 completed', () => {
    const todo = store.create({ title: '测试完成', rawInput: '测试完成', quadrant: 2 })
    const completed = store.complete(todo.id, true)
    expect(completed?.status).toBe('completed')
    expect(completed?.completedAt).toBeTruthy()
  })

  test('complete: 解除关联时清空文件记录', () => {
    const todo = store.create({ title: '有关联', rawInput: '有关联', quadrant: 1 })
    store.addFile(todo.id, { path: '/test/file.pdf', name: 'file.pdf', extension: 'pdf', lastModifiedAt: Date.now() })
    const completed = store.complete(todo.id, false) // keepLinks = false
    expect(completed?.linkedFiles).toHaveLength(0)
  })

  test('complete: 保留关联时保留文件记录', () => {
    const todo = store.create({ title: '有关联', rawInput: '有关联', quadrant: 1 })
    store.addFile(todo.id, { path: '/test/file.pdf', name: 'file.pdf', extension: 'pdf', lastModifiedAt: Date.now() })
    const completed = store.complete(todo.id, true) // keepLinks = true
    expect(completed?.linkedFiles).toHaveLength(1)
  })

  // ── 文件关联 ──────────────────────────────────────────────

  test('addFile / removeFile: 正常增删', () => {
    const todo = store.create({ title: '关联测试', rawInput: '关联测试', quadrant: 1 })
    store.addFile(todo.id, { path: '/a/b.docx', name: 'b.docx', extension: 'docx', lastModifiedAt: 0 })
    expect(store.getById(todo.id)?.linkedFiles).toHaveLength(1)
    store.removeFile(todo.id, '/a/b.docx')
    expect(store.getById(todo.id)?.linkedFiles).toHaveLength(0)
  })

  test('addFile: 重复添加同一路径不重复', () => {
    const todo = store.create({ title: '去重测试', rawInput: '去重测试', quadrant: 1 })
    const file = { path: '/a/b.docx', name: 'b.docx', extension: 'docx', lastModifiedAt: 0 }
    store.addFile(todo.id, file)
    store.addFile(todo.id, file)
    expect(store.getById(todo.id)?.linkedFiles).toHaveLength(1)
  })

  // ── DDL 和逾期计算 ────────────────────────────────────────

  test('setDueDate: 设置未来时间不触发逾期', () => {
    const todo = store.create({ title: 'DDL未来', rawInput: 'DDL未来', quadrant: 1 })
    const futureDate = Date.now() + 3_600_000 // 1小时后
    const updated = store.setDueDate(todo.id, futureDate)
    expect(updated?.dueDate).toBe(futureDate)
    expect(updated?.overdueSeverity).toBe(0)
  })

  test('setDueDate: 设置过去时间立即触发逾期', () => {
    const todo = store.create({ title: 'DDL过去', rawInput: 'DDL过去', quadrant: 1 })
    const pastDate = Date.now() - 3 * 3_600_000 // 3小时前
    const updated = store.setDueDate(todo.id, pastDate)
    expect(updated?.overdueSeverity).toBeGreaterThanOrEqual(2)
  })

  test('setDueDate: 移除DDL', () => {
    const todo = store.create({ title: '移除DDL', rawInput: '移除DDL', quadrant: 1 })
    store.setDueDate(todo.id, Date.now() - 1000)
    const updated = store.setDueDate(todo.id, null)
    expect(updated?.dueDate).toBeNull()
    expect(updated?.overdueSeverity).toBe(0)
  })

  // ── 统计记录 ──────────────────────────────────────────────

  test('recordOpen: openCount 累加', () => {
    const todo = store.create({ title: '打开测试', rawInput: '打开测试', quadrant: 1 })
    store.recordOpen(todo.id)
    store.recordOpen(todo.id)
    expect(store.getById(todo.id)?.openCount).toBe(2)
  })

  // ── 数据恢复 ──────────────────────────────────────────────

  test('损坏数据文件时初始化空数据', () => {
    const fs = require('fs')
    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue('{ invalid json %%%')

    const freshStore = new DataStore()
    freshStore.init()

    expect(freshStore.getAll()).toHaveLength(0)
    expect(fs.copyFileSync).toHaveBeenCalled() // 备份被调用
  })
})
