## ADDED Requirements

### Requirement: 置顶区按DDL升序排列
系统 SHALL 将置顶区（DDL ≤ 24小时或已逾期）的待办严格按截止时间升序排列，最紧急的排最前，逾期项置于区内最顶部。

#### Scenario: 逾期项排在置顶区最顶部
- **WHEN** 置顶区同时存在已逾期和临近到期（未逾期）的待办
- **THEN** 已逾期项全部排在未逾期项之前，组内再按 dueDate 升序排列

#### Scenario: 临近到期项按DDL升序
- **WHEN** 置顶区存在多个未逾期但 DDL ≤ 24小时的待办
- **THEN** 按 dueDate 从小到大排列，最近到期的排最前

#### Scenario: 新增待办进入置顶区后立即排序
- **WHEN** 用户为待办设定 DDL 使其满足置顶区条件
- **THEN** 该待办立即按规则插入置顶区正确位置

---

### Requirement: 常规区按综合分数动态排序
系统 SHALL 使用公式 `Score = (openCount × 0.6) + (quadrantWeight × 0.2) + (recencyBonus × 0.2)` 对常规区待办动态排序。

#### Scenario: 高频打开的待办排名靠前
- **WHEN** 某待办的 openCount 较高
- **THEN** 其 Score 中 openCount × 0.6 项更大，整体排名更靠前

#### Scenario: 象限权重映射正确
- **WHEN** 计算 quadrantWeight
- **THEN** 象限1对应权重4，象限2对应3，象限3对应2，象限4对应1

#### Scenario: 最近操作的待办排名加成
- **WHEN** 某待办的 lastOpenedAt 越接近当前时间
- **THEN** recencyBonus 衰减系数越高，该待办排名越靠前

#### Scenario: 新建待办初始分数
- **WHEN** 待办刚创建，openCount=0，lastOpenedAt 为 null
- **THEN** Score 仅由 quadrantWeight × 0.2 决定，象限1的新待办排在象限4新待办之前

---

### Requirement: 排序实时更新
系统 SHALL 在 openCount、lastOpenedAt 变化时实时重新排序常规区。

#### Scenario: 打开关联内容后重排
- **WHEN** 用户打开待办的关联文件或文件夹（触发 openCount++ 和 lastOpenedAt 更新）
- **THEN** 常规区列表在本次操作后重新按最新 Score 排列

#### Scenario: 面板打开时排序已是最新
- **WHEN** 用户呼出面板
- **THEN** 显示的排序结果基于截至当前时刻的最新 Score 计算
