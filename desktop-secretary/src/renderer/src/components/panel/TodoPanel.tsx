import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../../store/todoStore'
import { TodoCard } from '../todo/TodoCard'
import { Sidebar } from './Sidebar'
import { toRuntime, sortTodos, SORT_LABELS } from '../../../../shared/utils/sorting'
import type { StatusFilter } from './Sidebar'
import type { SortMode } from '../../../../shared/types/index'

// ============================================================
// TodoPanel — 全浅色两栏布局
// Feature 8: 排序下拉 + 淡化 placeholder
// ============================================================

const CAT_NAMES = ['工作', '设计', '学习', '生活']

function getCategory(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
  return CAT_NAMES[Math.abs(h) % CAT_NAMES.length]
}

const SORT_OPTIONS: { mode: SortMode; label: string; icon: string }[] = [
  { mode: 'default', label: '默认', icon: '⭐' },
  { mode: 'created-desc', label: '最新创建', icon: '🆕' },
  { mode: 'created-asc', label: '最早创建', icon: '📅' },
  { mode: 'dueDate-asc', label: 'DDL升序', icon: '⏰↑' },
  { mode: 'dueDate-desc', label: 'DDL降序', icon: '⏰↓' },
  { mode: 'quadrant-1to4', label: 'Q1→Q4', icon: '🔴' },
  { mode: 'quadrant-4to1', label: 'Q4→Q1', icon: '⚪' },
]

export function TodoPanel() {
  const { completed, todos, loadAll } = useTodoStore()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [panelPinned, setPanelPinned] = useState(false)
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; initW: number; initH: number } | null>(null)
  const isMouseInPanel = useRef(false)
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bug 3 — 状态筛选 + 分类筛选 + Feature 8 排序
  const visibleTodos = React.useMemo(() => {
    let list = [...todos]
    if (filter === 'todo') list = list.filter(t => t.status === 'active' && t.quadrant !== 1)
    else if (filter === 'in-progress') list = list.filter(t => t.status === 'active' && t.quadrant === 1)
    else if (filter === 'completed') list = list.filter(t => t.status === 'completed')
    else list = list.filter(t => t.status !== 'deleted')
    if (category) list = list.filter(t => getCategory(t.id) === category)
    const runtimeList = list.map(toRuntime)
    return sortTodos(runtimeList, sortMode)
  }, [todos, filter, category, sortMode])

  const categoryCounts = React.useMemo(() => {
    const activeTodos = todos.filter(t => t.status !== 'deleted')
    const counts: Record<string, number> = {}
    for (const t of activeTodos) {
      const cat = getCategory(t.id)
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [todos])

  const progressAll = todos.filter(t => t.status !== 'deleted').length
  const progressDone = completed.length
  const progressPct = progressAll > 0 ? Math.round((progressDone / progressAll) * 100) : 0

  const counts = {
    all: todos.filter(t => t.status !== 'deleted').length,
    todo: todos.filter(t => t.status === 'active' && t.quadrant !== 1).length,
    'in-progress': todos.filter(t => t.status === 'active' && t.quadrant === 1).length,
    completed: completed.length,
  }

  useEffect(() => {
    loadAll()
    window.electronAPI?.on('todo:overdueUpdate', () => {
      useTodoStore.getState().refreshOverdue()
    })
    return () => window.electronAPI?.off('todo:overdueUpdate', () => {})
  }, [loadAll])

  useEffect(() => {
    const handler = (pinned: boolean) => setPanelPinned(pinned)
    window.electronAPI?.on('panel:pinState', handler)
    return () => window.electronAPI?.off('panel:pinState', handler)
  }, [])

  const handlePanelMouseEnter = useCallback(() => {
    if (isMouseInPanel.current) return
    isMouseInPanel.current = true
    if (notifyTimer.current) { clearTimeout(notifyTimer.current); notifyTimer.current = null }
    window.electronAPI?.panel.notifyMouseEnter()
  }, [])

  const handlePanelMouseLeave = useCallback(() => {
    isMouseInPanel.current = false
    if (notifyTimer.current) clearTimeout(notifyTimer.current)
    notifyTimer.current = setTimeout(() => {
      window.electronAPI?.panel.notifyMouseLeave()
    }, 100)
  }, [])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const w = document.documentElement.clientWidth
    const h = document.documentElement.clientHeight
    resizeStartRef.current = { mouseX: e.screenX, mouseY: e.screenY, initW: w, initH: h }
    const onMouseMove = (me: MouseEvent) => {
      if (!resizeStartRef.current) return
      const dx = me.screenX - resizeStartRef.current.mouseX
      const dy = me.screenY - resizeStartRef.current.mouseY
      window.electronAPI?.panel.resize(
        Math.max(280, resizeStartRef.current.initW + dx),
        Math.max(200, resizeStartRef.current.initH + dy)
      )
    }
    const onMouseUp = () => {
      resizeStartRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  const currentSortLabel = SORT_OPTIONS.find(o => o.mode === sortMode)?.label ?? '排序'

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex',
      background: '#FAFAFA', overflow: 'hidden',
      fontFamily: '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      position: 'relative',
    }}
      onMouseEnter={handlePanelMouseEnter}
      onMouseLeave={handlePanelMouseLeave}
    >
      {/* Bug 4 — drag strip */}
      <div style={{
        position: 'absolute', top: 0, left: 160, right: 24,
        height: 12, zIndex: 1, WebkitAppRegion: 'drag' as any,
      }} />

      {/* ===== 左侧边栏 ===== */}
      <Sidebar
        activeFilter={filter} onFilterChange={setFilter}
        activeCategory={category} onCategoryChange={setCategory}
        counts={counts} categoryCounts={categoryCounts}
        onClose={() => window.electronAPI?.panel.closeByUser()}
      />

      {/* ===== 右侧内容区 ===== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部 bar: 输入框 + 排序按钮 */}
        <div style={{ flexShrink: 0, padding: '10px 12px 6px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <TodoInputBar />
          </div>
          {/* Feature 8 — 排序下拉 */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              title="排序方式"
              style={{
                padding: '7px 8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                background: 'white', cursor: 'pointer', fontSize: 11, color: '#8E8E93',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {SORT_OPTIONS.find(o => o.mode === sortMode)?.icon ?? '📊'} {currentSortLabel}
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowSortMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    style={{
                      position: 'absolute', top: '100%', right: 0,
                      background: 'white', borderRadius: 10,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.14)', padding: 6,
                      zIndex: 200, minWidth: 140,
                    }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.mode}
                        onClick={() => { setSortMode(opt.mode); setShowSortMenu(false) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '6px 10px', border: 'none',
                          background: sortMode === opt.mode ? 'rgba(0,122,255,0.06)' : 'transparent',
                          borderRadius: 6, cursor: 'pointer', fontSize: 12,
                          color: sortMode === opt.mode ? '#007AFF' : '#333',
                          fontWeight: sortMode === opt.mode ? 600 : 400,
                        }}
                      >{opt.icon} {opt.label}</button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 卡片列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 8px' }}>
          {visibleTodos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#C7C7CC', fontSize: 12, paddingTop: 40 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>✨</div>
              <div>还没有待办，在上方输入框中创建</div>
            </div>
          ) : (
            visibleTodos.map(todo => (
              <TodoCard
                key={todo.id} todo={todo}
                showCheckbox={true} isCompleted={todo.status === 'completed'}
              />
            ))
          )}
        </div>

        {/* 进度条 */}
        <div style={{
          flexShrink: 0, padding: '8px 12px 10px', borderTop: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8E8E93', marginBottom: 4 }}>
            <span>完成进度</span>
            <span>{progressDone}/{progressAll} · {progressPct}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progressPct}%`,
              background: '#007AFF', borderRadius: 2, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* resize grip */}
      <div onMouseDown={handleResizeStart} style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 20, height: 20, cursor: 'nwse-resize', zIndex: 40,
      }} />
    </div>
  )
}

// ============================================================
// TodoInputBar
// ============================================================
import type { Quadrant } from '../../../../shared/types/index'

function TodoInputBar() {
  const [value, setValue] = useState('')
  const [showQuadrant, setShowQuadrant] = useState(false)
  const [shake, setShake] = useState(false)
  const { createTodo } = useTodoStore()

  const handleCreate = async (q: Quadrant) => {
    const title = value.trim()
    if (!title) return
    setShowQuadrant(false)
    setValue('')
    await createTodo(title, title, q)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowQuadrant(false); setValue(''); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setShake(true); setTimeout(() => setShake(false), 400); return }
    if (showQuadrant) { handleCreate(1) } else { setShowQuadrant(true) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入待办，回车创建..."
        animate={shake ? { x: [-3, 3, -2, 2, -1, 1, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="todo-input-bar"
        style={{
          width: '100%', padding: '7px 10px',
          border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
          fontSize: 12, outline: 'none', boxSizing: 'border-box',
          background: 'white',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,122,255,0.4)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)' }}
      />
      <AnimatePresence>
        {showQuadrant && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => { setShowQuadrant(false); setValue('') }} />
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: 8, zIndex: 99,
              }}
            >
              <div style={{ fontSize: 10, color: '#8E8E93', marginBottom: 6, textAlign: 'center' }}>
                选择象限 · 再按 Enter 默认"重要且紧急"
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {([
                  { q: 1 as Quadrant, label: '重要且紧急', color: '#E57373' },
                  { q: 2 as Quadrant, label: '重要不紧急', color: '#FFB74D' },
                  { q: 3 as Quadrant, label: '紧急不重要', color: '#64B5F6' },
                  { q: 4 as Quadrant, label: '不重要不紧急', color: '#BDBDBD' },
                ]).map(({ q, label, color }) => (
                  <motion.button
                    key={q} onClick={() => handleCreate(q)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    style={{
                      background: q === 1 ? color + '14' : 'rgba(0,0,0,0.02)',
                      border: `1.5px solid ${q === 1 ? color + '40' : 'transparent'}`,
                      borderRadius: 7, padding: '6px 5px', cursor: 'pointer',
                      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#3A3A3C' }}>{label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
