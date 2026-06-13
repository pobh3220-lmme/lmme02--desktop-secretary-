import React from 'react'

// ============================================================
// Sidebar — 160px 宽侧边栏：App信息 + 状态筛选 + 分类标签 + 关闭
// Bug 3: 分类标签可点击筛选，显示各分类待办数量
// ============================================================

export type StatusFilter = 'all' | 'todo' | 'in-progress' | 'completed'

interface Props {
  activeFilter: StatusFilter
  onFilterChange: (f: StatusFilter) => void
  activeCategory: string | null
  onCategoryChange: (c: string | null) => void
  counts: { all: number; todo: number; 'in-progress': number; completed: number }
  categoryCounts?: Record<string, number>
  onClose: () => void
}

const ITEMS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待处理' },
  { key: 'in-progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
]

const CATEGORIES = [
  { key: '工作', color: '#007AFF' },
  { key: '设计', color: '#34C759' },
  { key: '学习', color: '#FF9500' },
  { key: '生活', color: '#AF52DE' },
]

export function Sidebar({
  activeFilter, onFilterChange, activeCategory, onCategoryChange, counts, categoryCounts, onClose,
}: Props) {
  return (
    <div style={{
      width: 160, flexShrink: 0,
      background: '#F2F2F7',
      display: 'flex', flexDirection: 'column',
      padding: '14px 10px 10px',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* App 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 16 }}>🐾</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E' }}>桌面小秘书</span>
      </div>
      <div style={{ fontSize: 10, color: '#8E8E93', marginBottom: 14 }}>
        {counts.all} 个待办
      </div>

      {/* 状态筛选 */}
      <div style={{
        fontSize: 9, fontWeight: 600, color: '#8E8E93',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
      }}>状态</div>
      {ITEMS.map(item => (
        <button
          key={item.key}
          onClick={() => { onFilterChange(item.key); onCategoryChange(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: '4px 10px', border: 'none',
            background: activeFilter === item.key && activeCategory === null ? 'rgba(0,122,255,0.08)' : 'transparent',
            borderRadius: 5, cursor: 'pointer', textAlign: 'left',
            fontSize: 12, fontWeight: activeFilter === item.key && activeCategory === null ? 600 : 400,
            color: activeFilter === item.key && activeCategory === null ? '#007AFF' : '#3A3A3C',
            marginBottom: 1,
          }}
          onMouseEnter={e => { if (activeFilter !== item.key || activeCategory !== null) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
          onMouseLeave={e => { if (activeFilter !== item.key || activeCategory !== null) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ flex: 1 }}>{item.label}</span>
          <span style={{
            fontSize: 10, color: '#8E8E93',
            background: 'rgba(0,0,0,0.05)', borderRadius: 8,
            padding: '0px 6px', minWidth: 16, textAlign: 'center',
          }}>{counts[item.key]}</span>
        </button>
      ))}

      {/* Bug 3 — 分类标签（可点击筛选） */}
      <div style={{
        fontSize: 9, fontWeight: 600, color: '#8E8E93',
        textTransform: 'uppercase', letterSpacing: 0.5,
        marginTop: 14, marginBottom: 4,
      }}>分类</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {CATEGORIES.map(cat => {
          const catCount = categoryCounts?.[cat.key] ?? 0
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => {
                if (isActive) {
                  onCategoryChange(null)
                } else {
                  onCategoryChange(cat.key)
                  onFilterChange('all')
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 4,
                border: `1px solid ${isActive ? `${cat.color}40` : 'transparent'}`,
                fontSize: 11, cursor: 'pointer',
                background: isActive ? `${cat.color}14` : 'rgba(0,0,0,0.03)',
                color: isActive ? cat.color : '#3A3A3C',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: cat.color,
              }} />
              {cat.key}
              {catCount > 0 && (
                <span style={{
                  fontSize: 9, color: isActive ? cat.color : '#8E8E93',
                  background: isActive ? `${cat.color}20` : 'rgba(0,0,0,0.05)',
                  borderRadius: 6, padding: '0px 4px', minWidth: 12, textAlign: 'center',
                }}>{catCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 底部关闭按钮 */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '5px 0', borderRadius: 6,
            border: 'none', background: 'rgba(0,0,0,0.04)',
            color: '#8E8E93', cursor: 'pointer', fontSize: 11,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#3A3A3C' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#8E8E93' }}
        >✕ 关闭面板</button>
      </div>
    </div>
  )
}
