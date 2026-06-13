# Bug 修复计划 — 桌面小秘书

## Bug 1: 长按宠物左键导致面板距离变大

### 根因
`PetWindow.tsx:handleMouseDown` 在任意 mousedown 时就立即调用 `panel.hide()`，
松手后 `panel.show()` → `updatePanelPosition()` 重新计算位置。
在 Windows frameless 窗口上每次 show/hide 后 `getBounds()` 返回值可能略有偏差，
导致面板逐渐漂移。

### 修复
将「拖拽开始时隐藏面板」从 mousedown 改为真正的拖拽触发（鼠标移动 > 5px 阈值）：
- 移除 mousedown 里的 `panel.hide()` 调用
- 在 mousemove 里检测移动距离，超过阈值时才隐藏面板
- 长按/单击不会触发 hide/show 循环

---

## Bug 2: 面板不能自定义缩放尺寸

### 根因
frameless 窗口在 Windows 上没有原生的 resize handles，
即使 `resizable: true` 用户也无法拖拽缩放。

### 修复
在面板右下角添加自定义 resize handle（grip），通过 IPC 驱动窗口缩放：
- 渲染层：TodoPanel 右下角添加 grip 组件，mousedown → mousemove 计算新尺寸
- 主进程：新增 IPC `panel:resize` 处理
- 面板尺寸持久化到 AppSettings，下次启动恢复

---

## Bug 3: 侧边栏标签不能筛选待办事项

### 根因
- `TodoItem` 数据模型中没有 `category` 字段
- `TodoCard.tsx:getCategory()` 用 ID hash 随机分配分类，用户不可选择
- `TodoPanel.tsx:visibleTodos` 只按 status 筛选，未按 category 筛选

### 修复
- 更新 `TodoItem` 类型，添加 `category: string | null` 字段
- `TodoPanel.visibleTodos` 增加 category 筛选逻辑
- `TodoCard` 添加分类选择交互（点击分类色点弹出选择器）
- `DataStore` 支持 category 字段的读写持久化

---

## Bug 4: 面板钉住后不能直接拖动

### 根因
面板是 frameless 窗口，没有任何 drag 区域定义。
只能通过移动宠物间接触发面板跟随。

### 修复
- 面板顶部标题栏区域设置 `-webkit-app-region: drag`
- 新增 IPC `panel:move` 让主进程更新面板窗口位置
- 钉住时面板位置独立追踪（含偏移量），取消钉住时恢复跟随

---

## Bug 5: 悬浮面板无法直接操作

### 根因
当鼠标从宠物移到面板上时，宠物窗口的 `mouseleave` 触发 500ms 后隐藏面板，
面板还没来得及被用户操作就被隐藏了。

### 修复
面板和宠物之间建立「鼠标交接」机制：
- 面板窗口检测 mouseenter/mouseleave，通过 IPC 通知主进程
- 主进程：收到 panel mouseenter → 取消隐藏计时器，收到 panel mouseleave → 启动短期隐藏计时器
- 宠物窗口：mouseenter → 取消面板隐藏计时器并显示面板
- 整体实现「鼠标在宠物或面板任意一个上时面板保持显示」

---

## 涉及文件
| 文件 | Bug 1 | Bug 2 | Bug 3 | Bug 4 | Bug 5 |
|------|-------|-------|-------|-------|-------|
| src/main/index.ts | | ✏️ | | ✏️ | ✏️ |
| src/shared/types/index.ts | | ✏️ | ✏️ | | |
| src/preload/index.ts | | ✏️ | | ✏️ | ✏️ |
| src/renderer/src/components/pet/PetWindow.tsx | ✏️ | | | | ✏️ |
| src/renderer/src/components/panel/TodoPanel.tsx | | ✏️ | ✏️ | ✏️ | ✏️ |
| src/renderer/src/components/panel/Sidebar.tsx | | | ✏️ | | |
| src/renderer/src/components/todo/TodoCard.tsx | | | ✏️ | | |
| src/renderer/src/store/todoStore.ts | | | ✏️ | | |
| src/main/store/DataStore.ts | | | ✏️ | | |
| src/main/store/SettingsStore.ts | | ✏️ | | | |

## 预计工时
- Bug 1: ~30 分钟
- Bug 2: ~1 小时
- Bug 3: ~1.5 小时
- Bug 4: ~45 分钟
- Bug 5: ~1 小时
