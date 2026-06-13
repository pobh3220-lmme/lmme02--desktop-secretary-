import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types/index'
import type { TodoItem, FileObj, FolderObj, AppSettings, Quadrant, Subtask } from '../shared/types/index'

// ============================================================
// Preload — 通过 contextBridge 向渲染进程暴露安全的 API
// ============================================================

const api = {
  // ── 数据操作 ──────────────────────────────────────────────
  todo: {
    getAll: (): Promise<TodoItem[]> => ipcRenderer.invoke(IPC.TODO_GET_ALL),
    create: (params: {
      title: string
      rawInput: string
      quadrant: Quadrant
    }): Promise<TodoItem> => ipcRenderer.invoke(IPC.TODO_CREATE, params),
    update: (id: string, patch: Partial<TodoItem>, immediate?: boolean): Promise<TodoItem | null> =>
      ipcRenderer.invoke(IPC.TODO_UPDATE, id, patch, immediate),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.TODO_DELETE, id),
    complete: (id: string, keepLinks: boolean): Promise<TodoItem | null> =>
      ipcRenderer.invoke(IPC.TODO_COMPLETE, id, keepLinks),
    reactivate: (id: string): Promise<TodoItem | null> =>
      ipcRenderer.invoke('todo:reactivate', id),
    setDueDate: (id: string, dueDate: number | null): Promise<TodoItem | null> =>
      ipcRenderer.invoke('todo:setDueDate', id, dueDate),
    recordOpen: (id: string, matchedFilePath?: string): Promise<TodoItem | null> =>
      ipcRenderer.invoke('todo:recordOpen', id, matchedFilePath),
  },

  // ── 子任务操作 ────────────────────────────────────────────
  subtask: {
    add: (todoId: string, title: string): Promise<Subtask | null> =>
      ipcRenderer.invoke(IPC.SUBTASK_ADD, todoId, title),
    update: (todoId: string, subtaskId: string, patch: Partial<Subtask>): Promise<Subtask | null> =>
      ipcRenderer.invoke(IPC.SUBTASK_UPDATE, todoId, subtaskId, patch),
    delete: (todoId: string, subtaskId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.SUBTASK_DELETE, todoId, subtaskId),
    toggle: (todoId: string, subtaskId: string): Promise<Subtask | null> =>
      ipcRenderer.invoke(IPC.SUBTASK_TOGGLE, todoId, subtaskId),
  },

  // ── DDL 弹窗 ──────────────────────────────────────────────
  ddlPicker: {
    open: (currentDueDate: number | null): Promise<void> =>
      ipcRenderer.invoke(IPC.DDL_OPEN, currentDueDate),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.DDL_CLOSE),
    select: (dueDate: number | null): Promise<void> => ipcRenderer.invoke(IPC.DDL_SELECT, dueDate),
  },

  // ── 文件操作 ──────────────────────────────────────────────
  file: {
    open: (filePath: string): Promise<void> => ipcRenderer.invoke(IPC.FILE_OPEN, filePath),
    exists: (filePath: string): Promise<boolean> => ipcRenderer.invoke(IPC.FILE_EXISTS, filePath),
    select: (): Promise<FileObj[]> => ipcRenderer.invoke(IPC.FILE_SELECT),
    addToTodo: (todoId: string, file: FileObj): Promise<TodoItem | null> =>
      ipcRenderer.invoke('file:addToTodo', todoId, file),
    removeFromTodo: (todoId: string, filePath: string): Promise<TodoItem | null> =>
      ipcRenderer.invoke('file:removeFromTodo', todoId, filePath),
    smartMatch: (title: string, folderPaths: string[]) =>
      ipcRenderer.invoke(IPC.SMART_MATCH, title, folderPaths),
  },

  // ── 文件夹操作 ────────────────────────────────────────────
  folder: {
    open: (folderPath: string): Promise<void> => ipcRenderer.invoke(IPC.FOLDER_OPEN, folderPath),
    select: (): Promise<FolderObj | null> => ipcRenderer.invoke(IPC.FOLDER_SELECT),
    addToTodo: (todoId: string, folder: FolderObj): Promise<TodoItem | null> =>
      ipcRenderer.invoke('folder:addToTodo', todoId, folder),
    removeFromTodo: (todoId: string, folderPath: string): Promise<TodoItem | null> =>
      ipcRenderer.invoke('folder:removeFromTodo', todoId, folderPath),
  },

  // ── 设置 ──────────────────────────────────────────────────
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, patch),
  },

  // ── 宠物/面板窗口控制 ─────────────────────────────────────
  pet: {
    move: (x: number, y: number): Promise<void> => ipcRenderer.invoke(IPC.PET_MOVE, x, y),
    getPosition: (): Promise<{ x: number; y: number }> => ipcRenderer.invoke(IPC.PET_POSITION_GET),
    setMouseEnabled: (enable: boolean): Promise<void> => ipcRenderer.invoke(IPC.PET_MOUSE_ENABLE, enable),
  },

  panel: {
    show: (): Promise<void> => ipcRenderer.invoke(IPC.PANEL_SHOW),
    hide: (): Promise<void> => ipcRenderer.invoke(IPC.PANEL_HIDE),
    closeByUser: (): Promise<void> => ipcRenderer.invoke(IPC.PANEL_CLOSE_BY_USER),
    pin: (): Promise<void> => ipcRenderer.invoke(IPC.PANEL_PIN),
    unpin: (): Promise<void> => ipcRenderer.invoke(IPC.PANEL_UNPIN),
    move: (x: number, y: number): Promise<void> => ipcRenderer.invoke(IPC.PANEL_MOVE, x, y),
    resize: (width: number, height: number): Promise<void> => ipcRenderer.invoke(IPC.PANEL_RESIZE, width, height),
    notifyMouseEnter: (): Promise<void> => ipcRenderer.invoke('panel:notifyMouseEnter'),
    notifyMouseLeave: (): Promise<void> => ipcRenderer.invoke('panel:notifyMouseLeave'),
  },

  // ── 事件监听 ──────────────────────────────────────────────
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'todo:overdueUpdate',
      'panel:pinChanged',
      'panel:mouseEnter',
      'panel:mouseLeave',
      'panel:pinState',
      'ddl:init',
      'ddl:selected',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
