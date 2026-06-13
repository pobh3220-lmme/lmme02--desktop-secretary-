import React, { useEffect, useRef, useCallback, useState } from 'react'
import { usePetStore } from '../../store/petStore'
import { useTodoStore } from '../../store/todoStore'
import { PetCharacter } from './PetCharacter'
import { useSettings } from '../../hooks/useSettings'

// ============================================================
// PetWindow — 宠物窗口根组件
// 处理：拖拽、鼠标穿透、面板触发、无操作检测
// ============================================================

export function PetWindow() {
  const { animState, urgentCount, isDragging, setDragging, triggerState, endInteraction, updateFromTodos, recordInteraction } = usePetStore()
  const { todos, loadAll } = useTodoStore()
  const { settings } = useSettings()
  const [panelPinned, setPanelPinned] = useState(false)
  // 用 ref 跟踪钉住状态，避免闭包陈旧问题
  const panelPinnedRef = useRef(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevActiveTodoCount = useRef(0)
  const dragStarted = useRef(false)

  const cancelLeaveTimer = () => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
  }

  // 加载待办数据
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Task 4.11 — 无操作30分钟后打哈欠
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      usePetStore.getState().triggerState('yawn')
      setTimeout(() => usePetStore.getState().endInteraction(), 3000)
    }, 30 * 60 * 1000)
  }, [])

  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [resetIdleTimer])

  // 监听逾期更新
  useEffect(() => {
    const handler = () => {
      loadAll()
    }
    window.electronAPI?.on('todo:overdueUpdate', handler)
    return () => window.electronAPI?.off('todo:overdueUpdate', handler)
  }, [loadAll])

  // 监听面板关闭事件（用户点击 × 或取消钉住时同步状态）
  useEffect(() => {
    const handler = () => {
      setPanelPinned(false)
      panelPinnedRef.current = false
    }
    window.electronAPI?.on('panel:pinChanged', handler)
    return () => window.electronAPI?.off('panel:pinChanged', handler)
  }, [])

  // Bug 5 — 监听面板鼠标进入/离开事件，实现悬浮面板可操作
  // 用 ref 替代闭包捕获的 panelPinned，避免陈旧值问题
  useEffect(() => {
    const enterHandler = () => {
      cancelLeaveTimer()
    }
    const leaveHandler = () => {
      if (panelPinnedRef.current) return
      cancelLeaveTimer()
      leaveTimer.current = setTimeout(() => {
        window.electronAPI?.panel.hide()
      }, 300)
    }
    window.electronAPI?.on('panel:mouseEnter', enterHandler)
    window.electronAPI?.on('panel:mouseLeave', leaveHandler)
    return () => {
      window.electronAPI?.off('panel:mouseEnter', enterHandler)
      window.electronAPI?.off('panel:mouseLeave', leaveHandler)
    }
  }, []) // 空依赖 — 用 ref 读取最新状态

  // Task 4.3 / 4.12 — 根据待办状态更新宠物动画
  useEffect(() => {
    const activeTodos = todos.filter(t => t.status === 'active')
    const now = Date.now()

    const hasQ1 = activeTodos.some(t => t.quadrant === 1)
    const urgentCountLocal = activeTodos.filter(
      t => t.dueDate !== null && t.dueDate - now <= 60 * 60 * 1000
    ).length
    const justCompletedAll =
      prevActiveTodoCount.current > 0 && activeTodos.length === 0
    prevActiveTodoCount.current = activeTodos.length

    updateFromTodos({
      hasQ1,
      activeTodoCount: activeTodos.length,
      urgentCount: urgentCountLocal,
      justCompletedAll,
    })

    // 庆祝结束后恢复
    if (justCompletedAll) {
      setTimeout(() => usePetStore.getState().endInteraction(), 3000)
    }
  }, [todos, updateFromTodos])

  // Task 3.4 / 4.10 — 拖拽实现
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    recordInteraction()
    resetIdleTimer()

    // 清除悬浮/离开计时器，防止拖拽中面板闪动
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    cancelLeaveTimer()

    const pos = await window.electronAPI?.pet.getPosition()
    dragStartPos.current = {
      mouseX: e.screenX,
      mouseY: e.screenY,
      winX: pos?.x ?? 0,
      winY: pos?.y ?? 0,
    }

    dragStarted.current = false
    const DRAG_THRESHOLD = 5

    const onMouseMove = async (me: MouseEvent) => {
      if (!dragStartPos.current) return
      const dx = me.screenX - dragStartPos.current.mouseX
      const dy = me.screenY - dragStartPos.current.mouseY
      // Bug 1 fix — 只在真正拖拽（移动 > 阈值）时才隐藏面板，长按不触发
      if (!dragStarted.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
      if (!dragStarted.current) {
        dragStarted.current = true
        window.electronAPI?.panel.hide()
      }
      if (!isDragging) setDragging(true)
      await window.electronAPI?.pet.move(
        dragStartPos.current.winX + dx,
        dragStartPos.current.winY + dy
      )
    }

    const onMouseUp = () => {
      dragStartPos.current = null
      const shouldShowPanel = panelPinnedRef.current
      setDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      // 拖拽结束后，如果是钉住状态则重新显示面板
      if (shouldShowPanel && dragStarted.current) {
        window.electronAPI?.panel.show()
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [isDragging, setDragging, recordInteraction, resetIdleTimer])

  // Task 5.1 — 双击宠物切换钉住面板
  const handleDoubleClick = useCallback(() => {
    recordInteraction()
    resetIdleTimer()
    const newPinned = !panelPinnedRef.current
    setPanelPinned(newPinned)
    panelPinnedRef.current = newPinned
    cancelLeaveTimer()
    if (newPinned) {
      window.electronAPI?.panel.pin()
    } else {
      window.electronAPI?.panel.unpin()
    }
  }, [recordInteraction, resetIdleTimer])

  // Task 4.9 — 点击反馈（用于单次交互，双击由 onDoubleClick 处理）
  const handleClick = useCallback(() => {
    if (isDragging) return
    if (dragStarted.current) return
    recordInteraction()
    resetIdleTimer()
    triggerState('click')
    setTimeout(() => endInteraction(), 600)
  }, [isDragging, triggerState, endInteraction, recordInteraction, resetIdleTimer])

  // Task 5.1 — 悬浮300ms呼出面板
  const handleMouseEnter = useCallback(() => {
    if (panelPinnedRef.current) return
    cancelLeaveTimer()
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      window.electronAPI?.panel.show()
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (panelPinnedRef.current) return
    if (isDragging) return
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    // Bug 5 — 延迟增加到 800ms，留出时间让鼠标移入面板
    leaveTimer.current = setTimeout(() => {
      window.electronAPI?.panel.hide()
    }, 800)
  }, [isDragging])

  const char = settings?.petCharacter ?? 'tangyuan'

  return (
    <div
      ref={containerRef}
      className={`pet-body${isDragging ? ' dragging' : ''}`}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PetCharacter
        character={char}
        animState={animState}
        urgentCount={urgentCount}
      />
    </div>
  )
}
