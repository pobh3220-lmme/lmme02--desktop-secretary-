// ============================================================
// 全局数据模型 — 与 PRD 数据模型章节完全对齐
// ============================================================

export type Quadrant = 1 | 2 | 3 | 4
// 1 = 重要且紧急, 2 = 重要不紧急, 3 = 紧急不重要, 4 = 不重要不紧急

export type TodoStatus = 'active' | 'completed' | 'deleted'

export interface FileObj {
  path: string          // 文件绝对路径
  name: string          // 文件名（含扩展名）
  extension: string     // 文件扩展名
  lastModifiedAt: number // 文件最后修改时间（Unix ms）
}

export interface FolderObj {
  path: string   // 文件夹绝对路径
  name: string   // 文件夹名称
}

// Feature 7 — 子任务
export interface Subtask {
  id: string
  title: string
  completed: boolean
  dueDate: number | null
  linkedFiles: FileObj[]
  linkedFolders: FolderObj[]
  createdAt: number
}

export interface TodoItem {
  id: string                // UUID
  title: string             // 纯文本标题（去除快捷符号后）
  rawInput: string          // 用户原始输入（含 ! @ 符号）
  quadrant: Quadrant        // 所属象限
  status: TodoStatus        // active | completed | deleted
  dueDate: number | null    // 截止时间 Unix ms，null = 无 DDL
  // isOverdue: 只读计算字段，不持久化，运行时计算
  overdueSeverity: number   // 逾期小时数，0 = 未逾期
  linkedFiles: FileObj[]    // 关联文件列表
  linkedFolders: FolderObj[]// 关联文件夹列表
  matchedFilePath: string | null // 最近一次智能匹配成功的文件路径
  createdAt: number         // 创建时间 Unix ms
  completedAt: number | null// 完成时间
  lastOpenedAt: number | null// 最近打开关联内容的时间
  openCount: number         // 累计打开关联内容次数
  subtasks: Subtask[]       // 子任务列表
}

// 运行时扩展（不持久化）
export interface TodoItemRuntime extends TodoItem {
  isOverdue: boolean        // 实时计算：当前时间 > dueDate && status === 'active'
}

// Feature 8 — 排序模式
export type SortMode = 'default' | 'created-desc' | 'created-asc' | 'dueDate-asc' | 'dueDate-desc' | 'quadrant-1to4' | 'quadrant-4to1'

// 应用设置
export type PetCharacter = 'tangyuan' | 'cloud' | 'sprite'
export type PetPositionMode = 'fixed' | 'follow-mouse'

export interface AppSettings {
  petPosition: { x: number; y: number }
  petCharacter: PetCharacter
  petPositionMode: PetPositionMode
  panelSize: { width: number; height: number }
}

// 持久化数据根结构
export interface StoreData {
  version: number
  todos: TodoItem[]
}

// IPC 通道名称常量（主进程 ↔ 渲染进程）
export const IPC = {
  // 数据操作
  TODO_GET_ALL: 'todo:getAll',
  TODO_CREATE: 'todo:create',
  TODO_UPDATE: 'todo:update',
  TODO_DELETE: 'todo:delete',
  TODO_COMPLETE: 'todo:complete',

  // 子任务操作
  SUBTASK_ADD: 'subtask:add',
  SUBTASK_UPDATE: 'subtask:update',
  SUBTASK_DELETE: 'subtask:delete',
  SUBTASK_TOGGLE: 'subtask:toggle',

  // DDL 弹窗
  DDL_OPEN: 'ddl:open',
  DDL_CLOSE: 'ddl:close',
  DDL_SELECT: 'ddl:select',

  // 文件操作
  FILE_OPEN: 'file:open',
  FOLDER_OPEN: 'folder:open',
  FILE_SELECT: 'file:select',
  FOLDER_SELECT: 'folder:select',
  FILE_EXISTS: 'file:exists',
  SMART_MATCH: 'file:smartMatch',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // 窗口/宠物
  PET_MOVE: 'pet:move',
  PET_POSITION_GET: 'pet:positionGet',
  PET_MOUSE_ENABLE: 'pet:mouseEnable',
  PANEL_SHOW: 'panel:show',
  PANEL_HIDE: 'panel:hide',
  PANEL_CLOSE_BY_USER: 'panel:closeByUser',
  PANEL_PIN: 'panel:pin',
  PANEL_UNPIN: 'panel:unpin',
  PANEL_MOVE: 'panel:move',
  PANEL_RESIZE: 'panel:resize',
} as const
