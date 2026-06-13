import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../../store/todoStore'
import { formatDueDate, calcIsOverdue, isDueWithin24h } from '../../../../shared/utils/ddlUtils'
import type { TodoItemRuntime, Subtask } from '../../../../shared/types/index'

// ============================================================
// TodoCard — 单个待办卡片
// Feature 7: 子任务展开/折叠
// Bug 6: DDL 改为独立弹窗（移除内嵌 DdlPicker，监听 ddl:selected）
// ============================================================

const QUADRANT_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: '#E57373', 2: '#FFB74D', 3: '#64B5F6', 4: '#BDBDBD',
}

const QUADRANT_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '重要且紧急', 2: '重要不紧急', 3: '紧急不重要', 4: '不重要不紧急',
}

const CAT_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE']
const CAT_NAMES = ['工作', '设计', '学习', '生活']
const CATEGORY_COLORS: Record<string, string> = {}
CAT_NAMES.forEach((n, i) => { CATEGORY_COLORS[n] = CAT_COLORS[i] })

function getCategory(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
  return CAT_NAMES[Math.abs(h) % CAT_NAMES.length]
}

interface CardProps {
  todo: TodoItemRuntime
  showCheckbox?: boolean
  isCompleted?: boolean
}

export function TodoCard({ todo, showCheckbox = true, isCompleted = false }: CardProps) {
  const { deleteTodo, completeTodo, reactivateTodo, addFile, removeFile, addFolder, removeFolder, openTodo, setDueDate,
    addSubtask, toggleSubtask, deleteSubtask, setSubtaskDueDate, addSubtaskFile, removeSubtaskFile } = useTodoStore()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [missingAlert, setMissingAlert] = useState<string | null>(null)
  const [checkAnimating, setCheckAnimating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  const isOverdue = calcIsOverdue(todo.dueDate, todo.status)
  const isNear = isDueWithin24h(todo.dueDate)

  /*******************************************************************/

  /* Bug 6 — 监听 DDL 弹窗选择结果 */
  useEffect(() => {
    const handler = (dueDate: number | null) => {
      setDueDate(todo.id, dueDate)
    }
    window.electronAPI?.on('ddl:selected', handler)
    return () => window.electronAPI?.off('ddl:selected', handler)
  }, [todo.id, setDueDate])

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleCheckboxClick = async () => {
    setCheckAnimating(true)
    if (isCompleted) await reactivateTodo(todo.id)
    else await completeTodo(todo.id, true)
    setTimeout(() => setCheckAnimating(false), 400)
  }

  const handleDeleteConfirm = async () => {
    await deleteTodo(todo.id)
    setShowDeleteConfirm(false)
  }

  // 拖拽文件到卡片
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const items = Array.from(e.dataTransfer.files) as (File & { path?: string })[]
    for (const file of items) {
      const filePath = file.path
      if (!filePath) continue
      const isDir = (await window.electronAPI?.file.exists(filePath + '/.')) || false
      if (isDir || filePath.match(/[/\\]$/)) {
        await addFolder(todo.id, { path: filePath, name: file.name })
      } else {
        const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
        await addFile(todo.id, { path: filePath, name: file.name, extension: ext, lastModifiedAt: file.lastModified })
      }
    }
  }

  const handleMissingClick = (path: string) => setMissingAlert(path)
  const handleOpenTodo = useCallback(() => openTodo(todo.id), [openTodo, todo.id])

  const fileIcon = (ext: string) => {
    const icons: Record<string, string> = {
      pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
      ppt: '📋', pptx: '📋', jpg: '🖼', jpeg: '🖼', png: '🖼',
      gif: '🖼', mp4: '🎬', mp3: '🎵', zip: '🗜', rar: '🗜',
      dwg: '📐', dxf: '📐', skp: '🏠', rvt: '🏛',
    }
    return icons[ext] ?? '📎'
  }

  /*******************************************************************/
  /* Feature 7 — 子任务输入 */
  const handleSubtaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const title = subtaskInput.trim()
    if (!title) return
    setSubtaskInput('')
    await addSubtask(todo.id, title)
  }

  // 拖拽文件到子任务
  const handleSubtaskDrop = async (e: React.DragEvent, subtaskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const items = Array.from(e.dataTransfer.files) as (File & { path?: string })[]
    for (const file of items) {
      const filePath = file.path
      if (!filePath) continue
      const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
      await addSubtaskFile(todo.id, subtaskId, {
        path: filePath, name: file.name, extension: ext, lastModifiedAt: file.lastModified,
      })
    }
  }

  const titleColor = isOverdue ? '#E53935' : isNear ? '#F57C00' : undefined
  const category = getCategory(todo.id)
  const subtasks = todo.subtasks ?? []
  const hasSubtasks = subtasks.length > 0

  return (
    <>
      <motion.div
        ref={cardRef}
        className={`todo-card ${isOverdue ? 'overdue' : ''} ${isDragOver ? 'drag-over' : ''}`}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={isOverdue ? { boxShadow: ['0 0 0 1px #E53935', '0 0 0 2px #E5393566', '0 0 0 1px #E53935'] } : {}}
        transition={isOverdue ? { duration: 1.5, repeat: Infinity } : {}}
        style={{
          background: 'white', borderRadius: 10, padding: '9px 10px', marginBottom: 6,
          border: isOverdue ? '1px solid rgba(229, 57, 53, 0.4)' : '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', cursor: 'default',
        }}
      >
        {/* 勾选框 */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <button onClick={handleCheckboxClick} style={{
            width: 16, height: 16, borderRadius: '50%',
            border: `2px solid ${checkAnimating || isCompleted ? QUADRANT_COLORS[todo.quadrant] : '#D1D1D6'}`,
            background: checkAnimating || isCompleted ? QUADRANT_COLORS[todo.quadrant] : 'transparent',
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s, border-color 0.2s',
          }} title={isCompleted ? '重新激活' : '标记完成'}>
            {(checkAnimating || isCompleted) && (<span style={{ fontSize: 9, color: 'white', lineHeight: 1 }}>✓</span>)}
          </button>
        </div>

        {/* 象限 + 分类 + 展开按钮 */}
        <div style={{ position: 'absolute', top: 10, right: 8, display: 'flex', gap: 3, alignItems: 'center' }}>
          {!isCompleted && (
            <>
              <div title={QUADRANT_LABELS[todo.quadrant]} style={{ width: 6, height: 6, borderRadius: '50%', background: QUADRANT_COLORS[todo.quadrant] }} />
              <div title={category} style={{ width: 6, height: 6, borderRadius: '50%', background: CATEGORY_COLORS[category] || '#D1D1D6' }} />
            </>
          )}
          {/* 展开子任务按钮 */}
          {(hasSubtasks || !isCompleted) && (
            <button
              onClick={() => setExpanded(!expanded)}
              title={expanded ? '折叠子任务' : '展开子任务'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 10, color: '#8E8E93', padding: '0 2px',
                marginLeft: 2, transition: 'transform 0.2s',
                transform: expanded ? 'rotate(90deg)' : 'none',
              }}
            >▶</button>
          )}
        </div>

        {/* 标题 */}
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: titleColor ?? (isCompleted ? '#8E8E93' : '#3A3A3C'),
          marginLeft: showCheckbox ? 22 : 0, marginRight: 24, marginBottom: 3,
          lineHeight: 1.4, textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {todo.title}
          {hasSubtasks && (
            <span style={{ fontSize: 10, color: '#8E8E93', marginLeft: 4 }}>
              ({subtasks.filter(s => s.completed).length}/{subtasks.length})
            </span>
          )}
        </div>

        {/* DDL 显示 */}
        {todo.dueDate !== null && (
          <motion.div
            style={{ fontSize: 11, color: isOverdue ? '#E53935' : isNear ? '#F57C00' : '#999', marginBottom: 4, cursor: 'pointer' }}
            animate={isOverdue ? { opacity: [1, 0.4, 1] } : {}}
            transition={isOverdue ? { duration: 1.2, repeat: Infinity } : {}}
            onClick={() => window.electronAPI?.ddlPicker.open(todo.dueDate)}
          >⏰ {formatDueDate(todo.dueDate)}</motion.div>
        )}

        {/* 关联文件/文件夹 */}
        {(todo.linkedFiles.length > 0 || todo.linkedFolders.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {todo.linkedFolders.map(folder => (
              <FileChip key={folder.path} label={folder.name} icon="📁" missing={false}
                onClick={() => window.electronAPI?.folder.open(folder.path)}
                onRemove={() => removeFolder(todo.id, folder.path)} />
            ))}
            {todo.linkedFiles.map(file => (
              <FileChip key={file.path} label={file.name} icon={fileIcon(file.extension)} missing={false}
                onClick={() => window.electronAPI?.file.open(file.path)}
                onRemove={() => removeFile(todo.id, file.path)} />
            ))}
          </div>
        )}

        {/* 操作区 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(todo.linkedFiles.length > 0 || todo.linkedFolders.length > 0) && (
            <ActionBtn onClick={handleOpenTodo} title="打开关联内容">▶</ActionBtn>
          )}
          {todo.dueDate === null && (
            <ActionBtn onClick={() => window.electronAPI?.ddlPicker.open(null)} title="设置截止时间">📅</ActionBtn>
          )}
          <ActionBtn onClick={async () => {
            const files = await window.electronAPI?.file.select()
            if (files) for (const f of files) await addFile(todo.id, f)
          }} title="关联文件">📎</ActionBtn>
          <ActionBtn onClick={async () => {
            const folder = await window.electronAPI?.folder.select()
            if (folder) await addFolder(todo.id, folder)
          }} title="关联文件夹">📂</ActionBtn>
        </div>

        {/* 拖拽高亮提示 */}
        {isDragOver && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            border: '2px dashed #2196F3', background: 'rgba(33, 150, 243, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', fontSize: 12, color: '#2196F3',
          }}>松开以关联文件/文件夹</div>
        )}

        {/* ===== Feature 7 — 子任务区域 ===== */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                borderTop: '1px solid #F0F0F0', marginTop: 8, paddingTop: 8,
              }}>
                {/* 已有子任务列表 */}
                {subtasks.map(st => (
                  <SubtaskRow
                    key={st.id}
                    subtask={st}
                    todoId={todo.id}
                    onToggle={() => toggleSubtask(todo.id, st.id)}
                    onDelete={() => deleteSubtask(todo.id, st.id)}
                    onSetDdl={(ts) => setSubtaskDueDate(todo.id, st.id, ts)}
                    onDropFile={e => handleSubtaskDrop(e, st.id)}
                    onRemoveFile={fp => removeSubtaskFile(todo.id, st.id, fp)}
                  />
                ))}

                {/* 添加子任务输入框 */}
                {!isCompleted && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#8E8E93' }}>+</span>
                    <input
                      value={subtaskInput}
                      onChange={e => setSubtaskInput(e.target.value)}
                      onKeyDown={handleSubtaskKeyDown}
                      placeholder="添加子任务..."
                      style={{
                        flex: 1, padding: '3px 8px', borderRadius: 6,
                        border: '1px solid #E5E5EA', fontSize: 11, outline: 'none',
                        background: '#FAFAFA',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,122,255,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = '#E5E5EA'}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <Overlay>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: 'white', borderRadius: 12, padding: 16, width: 280 }}>
              <div style={{ fontSize: 14, marginBottom: 4, fontWeight: 600 }}>确定删除此待办事项吗？</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>关联记录将被清除，磁盘文件不受影响。</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={handleDeleteConfirm} variant="danger">删除</Button>
                <Button onClick={() => setShowDeleteConfirm(false)} variant="ghost">取消</Button>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* 缺失关联提示 */}
      <AnimatePresence>
        {missingAlert && (
          <Overlay>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: 'white', borderRadius: 12, padding: 16, width: 280 }}>
              <div style={{ fontSize: 14, marginBottom: 12 }}>原文件/文件夹不存在，是否解除此关联？</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={async () => { await removeFile(todo.id, missingAlert); setMissingAlert(null) }} variant="danger">解除</Button>
                <Button onClick={() => setMissingAlert(null)} variant="ghost">取消</Button>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* 右键菜单 */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowContextMenu(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', left: contextMenuPos.x, top: contextMenuPos.y, background: 'white', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 140, overflow: 'hidden' }}>
              <MenuItem onClick={() => { window.electronAPI?.ddlPicker.open(todo.dueDate); setShowContextMenu(false) }}>设置截止时间</MenuItem>
              <MenuItem onClick={() => { setShowDeleteConfirm(true); setShowContextMenu(false) }} danger>删除</MenuItem>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================
// SubtaskRow — 单条子任务行
// ============================================================

function SubtaskRow({ subtask, todoId, onToggle, onDelete, onSetDdl, onDropFile, onRemoveFile }: {
  subtask: Subtask
  todoId: string
  onToggle: () => void
  onDelete: () => void
  onSetDdl: (ts: number | null) => void
  onDropFile: (e: React.DragEvent) => void
  onRemoveFile: (filePath: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
        fontSize: 12, color: '#3A3A3C',
        borderBottom: '1px solid rgba(0,0,0,0.03)',
      }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); onDropFile(e) }}
    >
      {/* checkbox */}
      <button onClick={onToggle} style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${subtask.completed ? '#34C759' : '#D1D1D6'}`,
        background: subtask.completed ? '#34C759' : 'transparent',
        cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        {subtask.completed && <span style={{ fontSize: 8, color: 'white', lineHeight: 1 }}>✓</span>}
      </button>

      {/* 标题 */}
      <span style={{
        flex: 1, fontSize: 12,
        textDecoration: subtask.completed ? 'line-through' : 'none',
        color: subtask.completed ? '#8E8E93' : '#3A3A3C',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{subtask.title}</span>

      {/* DDL 按钮 */}
      <button
        onClick={() => window.electronAPI?.ddlPicker.open(subtask.dueDate)}
        title={subtask.dueDate ? formatDueDate(subtask.dueDate) : '设置截止时间'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, padding: '1px 3px', color: subtask.dueDate ? '#007AFF' : '#CCC',
          flexShrink: 0,
        }}
      >📅</button>

      {/* 关联文件小图标 */}
      {subtask.linkedFiles.length > 0 && (
        <span style={{ fontSize: 10, color: '#8E8E93', flexShrink: 0 }}>
          📎{subtask.linkedFiles.length}
        </span>
      )}

      {/* 拖拽高亮 */}
      {isDragOver && (
        <span style={{ fontSize: 10, color: '#2196F3', flexShrink: 0 }}>拖放</span>
      )}

      {/* 删除 */}
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, color: '#CCC', padding: '1px 3px', flexShrink: 0,
      }}>×</button>
    </div>
  )
}

// ── 小型子组件 ──────────────────────────────────────────────

function FileChip({ label, icon, missing, onClick, onRemove }: {
  label: string; icon: string; missing: boolean
  onClick: () => void; onRemove: () => void
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: missing ? '#F5F5F5' : '#EEF5FF',
      border: `1px solid ${missing ? '#DDD' : '#C3D9FF'}`,
      borderRadius: 6, padding: '2px 6px', fontSize: 11,
      opacity: missing ? 0.6 : 1, cursor: 'pointer',
      maxWidth: 120, overflow: 'hidden',
    }}>
      <span onClick={onClick}>{icon}</span>
      <span onClick={onClick} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
        {missing ? `${label} (缺失)` : label}
      </span>
      <span onClick={e => { e.stopPropagation(); onRemove() }} style={{ color: '#999', cursor: 'pointer', marginLeft: 2 }}>×</span>
    </div>
  )
}

function ActionBtn({ onClick, title, children }: {
  onClick: () => void; title?: string; children: React.ReactNode
}) {
  return (
    <button title={title} onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 13, padding: '2px 5px', borderRadius: 4,
      color: '#666', opacity: 0.7, transition: 'opacity 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
    onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
      {children}
    </button>
  )
}

function MenuItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '8px 14px', border: 'none', background: 'none',
      cursor: 'pointer', fontSize: 13,
      color: danger ? '#E53935' : '#333',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}>{children}</button>
  )
}

function Button({ onClick, children, variant }: {
  onClick: () => void; children: React.ReactNode
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const colors = {
    primary: { bg: '#1976D2', color: 'white' },
    secondary: { bg: '#F0F0F0', color: '#333' },
    danger: { bg: '#E53935', color: 'white' },
    ghost: { bg: 'transparent', color: '#999' },
  }
  const c = colors[variant]
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 6, border: 'none',
      background: c.bg, color: c.color, cursor: 'pointer', fontSize: 13,
    }}>{children}</button>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>{children}</div>
  )
}
