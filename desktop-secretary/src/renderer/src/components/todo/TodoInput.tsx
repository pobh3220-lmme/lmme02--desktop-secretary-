import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../../store/todoStore'
import type { Quadrant } from '../../../../shared/types/index'

// ============================================================
// TodoInput — 待办创建输入框 + 四象限浮窗
// ============================================================

const QUADRANTS: { q: Quadrant; label: string; sublabel: string; color: string }[] = [
  { q: 1, label: '重要且紧急', sublabel: '立即处理', color: '#FF5252' },
  { q: 2, label: '重要不紧急', sublabel: '规划处理', color: '#FF9800' },
  { q: 3, label: '紧急不重要', sublabel: '委托处理', color: '#2196F3' },
  { q: 4, label: '不重要不紧急', sublabel: '选择性做', color: '#9E9E9E' },
]

// Task 7.2 — 解析快捷符号
function parseInput(raw: string): { title: string; hasImportant: boolean; hasUrgent: boolean } {
  const hasImportant = raw.includes('!')
  const hasUrgent = raw.includes('@')
  const title = raw.replace(/[!@]/g, '').trim()
  return { title, hasImportant, hasUrgent }
}

// 根据符号推导建议象限焦点
function inferQuadrantFocus(hasImportant: boolean, hasUrgent: boolean): Quadrant | null {
  if (hasImportant && hasUrgent) return 1
  if (hasImportant) return 2
  if (hasUrgent) return 1
  return null
}

export function TodoInput() {
  const [value, setValue] = useState('')
  const [showQuadrant, setShowQuadrant] = useState(false)
  const [shake, setShake] = useState(false)
  const [focusHint, setFocusHint] = useState<Quadrant | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const parsedRef = useRef<{ title: string; rawInput: string } | null>(null)
  const { createTodo } = useTodoStore()

  // Task 7.3 — 抖动动画
  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()

      const trimmed = value.trim()
      if (!trimmed) {
        triggerShake()
        return
      }

      const { title, hasImportant, hasUrgent } = parseInput(trimmed)
      const hint = inferQuadrantFocus(hasImportant, hasUrgent)

      parsedRef.current = { title, rawInput: trimmed }
      setFocusHint(hint)
      setShowQuadrant(true)
    },
    [value, triggerShake]
  )

  // Task 7.6 — Esc 取消，内容保留全选
  const handleEscape = useCallback(() => {
    setShowQuadrant(false)
    parsedRef.current = null
    setTimeout(() => {
      inputRef.current?.select()
    }, 50)
  }, [])

  // Task 7.7 — 点选象限后创建待办
  const handleSelectQuadrant = useCallback(
    async (q: Quadrant) => {
      if (!parsedRef.current) return
      const { title, rawInput } = parsedRef.current
      setShowQuadrant(false)
      setValue('')
      parsedRef.current = null
      await createTodo(title, rawInput, q)
    },
    [createTodo]
  )

  return (
    <div style={{ position: 'relative', padding: '0 12px 12px' }}>
      {/* Task 7.5 — 浮窗弹出时禁止面板外操作（用遮罩实现） */}
      <AnimatePresence>
        {showQuadrant && (
          <>
            {/* 遮罩 */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              onClick={handleEscape}
            />
            {/* 四象限浮窗 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 12, right: 12,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
                padding: 10,
                zIndex: 99,
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8, textAlign: 'center' }}>
                选择象限
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {QUADRANTS.map(({ q, label, sublabel, color }) => (
                  <motion.button
                    key={q}
                    onClick={() => handleSelectQuadrant(q)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: focusHint === q ? color + '20' : '#F8F9FA',
                      border: `2px solid ${focusHint === q ? color : 'transparent'}`,
                      borderRadius: 8, padding: '8px 6px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    autoFocus={focusHint === q}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#999', marginLeft: 13 }}>{sublabel}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task 7.1 — 输入框 */}
      <motion.input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入待办，回车创建... (!重要 @紧急)"
        animate={shake ? { x: [-4, 4, -3, 3, -1, 1, 0] } : {}}
        transition={{ duration: 0.35 }}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 20,
          border: '1.5px solid #E0E0E0',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
          background: '#FAFAFA',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = '#2196F3')}
        onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
      />
    </div>
  )
}
