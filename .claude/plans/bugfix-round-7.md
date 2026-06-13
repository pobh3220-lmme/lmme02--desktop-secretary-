# 修复计划 — 第7轮

## 1. Bug 6: DDL 日历面板显示不全

### 根因
DdlPicker 内嵌在面板 WebContents 内，面板最小 280×200 时放不下日历控件
(300px 宽 + 快捷按钮)，被面板 overflow: hidden 裁剪。

### 方案：独立弹出窗口
新建一个小的 BrowserWindow 作为 DDL 选择弹窗，独立于面板尺寸。

### 流程
```
点击日历图标 → IPC ddl:open → 主进程创建/显示小窗口
→ 用户选择日期 → IPC ddl:select → 主进程转发给面板
→ 面板收到 selected date → 调用 setDueDate
```

### 实现
1. electron.vite.config.ts — 新增 ddlPicker 入口
2. 新建 src/renderer/ddl-picker.html + src/renderer/src/DdlPickerApp.tsx
3. shared/types/index.ts — 新增 IPC `DDL_OPEN`, `DDL_CLOSE`, `DDL_SELECT`
4. main/index.ts — 新增 ddlPickerWindow，IPC handlers
5. preload/index.ts — 新增 ddlPicker API + 监听 ddl:selected 事件
6. TodoCard.tsx — 移除内嵌 `<DdlPicker>`，改用 `api.ddlPicker.open()`
7. DdlPicker.tsx — 保持日历组件逻辑，挂载到独立窗口

---

## 2. Feature 7: 子待办事项展开

### 数据模型
```ts
interface Subtask {
  id: string
  title: string
  completed: boolean
  dueDate: number | null
  linkedFiles: FileObj[]
  linkedFolders: FolderObj[]
  createdAt: number
}
TodoItem 新增 subtasks: Subtask[]
```

子任务有独立的 DDL、文件/文件夹关联。

### 实现
1. shared/types/index.ts — 新增 Subtask 接口、TodoItem.subtasks、IPC 通道
2. main/store/DataStore.ts — migrate 补充 subtasks: []，新增 CRUD 方法
3. main/index.ts — 新增 subtask IPC handlers
4. preload/index.ts — 新增 subtask API
5. todoStore.ts — 新增 subtask 操作 actions
6. TodoCard.tsx — 展开显示子任务列表 + 添加子任务输入框 + 新组件 SubtaskItem

---

## 3. Feature 8: 排序功能

### 需求
输入框旁边增加排序按钮，支持：
- **按时间排序**: 最近创建 / 最近修改 / 截止时间 升序/降序
- **按四象限排序**: Q1→Q2→Q3→Q4 或 Q4→Q3→Q2→Q1

### 实现
1. TodoPanel.tsx — TodoInputBar 右侧添加排序下拉按钮
2. visibleTodos 增加排序逻辑（Memo 中追加 sort）
3. sorting.ts — 新增 `sortByDate(sortOrder)`, `sortByQuadrant(sortOrder)` 等纯函数
4. 新增 SortDropdown 组件（简单下拉菜单）

### 排序选项
```ts
type SortMode = 'default' | 'created-desc' | 'created-asc' | 'dueDate-asc' | 'dueDate-desc' | 'quadrant-1to4' | 'quadrant-4to1'
```

默认排序：保留现有 `partitionTodos` 逻辑（置顶区在前，常规区按 score）

---

## 涉及文件总览
| 文件 | Bug 6 | Feature 7 | Feature 8 |
|------|-------|-----------|-----------|
| shared/types/index.ts | ✏️ | ✏️ | ✏️ |
| shared/utils/sorting.ts | | | ✏️ |
| main/index.ts | ✏️ | ✏️ | |
| main/store/DataStore.ts | | ✏️ | |
| preload/index.ts | ✏️ | ✏️ | |
| electron.vite.config.ts | ✏️ | | |
| src/renderer/ddl-picker.html | 新建 | | |
| src/renderer/src/DdlPickerApp.tsx | 新建 | | |
| src/renderer/src/components/todo/DdlPicker.tsx | ✏️ | | |
| src/renderer/src/components/todo/TodoCard.tsx | ✏️ | ✏️ | |
| src/renderer/src/components/panel/TodoPanel.tsx | | | ✏️ |
| src/renderer/src/store/todoStore.ts | | ✏️ | |

### 预估
- Bug 6: ~1.5h
- Feature 7: ~2h
- Feature 8: ~0.5h
