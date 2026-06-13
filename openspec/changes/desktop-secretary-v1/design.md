## Context

桌面小秘书是全新的 Windows 桌面客户端应用，无历史代码包袱。核心挑战在于：
1. 桌面透明置顶窗口的渲染与交互（宠物层）
2. 流畅的逐帧动画（30fps）与极低的 CPU 占用（< 1%）之间的平衡
3. 待办面板需在宠物窗口旁边按需展开/收起，窗口管理复杂
4. 与 Windows 文件系统的深度交互（Shell 打开、拖拽接收、文件监听）

目标用户为 Windows 10/11 PC 用户，V1.0 不支持 macOS。

## Goals / Non-Goals

**Goals:**
- 实现 PRD V1.0 所有功能：宠物动画、待办 CRUD、文件关联、智能匹配、DDL、双区排序
- 常态 CPU < 1%，内存 < 80MB，面板展开 < 100ms
- 全离线，无网络请求，数据仅存本地

**Non-Goals:**
- macOS 适配（V1.1 规划）
- 用户自定义宠物模型导入（V1.1 规划）
- 多设备同步、团队协作（V2.0 规划）
- 云备份、通知推送

## Decisions

### D1：技术框架选用 Electron + React

**选择**：Electron（主进程） + React（渲染进程）+ TypeScript

**理由**：
- Electron 原生支持透明无边框窗口（`transparent: true`），适合桌面宠物场景
- 可直接调用 Node.js 的 `fs`、`child_process`、`shell` API 操作本地文件
- React 生态成熟，动画库丰富（Framer Motion），开发效率高
- TypeScript 提供类型安全，降低数据模型错误风险

**备选方案**：
- Tauri（Rust + WebView）：内存更低，但 Windows 文件拖拽 API 支持不完善，社区生态较小
- Qt / C++：性能最优，但开发周期过长，不适合 V1.0 快速迭代
- WPF/.NET：仅限 Windows，与跨平台规划冲突

---

### D2：双窗口架构（宠物窗口 + 面板窗口）

**选择**：分离为两个独立的 BrowserWindow

- **宠物窗口**：`transparent: true`，`alwaysOnTop: true`，`frame: false`，固定尺寸（约 120×120px）
- **面板窗口**：`transparent: false`，`alwaysOnTop: true`，`frame: false`，宽约 320px，高度动态

**理由**：
- 单窗口方案下，面板展开时宠物的鼠标穿透（`setIgnoreMouseEvents`）区域难以精确控制
- 双窗口可独立控制层叠顺序、动画、鼠标事件
- 面板窗口位置跟随宠物窗口位置动态计算，IPC 通信同步

**备选方案**：单一大透明窗口，内部用 React 管理宠物和面板区域——鼠标穿透区域管理过于复杂，放弃。

---

### D3：动画方案选用 CSS + Framer Motion，避免 Canvas/WebGL

**选择**：SVG 矢量宠物图形 + Framer Motion 驱动弹性动画

**理由**：
- 宠物角色为圆润抽象形状，SVG 路径变形天然适合弹性/形变动画（morphing）
- Framer Motion 的 `spring` 物理弹簧动画与宠物"有弹性"的设计定位完美匹配
- SVG + CSS 动画由 GPU 合成层渲染，CPU 占用极低，满足 < 1% 要求
- Canvas/WebGL 方案 CPU 占用反而因 JS 驱动的帧循环更高

**动画状态机实现**：Zustand 状态管理驱动动画状态，状态转换时 Framer Motion 的 `variants` 自动处理过渡。

---

### D4：数据持久化用 JSON 文件 + 内存缓存

**选择**：启动时全量加载 JSON → 内存操作 → 变更时 debounce 写入（500ms）

**存储路径**：`%AppData%/DesktopSecretary/todos.json`

**理由**：
- 待办数据量极小（目标用户日常待办不超过数百条），SQLite 引入成本大于收益
- JSON 文件人类可读，便于调试和手动恢复
- debounce 写入避免每次操作都触发磁盘 I/O

**风险**：应用崩溃时 debounce 窗口内的数据可能丢失 → 缓解：完成/删除等关键操作立即写入，日常排序/openCount 更新 debounce 处理。

---

### D5：智能文件匹配用纯 JS 文件名模糊匹配，不引入 NLP

**选择**：结巴分词（中文）+ 英文空格分词提取关键词，对文件夹内文件名做加权模糊匹配

**匹配权重实现**：
```
score = exactMatch ? 100 : allKeywords ? 60 : partialKeywords ? 30 : 0
tiebreaker = lastModifiedAt（降序）
```

**理由**：
- 目标用户文件命名通常包含项目关键词，简单模糊匹配命中率足够
- 引入完整 NLP/embedding 方案在 < 200ms 约束下不可行，且增加安装包体积
- 结巴分词（jieba-js）轻量，支持中文分词，满足建筑设计师的中文文件命名场景

---

### D6：文件变化检测采用轮询而非 fs.watch

**选择**：面板打开时对所有关联路径执行一次 `fs.existsSync` 检查

**理由**：
- `fs.watch` 在 Windows 上对网络驱动器、移动硬盘支持不稳定
- 关联路径数量少，每次面板展开时轮询成本极低（< 5ms）
- 实时监听对于"用户打开面板时看到最新状态"的需求已足够

## Risks / Trade-offs

| 风险 | 缓解策略 |
|------|---------|
| Electron 安装包体积大（~150MB）| 使用 electron-builder 精简打包，排除无用模块；用户一次性下载可接受 |
| 高 DPI / 多显示器场景宠物位置偏移 | 使用 Electron 的 `screen` API 获取真实像素坐标，位置记忆存储物理像素 |
| 动画状态机并发触发导致动画闪烁 | Framer Motion 的 `AnimatePresence` 天然处理状态转换，高优先级状态通过 Zustand 单一 source of truth 保证 |
| 用户关联路径含特殊字符（中文、空格）| 使用 `path.normalize` 处理，`shell.openPath` 接受任意合法路径 |
| 文件夹内文件量 > 500 时匹配超时 | 匹配前先检查文件数量，超过 500 则仅对最近修改的 500 个文件匹配，并静默 |
| 数据文件损坏（JSON 格式错误）| 启动时 try/catch 解析，失败则备份损坏文件并初始化空数据，提示用户 |

## Open Questions

- 宠物角色的具体 SVG 资产由谁设计？（影响 pet-system 实现时间）
- 快捷键呼出面板是否需要（PRD V1.0 未提及，但用户可能需要）？建议 V1.0 先不加。
- 安装包分发渠道：绿色版 zip / NSIS 安装程序 / Microsoft Store？建议 V1.0 先出 NSIS 安装包。
