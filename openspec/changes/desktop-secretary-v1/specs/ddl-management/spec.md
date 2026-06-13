## ADDED Requirements

### Requirement: 在卡片上设定截止时间
系统 SHALL 提供两个入口让用户为待办设定 DDL：右键菜单和点击卡片日期区域。

#### Scenario: 右键菜单设定DDL
- **WHEN** 用户在待办卡片上右键并选择"设置截止时间"
- **THEN** 弹出日期时间选择器

#### Scenario: 点击日期区域设定DDL
- **WHEN** 用户点击待办卡片上的日期显示区域
- **THEN** 弹出日期时间选择器

#### Scenario: 无DDL时日期区域可点击
- **WHEN** 待办当前没有设定DDL，用户点击卡片日期区域（显示"无截止时间"或占位符）
- **THEN** 同样弹出日期时间选择器

---

### Requirement: 快捷选项预设
系统 SHALL 在日期时间选择器中提供4个快捷预设按钮。

#### Scenario: 选择今天18:00
- **WHEN** 用户点击"今天 18:00"快捷按钮
- **THEN** DDL 被设置为当天 18:00:00，选择器关闭，卡片更新

#### Scenario: 选择明天09:00
- **WHEN** 用户点击"明天 09:00"快捷按钮
- **THEN** DDL 被设置为次日 09:00:00

#### Scenario: 选择本周五17:00
- **WHEN** 用户点击"本周五 17:00"快捷按钮
- **THEN** DDL 被设置为本周星期五 17:00:00；若当天已是周五，则设为下周五

#### Scenario: 选择自定义
- **WHEN** 用户点击"自定义"按钮
- **THEN** 调起完整日期时间选择器，用户可自由选择任意日期和时间

---

### Requirement: 清除截止时间
系统 SHALL 在日期时间选择器底部提供"移除截止时间"选项。

#### Scenario: 移除DDL
- **WHEN** 用户在已有DDL的待办的选择器底部点击"移除截止时间"
- **THEN** dueDate 字段清空，卡片不再显示日期，isOverdue 重置为 false

---

### Requirement: 逾期状态实时计算
系统 SHALL 实时计算并更新待办的逾期状态，isOverdue 为只读计算字段。

#### Scenario: 当前时间超过DDL触发逾期
- **WHEN** 当前系统时间超过待办的 dueDate 且待办状态为 active
- **THEN** isOverdue 自动标记为 true，卡片进入逾期视觉状态

#### Scenario: 设置过去时间立即逾期
- **WHEN** 用户设定的 DDL 时间已在当前时间之前
- **THEN** 保存后 isOverdue 立即为 true，触发逾期状态

#### Scenario: 逾期严重度计算
- **WHEN** 待办处于逾期状态
- **THEN** overdueSeverity = floor((当前时间 - dueDate) / 3600秒)，单位为小时，实时更新

---

### Requirement: 系统时间变更后校准
系统 SHALL 在重启时根据当前系统时间重新计算所有待办的逾期状态。

#### Scenario: 重启后逾期状态校准
- **WHEN** 用户修改系统时间后重启应用
- **THEN** 应用启动时遍历所有 active 待办，按当前系统时间重新计算 isOverdue 和 overdueSeverity

---

### Requirement: DDL 时间显示格式
系统 SHALL 以人性化的相对时间格式在卡片上展示 DDL。

#### Scenario: 今天到期显示
- **WHEN** DDL 日期为当天
- **THEN** 显示格式为"今天 HH:mm"（如"今天 18:00"）

#### Scenario: 明天到期显示
- **WHEN** DDL 日期为次日
- **THEN** 显示"明天 HH:mm"

#### Scenario: 其他日期显示
- **WHEN** DDL 日期为今明两天之外
- **THEN** 显示"M月D日 HH:mm"格式

#### Scenario: 逾期时红色闪烁显示
- **WHEN** 待办处于逾期状态
- **THEN** DDL 时间文字以红色显示并配合呼吸式闪烁动画
