import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { AppSettings } from '../../shared/types/index'

const APP_DATA_DIR = path.join(app.getPath('userData'), '..', 'DesktopSecretary')
const SETTINGS_FILE = path.join(APP_DATA_DIR, 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  petPosition: { x: -140, y: -140 }, // 右下角（相对值，初始化时转为绝对坐标）
  petCharacter: 'tangyuan',
  petPositionMode: 'fixed',
  panelSize: { width: 400, height: 500 },
}

// ============================================================
// SettingsStore — 应用设置持久化（宠物位置、角色、定位模式）
// ============================================================
export class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS }

  init(): void {
    this.ensureDir()
    this.load()
  }

  private ensureDir(): void {
    if (!fs.existsSync(APP_DATA_DIR)) {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true })
    }
  }

  private load(): void {
    if (!fs.existsSync(SETTINGS_FILE)) return
    try {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      this.settings = { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  private flush(): void {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (err) {
      console.error('[SettingsStore] Write failed:', err)
    }
  }

  get(): AppSettings {
    return { ...this.settings }
  }

  set(patch: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...patch }
    this.flush()
    return this.get()
  }

  savePetPosition(x: number, y: number): void {
    this.settings.petPosition = { x, y }
    this.flush()
  }
}

export const settingsStore = new SettingsStore()
