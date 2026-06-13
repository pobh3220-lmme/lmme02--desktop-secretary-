import { create } from 'zustand'

// ============================================================
// 宠物动画状态机 — 8种状态 + 优先级规则
// 优先级（高→低）：交互反馈(5) > 濒临逾期(4) > 焦虑(3) > 完成庆祝(2) > 待办提醒(1) > 常态(0)
// ============================================================

export type PetAnimState =
  | 'idle'          // 常态 (priority 0)
  | 'reminder'      // 待办提醒 (priority 1)
  | 'celebrate'     // 完成庆祝 (priority 2)
  | 'anxious'       // 焦虑 (priority 3)
  | 'urgent'        // 濒临逾期警告 (priority 4)
  | 'click'         // 点击交互 (priority 5)
  | 'drag'          // 拖拽交互 (priority 5)
  | 'yawn'          // 打哈欠/碰边 (priority 1)

const PRIORITY: Record<PetAnimState, number> = {
  idle: 0,
  reminder: 1,
  yawn: 1,
  celebrate: 2,
  anxious: 3,
  urgent: 4,
  click: 5,
  drag: 5,
}

interface PetStore {
  animState: PetAnimState
  urgentCount: number    // 临近逾期的待办数量（影响抖动速度）
  isDragging: boolean
  lastInteractionAt: number

  // 触发动画
  triggerState: (state: PetAnimState) => void
  endInteraction: () => void  // 交互结束后重新评估状态

  // 基于任务数据更新宠物状态
  updateFromTodos: (params: {
    hasQ1: boolean      // 是否有象限1待办
    activeTodoCount: number
    urgentCount: number // DDL ≤ 60min 的待办数
    justCompletedAll: boolean
  }) => void

  setDragging: (v: boolean) => void
  recordInteraction: () => void
}

export const usePetStore = create<PetStore>((set, get) => ({
  animState: 'idle',
  urgentCount: 0,
  isDragging: false,
  lastInteractionAt: Date.now(),

  triggerState: (state: PetAnimState) => {
    const { animState } = get()
    if (PRIORITY[state] >= PRIORITY[animState]) {
      set({ animState: state })
    }
  },

  endInteraction: () => {
    // 交互结束后根据任务状态重新评估
    // 这里简单回到 idle，实际重新评估由 updateFromTodos 驱动
    set({ animState: 'idle' })
  },

  updateFromTodos: ({ hasQ1, activeTodoCount, urgentCount, justCompletedAll }) => {
    set({ urgentCount })
    const { animState } = get()

    // 完成庆祝优先（一次性）
    if (justCompletedAll) {
      if (PRIORITY['celebrate'] >= PRIORITY[animState]) {
        set({ animState: 'celebrate' })
      }
      return
    }

    // 濒临逾期（最高业务优先级）
    if (urgentCount > 0) {
      if (PRIORITY['urgent'] >= PRIORITY[animState]) {
        set({ animState: 'urgent' })
      }
      return
    }

    // 焦虑（待办 > 10 且无临近逾期）
    if (activeTodoCount > 10) {
      if (PRIORITY['anxious'] >= PRIORITY[animState]) {
        set({ animState: 'anxious' })
      }
      return
    }

    // 待办提醒（有象限1）
    if (hasQ1) {
      if (PRIORITY['reminder'] >= PRIORITY[animState]) {
        set({ animState: 'reminder' })
      }
      return
    }

    // 常态（仅当前为低优先级状态时重置）
    if (PRIORITY[animState] <= PRIORITY['reminder']) {
      set({ animState: 'idle' })
    }
  },

  setDragging: (v: boolean) => {
    set({ isDragging: v })
    if (v) {
      set({ animState: 'drag' })
    } else {
      get().endInteraction()
    }
  },

  recordInteraction: () => {
    set({ lastInteractionAt: Date.now() })
  },
}))
