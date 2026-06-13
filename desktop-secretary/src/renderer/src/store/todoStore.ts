import { create } from 'zustand'
import { partitionTodos, toRuntime } from '../../../shared/utils/sorting'
import type { TodoItem, TodoItemRuntime, Quadrant, Subtask } from '../../../shared/types/index'

// ============================================================
// Todo Store — Zustand 全局状态管理
// ============================================================

interface TodoStore {
  todos: TodoItem[]
  pinned: TodoItemRuntime[]
  regular: TodoItemRuntime[]
  completed: TodoItemRuntime[]

  // 加载
  loadAll: () => Promise<void>

  // CRUD
  createTodo: (title: string, rawInput: string, quadrant: Quadrant) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  completeTodo: (id: string, keepLinks: boolean) => Promise<void>
  reactivateTodo: (id: string) => Promise<void>

  // DDL
  setDueDate: (id: string, dueDate: number | null) => Promise<void>

  // 文件关联
  addFile: (todoId: string, file: import('../../../shared/types/index').FileObj) => Promise<void>
  removeFile: (todoId: string, filePath: string) => Promise<void>
  addFolder: (todoId: string, folder: import('../../../shared/types/index').FolderObj) => Promise<void>
  removeFolder: (todoId: string, folderPath: string) => Promise<void>

  // 子任务 (Feature 7)
  addSubtask: (todoId: string, title: string) => Promise<void>
  toggleSubtask: (todoId: string, subtaskId: string) => Promise<void>
  deleteSubtask: (todoId: string, subtaskId: string) => Promise<void>
  setSubtaskDueDate: (todoId: string, subtaskId: string, dueDate: number | null) => Promise<void>
  addSubtaskFile: (todoId: string, subtaskId: string, file: import('../../../shared/types/index').FileObj) => Promise<void>
  removeSubtaskFile: (todoId: string, subtaskId: string, filePath: string) => Promise<void>

  // 打开关联内容
  openTodo: (id: string) => Promise<void>

  // 刷新逾期状态（每分钟调用）
  refreshOverdue: () => void
}

function repartition(todos: TodoItem[]) {
  const { pinned, regular } = partitionTodos(todos)
  const completed = todos
    .filter(t => t.status === 'completed')
    .map(toRuntime)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return { pinned, regular, completed }
}

const api = () => window.electronAPI

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  pinned: [],
  regular: [],
  completed: [],

  loadAll: async () => {
    const todos = await api().todo.getAll()
    set({ todos, ...repartition(todos) })
  },

  createTodo: async (title, rawInput, quadrant) => {
    const newTodo = await api().todo.create({ title, rawInput, quadrant })
    const todos = [...get().todos, newTodo]
    set({ todos, ...repartition(todos) })
  },

  deleteTodo: async id => {
    await api().todo.delete(id)
    const todos = get().todos.filter(t => t.id !== id)
    set({ todos, ...repartition(todos) })
  },

  completeTodo: async (id, keepLinks) => {
    const updated = await api().todo.complete(id, keepLinks)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === id ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  reactivateTodo: async id => {
    const updated = await api().todo.reactivate(id)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === id ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  setDueDate: async (id, dueDate) => {
    const updated = await api().todo.setDueDate(id, dueDate)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === id ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  addFile: async (todoId, file) => {
    const updated = await api().file.addToTodo(todoId, file)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === todoId ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  removeFile: async (todoId, filePath) => {
    const updated = await api().file.removeFromTodo(todoId, filePath)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === todoId ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  addFolder: async (todoId, folder) => {
    const updated = await api().folder.addToTodo(todoId, folder)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === todoId ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  removeFolder: async (todoId, folderPath) => {
    const updated = await api().folder.removeFromTodo(todoId, folderPath)
    if (!updated) return
    const todos = get().todos.map(t => (t.id === todoId ? updated : t))
    set({ todos, ...repartition(todos) })
  },

  // ── 子任务 ────────────────────────────────────────────

  addSubtask: async (todoId, title) => {
    const st = await api().subtask.add(todoId, title)
    if (!st) return
    // 重新加载该 todo 以获取完整 subtasks
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  toggleSubtask: async (todoId, subtaskId) => {
    const st = await api().subtask.toggle(todoId, subtaskId)
    if (!st) return
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  deleteSubtask: async (todoId, subtaskId) => {
    await api().subtask.delete(todoId, subtaskId)
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  setSubtaskDueDate: async (todoId, subtaskId, dueDate) => {
    await api().subtask.update(todoId, subtaskId, { dueDate } as Partial<Subtask>)
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  addSubtaskFile: async (todoId, subtaskId, file) => {
    const todo = get().todos.find(t => t.id === todoId)
    const subtask = todo?.subtasks.find(s => s.id === subtaskId)
    if (!subtask) return
    if (subtask.linkedFiles.some(f => f.path === file.path)) return
    await api().subtask.update(todoId, subtaskId, {
      linkedFiles: [...subtask.linkedFiles, file],
    } as Partial<Subtask>)
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  removeSubtaskFile: async (todoId, subtaskId, filePath) => {
    const todo = get().todos.find(t => t.id === todoId)
    const subtask = todo?.subtasks.find(s => s.id === subtaskId)
    if (!subtask) return
    await api().subtask.update(todoId, subtaskId, {
      linkedFiles: subtask.linkedFiles.filter(f => f.path !== filePath),
    } as Partial<Subtask>)
    const all = await api().todo.getAll()
    set({ todos: all, ...repartition(all) })
  },

  openTodo: async id => {
    const todo = get().todos.find(t => t.id === id)
    if (!todo) return

    const folderPaths = todo.linkedFolders.map(f => f.path)
    let matchedFilePath: string | undefined

    if (folderPaths.length > 0) {
      const result = await api().file.smartMatch(todo.title, folderPaths)
      if (result) {
        matchedFilePath = result.filePath
        await api().file.open(result.filePath)
      }
      for (const fp of folderPaths) {
        await api().folder.open(fp)
      }
    }

    if (folderPaths.length === 0 && todo.linkedFiles.length > 0) {
      await api().file.open(todo.linkedFiles[0].path)
    }

    const updated = await api().todo.recordOpen(id, matchedFilePath)
    if (updated) {
      const todos = get().todos.map(t => (t.id === id ? updated : t))
      set({ todos, ...repartition(todos) })
    }
  },

  refreshOverdue: () => {
    const { todos } = get()
    set(repartition(todos))
  },
}))
