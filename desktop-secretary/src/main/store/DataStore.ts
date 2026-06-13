import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { TodoItem, StoreData, FileObj, FolderObj, Quadrant, Subtask } from '../../shared/types/index'

const DATA_VERSION = 1
const APP_DATA_DIR = path.join(app.getPath('userData'), '..', 'DesktopSecretary')
const TODOS_FILE = path.join(APP_DATA_DIR, 'todos.json')

// ============================================================
// DataStore — 数据持久化层
// 设计：内存缓存 + debounce 写入 + 关键操作立即写入
// ============================================================
export class DataStore {
  private data: StoreData = { version: DATA_VERSION, todos: [] }
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly DEBOUNCE_MS = 500

  // ── 初始化 ──────────────────────────────────────────────

  init(): void {
    this.ensureDir()
    this.load()
    this.recalibrateOverdue()
  }

  private ensureDir(): void {
    if (!fs.existsSync(APP_DATA_DIR)) {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true })
    }
  }

  private load(): void {
    if (!fs.existsSync(TODOS_FILE)) {
      this.data = { version: DATA_VERSION, todos: [] }
      return
    }
    try {
      const raw = fs.readFileSync(TODOS_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as StoreData
      this.data = this.migrate(parsed)
    } catch (err) {
      console.error('[DataStore] Failed to parse todos.json, backing up:', err)
      const bakPath = TODOS_FILE + '.bak'
      try {
        fs.copyFileSync(TODOS_FILE, bakPath)
      } catch {
        // ignore backup failure
      }
      this.data = { version: DATA_VERSION, todos: [] }
    }
  }

  private migrate(data: Partial<StoreData>): StoreData {
    const defaults = {
      openCount: 0,
      overdueSeverity: 0,
      linkedFiles: [] as FileObj[],
      linkedFolders: [] as FolderObj[],
      matchedFilePath: null as string | null,
      completedAt: null as number | null,
      lastOpenedAt: null as number | null,
      dueDate: null as number | null,
      subtasks: [] as Subtask[],
    }
    const todos = (data.todos ?? []).map(todo => Object.assign({}, defaults, todo))
    return { version: DATA_VERSION, todos: todos as TodoItem[] }
  }

  private recalibrateOverdue(): void {
    const now = Date.now()
    let changed = false
    this.data.todos.forEach(todo => {
      if (todo.status === 'active' && todo.dueDate !== null) {
        const severity = todo.dueDate < now ? Math.floor((now - todo.dueDate) / 3_600_000) : 0
        if (todo.overdueSeverity !== severity) {
          todo.overdueSeverity = severity
          changed = true
        }
      }
    })
    if (changed) this.flushImmediate()
  }

  // ── 写入 ────────────────────────────────────────────────

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => this.flushImmediate(), this.DEBOUNCE_MS)
  }

  flushImmediate(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    try {
      fs.writeFileSync(TODOS_FILE, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[DataStore] Write failed:', err)
    }
  }

  // ── CRUD ────────────────────────────────────────────────

  getAll(): TodoItem[] {
    return this.data.todos.filter(t => t.status !== 'deleted')
  }

  getById(id: string): TodoItem | undefined {
    return this.data.todos.find(t => t.id === id)
  }

  create(params: {
    title: string
    rawInput: string
    quadrant: Quadrant
  }): TodoItem {
    const todo: TodoItem = {
      id: uuidv4(),
      title: params.title,
      rawInput: params.rawInput,
      quadrant: params.quadrant,
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
      subtasks: [],
    }
    this.data.todos.push(todo)
    this.flushImmediate()
    return todo
  }

  update(id: string, patch: Partial<TodoItem>, immediate = false): TodoItem | null {
    const idx = this.data.todos.findIndex(t => t.id === id)
    if (idx === -1) return null
    this.data.todos[idx] = { ...this.data.todos[idx], ...patch }
    if (immediate) {
      this.flushImmediate()
    } else {
      this.scheduleFlush()
    }
    return this.data.todos[idx]
  }

  complete(id: string, keepLinks: boolean): TodoItem | null {
    const patch: Partial<TodoItem> = {
      status: 'completed',
      completedAt: Date.now(),
    }
    if (!keepLinks) {
      patch.linkedFiles = []
      patch.linkedFolders = []
    }
    return this.update(id, patch, true)
  }

  delete(id: string): boolean {
    const idx = this.data.todos.findIndex(t => t.id === id)
    if (idx === -1) return false
    this.data.todos.splice(idx, 1)
    this.flushImmediate()
    return true
  }

  reactivate(id: string): TodoItem | null {
    return this.update(id, {
      status: 'active',
      completedAt: null,
      linkedFiles: [],
      linkedFolders: [],
    }, true)
  }

  // ── 子任务 (Feature 7) ────────────────────────────────

  addSubtask(todoId: string, title: string): Subtask | null {
    const todo = this.getById(todoId)
    if (!todo) return null
    const subtask: Subtask = {
      id: uuidv4(),
      title,
      completed: false,
      dueDate: null,
      linkedFiles: [],
      linkedFolders: [],
      createdAt: Date.now(),
    }
    todo.subtasks.push(subtask)
    this.flushImmediate()
    return subtask
  }

  updateSubtask(todoId: string, subtaskId: string, patch: Partial<Subtask>): Subtask | null {
    const todo = this.getById(todoId)
    if (!todo) return null
    const si = todo.subtasks.findIndex(s => s.id === subtaskId)
    if (si === -1) return null
    todo.subtasks[si] = { ...todo.subtasks[si], ...patch }
    this.flushImmediate()
    return todo.subtasks[si]
  }

  deleteSubtask(todoId: string, subtaskId: string): boolean {
    const todo = this.getById(todoId)
    if (!todo) return false
    const si = todo.subtasks.findIndex(s => s.id === subtaskId)
    if (si === -1) return false
    todo.subtasks.splice(si, 1)
    this.flushImmediate()
    return true
  }

  toggleSubtask(todoId: string, subtaskId: string): Subtask | null {
    const todo = this.getById(todoId)
    if (!todo) return null
    const st = todo.subtasks.find(s => s.id === subtaskId)
    if (!st) return null
    return this.updateSubtask(todoId, subtaskId, { completed: !st.completed })
  }

  // ── 文件关联 ────────────────────────────────────────────

  addFile(id: string, file: FileObj): TodoItem | null {
    const todo = this.getById(id)
    if (!todo) return null
    const already = todo.linkedFiles.some(f => f.path === file.path)
    if (already) return todo
    return this.update(id, { linkedFiles: [...todo.linkedFiles, file] }, true)
  }

  removeFile(id: string, filePath: string): TodoItem | null {
    const todo = this.getById(id)
    if (!todo) return null
    return this.update(id, {
      linkedFiles: todo.linkedFiles.filter(f => f.path !== filePath)
    }, true)
  }

  addFolder(id: string, folder: FolderObj): TodoItem | null {
    const todo = this.getById(id)
    if (!todo) return null
    const already = todo.linkedFolders.some(f => f.path === folder.path)
    if (already) return todo
    return this.update(id, { linkedFolders: [...todo.linkedFolders, folder] }, true)
  }

  removeFolder(id: string, folderPath: string): TodoItem | null {
    const todo = this.getById(id)
    if (!todo) return null
    return this.update(id, {
      linkedFolders: todo.linkedFolders.filter(f => f.path !== folderPath)
    }, true)
  }

  // ── DDL ─────────────────────────────────────────────────

  setDueDate(id: string, dueDate: number | null): TodoItem | null {
    const now = Date.now()
    const overdueSeverity =
      dueDate !== null && dueDate < now ? Math.floor((now - dueDate) / 3_600_000) : 0
    return this.update(id, { dueDate, overdueSeverity }, true)
  }

  // ── 打开关联内容 ──────────────────────────────────────

  recordOpen(id: string, matchedFilePath?: string): TodoItem | null {
    const todo = this.getById(id)
    if (!todo) return null
    return this.update(id, {
      openCount: todo.openCount + 1,
      lastOpenedAt: Date.now(),
      ...(matchedFilePath ? { matchedFilePath } : {}),
    })
  }

  // ── 逾期定时更新 ──────────────────────────────────────

  tickOverdue(): void {
    const now = Date.now()
    let changed = false
    this.data.todos.forEach(todo => {
      if (todo.status !== 'active') return
      if (todo.dueDate === null) return
      const newSeverity = todo.dueDate < now ? Math.floor((now - todo.dueDate) / 3_600_000) : 0
      if (newSeverity !== todo.overdueSeverity) {
        todo.overdueSeverity = newSeverity
        changed = true
      }
    })
    if (changed) this.scheduleFlush()
  }

  static getAppDataDir(): string {
    return APP_DATA_DIR
  }
}

// 单例
export const dataStore = new DataStore()
