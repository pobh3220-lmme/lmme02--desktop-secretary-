import { useState, useEffect, useRef } from 'react'

// ============================================================
// useEyeTracking — 宠物眼睛追踪鼠标位置
// 返回 { dx, dy } 偏移量，范围 [-maxOffset, +maxOffset]
// ============================================================

export function useEyeTracking(maxOffset = 3) {
  const [offset, setOffset] = useState({ dx: 0, dy: 0 })
  const petPosRef = useRef<{ x: number; y: number } | null>(null)
  const petSize = 80 // 窗口尺寸

  useEffect(() => {
    // 获取宠物窗口在屏幕上的位置
    window.electronAPI?.pet.getPosition().then(pos => {
      petPosRef.current = pos
    })

    const handleMouseMove = (e: MouseEvent) => {
      if (!petPosRef.current) return
      const petCx = petPosRef.current.x + petSize / 2
      const petCy = petPosRef.current.y + petSize / 2
      const dx = Math.max(-maxOffset, Math.min(maxOffset, (e.screenX - petCx) / 8))
      const dy = Math.max(-maxOffset, Math.min(maxOffset, (e.screenY - petCy) / 8))
      setOffset({ dx, dy })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [maxOffset])

  return offset
}
