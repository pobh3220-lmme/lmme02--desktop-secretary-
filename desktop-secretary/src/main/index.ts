import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
  shell,
  dialog,
} from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { dataStore } from './store/DataStore'
import { settingsStore } from './store/SettingsStore'
import { smartMatch } from '../shared/utils/smartMatch'
import { IPC } from '../shared/types/index'
import type { FileObj, FolderObj } from '../shared/types/index'

// ============================================================
// 主进程入口 — 三窗口架构：宠物窗口 + 面板窗口 + DDL弹窗
// ============================================================

let petWindow: BrowserWindow | null = null
let panelWindow: BrowserWindow | null = null
let ddlPickerWindow: BrowserWindow | null = null
let tray: Tray | null = null
let overdueTimer: ReturnType<typeof setInterval> | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── 宠物窗口 ────────────────────────────────────────────────
function createPetWindow(): void {
  const settings = settingsStore.get()
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  const petSize = 80
  let x = settings.petPosition.x
  let y = settings.petPosition.y
  if (x < 0) x = sw + x - petSize
  if (y < 0) y = sh + y - petSize

  petWindow = new BrowserWindow({
    width: petSize,
    height: petSize,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    petWindow.loadURL('http://localhost:5173/pet.html')
  } else {
    petWindow.loadFile(path.join(__dirname, '../renderer/pet.html'))
  }

  petWindow.on('closed', () => {
    petWindow = null
  })
}

// ── 面板窗口 ─────────────────────────────────────────────────
function createPanelWindow(): void {
  const settings = settingsStore.get()
  const pw = settings.panelSize?.width ?? 400
  const ph = settings.panelSize?.height ?? 500
  panelWindow = new BrowserWindow({
    width: pw,
    height: ph,
    minWidth: 280,
    minHeight: 200,
    show: false,
    frame: false,
    alwaysOnTop: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    panelWindow.loadURL('http://localhost:5173/panel.html')
  } else {
    panelWindow.loadFile(path.join(__dirname, '../renderer/panel.html'))
  }

  panelWindow.on('closed', () => {
    panelWindow = null
  })
}

// ── Bug 6 — DDL 独立弹窗 ─────────────────────────────────────
function getOrCreateDdlPickerWindow(): BrowserWindow {
  // 如果已存在则复用
  if (ddlPickerWindow && !ddlPickerWindow.isDestroyed()) return ddlPickerWindow

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const ww = 340
  const wh = 520

  ddlPickerWindow = new BrowserWindow({
    width: ww,
    height: wh,
    x: Math.round((sw - ww) / 2),
    y: Math.round((sh - wh) / 2),
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    parent: panelWindow ?? undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    ddlPickerWindow.loadURL('http://localhost:5173/ddl-picker.html')
  } else {
    ddlPickerWindow.loadFile(path.join(__dirname, '../renderer/ddlPicker.html'))
  }

  ddlPickerWindow.on('closed', () => {
    ddlPickerWindow = null
  })

  return ddlPickerWindow
}

// ── 面板位置计算（紧贴宠物，不覆盖） ─────────────────────────
function updatePanelPosition(): void {
  if (!petWindow || !panelWindow) return
  const petBounds = petWindow.getBounds()
  const panelBounds = panelWindow.getBounds()
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  const panelWidth = panelBounds.width
  const panelHeight = panelBounds.height
  const gap = 6

  let px = petBounds.x - panelWidth - gap
  if (px < 0) px = petBounds.x + petBounds.width + gap
  if (px + panelWidth > sw) px = sw - panelWidth - gap

  let py = petBounds.y
  if (py + panelHeight > sh) py = Math.max(0, sh - panelHeight - gap)
  if (py < 0) py = gap

  panelWindow.setPosition(Math.round(px), Math.round(py))
}

// ── 系统托盘 ─────────────────────────────────────────────────
function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('桌面小秘书')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏宠物',
      click: () => {
        if (petWindow) {
          petWindow.isVisible() ? petWindow.hide() : petWindow.show()
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
}

// ── IPC 处理 ──────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // 数据操作
  ipcMain.handle(IPC.TODO_GET_ALL, () => dataStore.getAll())
  ipcMain.handle(IPC.TODO_CREATE, (_e, params) => dataStore.create(params))
  ipcMain.handle(IPC.TODO_UPDATE, (_e, id, patch, immediate) =>
    dataStore.update(id, patch, immediate)
  )
  ipcMain.handle(IPC.TODO_DELETE, (_e, id) => dataStore.delete(id))
  ipcMain.handle(IPC.TODO_COMPLETE, (_e, id, keepLinks) => dataStore.complete(id, keepLinks))

  // 设置
  ipcMain.handle(IPC.SETTINGS_GET, () => settingsStore.get())
  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch) => settingsStore.set(patch))

  // 宠物拖拽位置更新
  ipcMain.handle(IPC.PET_MOVE, (_e, x: number, y: number) => {
    if (!petWindow) return
    petWindow.setPosition(Math.round(x), Math.round(y))
    settingsStore.savePetPosition(x, y)
  })

  ipcMain.handle(IPC.PET_POSITION_GET, () => {
    if (!petWindow) return { x: 0, y: 0 }
    const [x, y] = petWindow.getPosition()
    return { x, y }
  })

  ipcMain.handle(IPC.PET_MOUSE_ENABLE, (_e, enable: boolean) => {
    petWindow?.setIgnoreMouseEvents(!enable, { forward: true })
  })

  // 面板控制
  ipcMain.handle(IPC.PANEL_SHOW, () => {
    if (!panelWindow) return
    updatePanelPosition()
    panelWindow.show()
    petWindow?.webContents.send('panel:mouseEnter')
  })
  ipcMain.handle(IPC.PANEL_HIDE, () => panelWindow?.hide())
  ipcMain.handle(IPC.PANEL_CLOSE_BY_USER, () => {
    panelWindow?.hide()
    petWindow?.webContents.send('panel:pinChanged')
    if (panelWindow) {
      panelWindow.resizable = false
      panelWindow.setSize(400, 500)
    }
  })
  ipcMain.handle(IPC.PANEL_PIN, () => {
    if (!panelWindow) return
    panelWindow.show()
    panelWindow.resizable = true
    panelWindow.webContents.send('panel:pinState', true)
  })
  ipcMain.handle(IPC.PANEL_UNPIN, () => {
    if (!panelWindow) return
    panelWindow.hide()
    petWindow?.webContents.send('panel:pinChanged')
    panelWindow.resizable = false
  })
  ipcMain.handle(IPC.PANEL_MOVE, (_e, x: number, y: number) => {
    panelWindow?.setPosition(Math.round(x), Math.round(y))
  })
  ipcMain.handle(IPC.PANEL_RESIZE, (_e, width: number, height: number) => {
    if (!panelWindow) return
    const clampedW = Math.max(280, Math.min(width, 1200))
    const clampedH = Math.max(200, Math.min(height, 1200))
    panelWindow.setSize(Math.round(clampedW), Math.round(clampedH))
    settingsStore.set({
      ...settingsStore.get(),
      panelSize: { width: Math.round(clampedW), height: Math.round(clampedH) },
    })
  })
  ipcMain.handle('panel:notifyMouseEnter', () => {
    petWindow?.webContents.send('panel:mouseEnter')
  })
  ipcMain.handle('panel:notifyMouseLeave', () => {
    petWindow?.webContents.send('panel:mouseLeave')
  })

  // Bug 6 — DDL 独立弹窗
  ipcMain.handle(IPC.DDL_OPEN, (_e, currentDueDate: number | null) => {
    const win = getOrCreateDdlPickerWindow()
    win.webContents.send('ddl:init', currentDueDate)
    win.show()
    win.focus()
  })
  ipcMain.handle(IPC.DDL_CLOSE, () => {
    ddlPickerWindow?.hide()
  })
  ipcMain.handle(IPC.DDL_SELECT, (_e, dueDate: number | null) => {
    ddlPickerWindow?.hide()
    // 将结果转发给面板窗口
    panelWindow?.webContents.send('ddl:selected', dueDate)
  })

  // Feature 7 — 子任务操作
  ipcMain.handle(IPC.SUBTASK_ADD, (_e, todoId: string, title: string) =>
    dataStore.addSubtask(todoId, title)
  )
  ipcMain.handle(IPC.SUBTASK_UPDATE, (_e, todoId: string, subtaskId: string, patch: Record<string, unknown>) =>
    dataStore.updateSubtask(todoId, subtaskId, patch)
  )
  ipcMain.handle(IPC.SUBTASK_DELETE, (_e, todoId: string, subtaskId: string) =>
    dataStore.deleteSubtask(todoId, subtaskId)
  )
  ipcMain.handle(IPC.SUBTASK_TOGGLE, (_e, todoId: string, subtaskId: string) =>
    dataStore.toggleSubtask(todoId, subtaskId)
  )

  // 文件操作
  ipcMain.handle(IPC.FILE_EXISTS, (_e, filePath: string) => fs.existsSync(filePath))
  ipcMain.handle(IPC.FOLDER_OPEN, (_e, folderPath: string) => { shell.openPath(folderPath) })
  ipcMain.handle(IPC.FILE_OPEN, (_e, filePath: string) => { shell.openPath(filePath) })

  ipcMain.handle(IPC.FILE_SELECT, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled) return []
    return result.filePaths.map(fp => {
      const stat = fs.statSync(fp)
      const name = path.basename(fp)
      const ext = path.extname(fp).toLowerCase()
      return { path: fp, name, extension: ext, lastModifiedAt: stat.mtimeMs } as FileObj
    })
  })

  ipcMain.handle(IPC.FOLDER_SELECT, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled) return null
    const folderPath = result.filePaths[0]
    return { path: folderPath, name: path.basename(folderPath) } as FolderObj
  })

  ipcMain.handle(IPC.SMART_MATCH, (_e, title: string, folderPaths: string[]) => {
    return smartMatch(title, folderPaths)
  })

  // 文件关联操作
  ipcMain.handle('file:addToTodo', (_e, todoId: string, file: FileObj) =>
    dataStore.addFile(todoId, file)
  )
  ipcMain.handle('file:removeFromTodo', (_e, todoId: string, filePath: string) =>
    dataStore.removeFile(todoId, filePath)
  )
  ipcMain.handle('folder:addToTodo', (_e, todoId: string, folder: FolderObj) =>
    dataStore.addFolder(todoId, folder)
  )
  ipcMain.handle('folder:removeFromTodo', (_e, todoId: string, folderPath: string) =>
    dataStore.removeFolder(todoId, folderPath)
  )
  ipcMain.handle('todo:setDueDate', (_e, todoId: string, dueDate: number | null) =>
    dataStore.setDueDate(todoId, dueDate)
  )
  ipcMain.handle('todo:recordOpen', (_e, todoId: string, matchedFilePath?: string) =>
    dataStore.recordOpen(todoId, matchedFilePath)
  )
  ipcMain.handle('todo:reactivate', (_e, todoId: string) => dataStore.reactivate(todoId))
}

// ── 应用生命周期 ─────────────────────────────────────────────

app.whenReady().then(() => {
  dataStore.init()
  settingsStore.init()

  registerIpcHandlers()

  createPetWindow()
  createPanelWindow()
  createTray()

  overdueTimer = setInterval(() => {
    dataStore.tickOverdue()
    panelWindow?.webContents.send('todo:overdueUpdate')
    petWindow?.webContents.send('todo:overdueUpdate')
  }, 60_000)

  app.on('activate', () => {
    if (!petWindow) createPetWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (overdueTimer) clearInterval(overdueTimer)
    app.quit()
  }
})

app.on('before-quit', () => {
  dataStore.flushImmediate()
})