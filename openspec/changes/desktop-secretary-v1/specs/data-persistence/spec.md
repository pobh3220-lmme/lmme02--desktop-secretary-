## ADDED Requirements

### Requirement: 本地JSON数据存储
系统 SHALL 将所有待办数据以 JSON 格式持久化存储于 `%AppData%/DesktopSecretary/todos.json`，无任何网络请求。

#### Scenario: 数据文件路径
- **WHEN** 应用首次启动
- **THEN** 在 `%AppData%/DesktopSecretary/` 目录下创建 todos.json（若不存在）

#### Scenario: 全程无网络请求
- **WHEN** 应用运行期间的任何操作
- **THEN** 不向任何外部服务器发送网络请求，所有数据操作仅在本地完成

---

### Requirement: 启动时全量加载数据
系统 SHALL 在应用启动时将 todos.json 全量加载到内存。

#### Scenario: 正常启动加载
- **WHEN** 应用启动
- **THEN** 读取 todos.json，将所有待办数据加载到内存，面板可立即展示数据

#### Scenario: 数据文件损坏时恢复
- **WHEN** 启动时 JSON 解析失败（文件损坏）
- **THEN** 将损坏文件备份为 todos.json.bak，初始化空数据重新启动，并提示用户"数据文件已损坏，已备份原文件"

#### Scenario: 数据文件不存在时初始化
- **WHEN** 启动时 todos.json 不存在（如首次安装）
- **THEN** 创建空的 todos.json，以空待办列表启动

---

### Requirement: 变更时增量写入
系统 SHALL 在数据变更时将内存中的完整数据写回 todos.json，关键操作立即写入，日常操作 debounce 延迟写入。

#### Scenario: 关键操作立即写入
- **WHEN** 用户执行完成待办或删除待办操作
- **THEN** 立即（同步）将更新后的数据写入 todos.json，不等待 debounce

#### Scenario: 日常操作debounce写入
- **WHEN** 用户执行 openCount 增加、lastOpenedAt 更新等高频低风险操作
- **THEN** 在 500ms 内无新变更时触发一次写入，避免频繁磁盘 I/O

#### Scenario: 写入失败时用户提示
- **WHEN** todos.json 写入操作失败（如磁盘满或权限问题）
- **THEN** 在界面显示非阻断式错误提示，内存数据保持不变，下次操作时重试

---

### Requirement: 待办数据模型完整性
系统 SHALL 按照全局数据模型存储和读取每条待办记录的所有字段。

#### Scenario: 创建时必填字段完整
- **WHEN** 新待办被创建
- **THEN** id（UUID）、title、rawInput、quadrant、status（active）、createdAt 均有值，openCount 默认为0

#### Scenario: isOverdue 为只读计算字段
- **WHEN** 读取或写入待办数据
- **THEN** isOverdue 不存储在 JSON 中，每次从内存读取时根据 dueDate 和当前时间实时计算

#### Scenario: 数据向后兼容
- **WHEN** 应用更新后读取旧版本的 todos.json
- **THEN** 对旧版本中缺少的新字段使用默认值填充，不丢失已有数据

---

### Requirement: 宠物位置持久化
系统 SHALL 将宠物窗口位置单独存储，与待办数据分开管理。

#### Scenario: 位置文件存储
- **WHEN** 用户拖拽宠物后关闭应用
- **THEN** 宠物位置以物理像素坐标存储于 `%AppData%/DesktopSecretary/settings.json`

#### Scenario: 启动时恢复位置
- **WHEN** 应用启动
- **THEN** 从 settings.json 读取上次宠物位置，在该位置显示宠物
