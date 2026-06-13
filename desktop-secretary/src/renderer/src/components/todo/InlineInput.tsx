import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../../store/todoStore'
import type { Quadrant } from '../../../../shared/types/index'

// ============================================================
// InlineInput — 点击 + 后在顶部出现的待办创建输入框
// Opt 6: 象限可选，默认"重要且紧急"
// ============================================================

const DEFAULT_QUADRANT: Quadrant = 1

const QUADRANTS: { q: Quadrant; label: string; color: string }[] = [
  { q: 1, label: '重要且紧急', color: '#E57373' },
  { q: 2, label: '重要不紧急', color: '#FFB74D' },
  { q: 3, label: '紧急不重要', color: '#64B5F6' },
  { q: 4, label: '不重要不紧急', color: '#BDBDBD' },
]

interface Props {
  onDone: () => void
}

export function InlineInput({ onDone }: Props) {
  const [value, setValue] = useState('')
  const [showQuadrant, setShowQuadrant] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { createTodo } = useTodoStore()

  useEffect(() => {
    // Auto-focus on mount
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }, [])

  const handleCreate = useCallback(async (quadrant: Quadrant) => {
    const title = value.trim()
    if (!title) return
    setShowQuadrant(false)
    setValue('')
    await createTodo(title, title, quadrant)
    onDone()
  }, [value, createTodo, onDone])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowQuadrant(false)
      setValue('')
      onDone()
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      triggerShake()
      return
    }
    if (showQuadrant) {
      // Already showing quadrant picker, another Enter = default
      handleCreate(DEFAULT_QUADRANT)
    } else {
      // First Enter = show quadrant picker
      setShowQuadrant(true)
    }
  }, [value, showQuadrant, triggerShake, handleCreate, onDone])

  return (
    <div style={{ padding: '8px 10px 6px', position: 'relative' }}>
      <motion.input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入待办，回车创建..."
        animate={shake ? { x: [-3, 3, -2, 2, -1, 1, 0] } : {}}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          padding: '7px 10px',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.1)',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
          background: 'rgba(0,0,0,0.03)',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,122,255,0.5)'; e.target.style.background = 'white' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.background = 'rgba(0,0,0,0.03)' }}
      />

      {/* 象限浮窗 */}
      <AnimatePresence>
        {showQuadrant && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              onClick={() => { setShowQuadrant(false); setValue(''); onDone() }}
            />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%', left: 10, right: 10,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(20px)',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                padding: 8,
                zIndex: 99,
              }}
            >
              <div style={{ fontSize: 10, color: '#8E8E93', marginBottom: 6, textAlign: 'center' }}>
                选择象限 · 或按 Enter 默认&ldquo;重要且紧急&rdquo;
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {QUADRANTS.map(({ q, label, color }) => (
                  <motion.button
                    key={q}
                    onClick={() => handleCreate(q)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: q === DEFAULT_QUADRANT ? color + '14' : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${q === DEFAULT_QUADRANT ? color + '40' : 'transparent'}`,
                      borderRadius: 7,
                      padding: '6px 5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
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
