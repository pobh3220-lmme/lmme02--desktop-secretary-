// 角色1：团子（圆润软糯的球形生物）
import React from 'react'
import { motion } from 'framer-motion'
import type { PetAnimState } from '../../store/petStore'
import { useEyeTracking } from '../../hooks/useEyeTracking'

interface Props {
  animState: PetAnimState
  urgentCount: number
}

// 各状态的形变路径（圆形的弹性变体）
const bodyVariants = {
  idle: {
    d: 'M60 10 C90 10 110 30 110 60 C110 90 90 110 60 110 C30 110 10 90 10 60 C10 30 30 10 60 10 Z',
    fill: '#FFD6A5',
    scale: 1,
    transition: { duration: 2, repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' },
  },
  reminder: {
    d: 'M60 8 C92 8 112 28 112 62 C112 94 90 112 60 112 C28 112 8 92 8 62 C8 28 28 8 60 8 Z',
    fill: '#FFB347',
    scale: [1, 1.04, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
  anxious: {
    d: 'M60 15 C88 15 105 35 105 60 C105 85 88 105 60 105 C32 105 15 85 15 60 C15 35 32 15 60 15 Z',
    fill: '#C8A8E9',
    scale: 0.92,
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  urgent: {
    d: 'M60 10 C90 10 110 30 110 60 C110 90 90 110 60 110 C30 110 10 90 10 60 C10 30 30 10 60 10 Z',
    fill: '#FF6B6B',
    x: [0, -2, 2, -1, 1, 0],
    transition: { duration: 0.3, repeat: Infinity, ease: 'easeInOut' },
  },
  celebrate: {
    d: 'M60 5 C95 5 115 25 115 65 C115 95 92 115 60 115 C28 115 5 95 5 65 C5 25 25 5 60 5 Z',
    fill: '#7EC8E3',
    scale: [1, 1.15, 1],
    y: [0, -15, 0],
    transition: { duration: 0.5, repeat: 3, ease: 'backOut' },
  },
  click: {
    d: 'M60 5 C100 5 118 30 116 65 C114 98 88 118 60 116 C28 116 2 95 4 62 C6 28 20 5 60 5 Z',
    fill: '#FFD6A5',
    scale: [1, 1.2, 0.9, 1.05, 1],
    transition: { duration: 0.4, ease: 'backOut' },
  },
  drag: {
    d: 'M50 8 C88 6 115 28 112 62 C110 96 86 114 55 112 C22 110 5 88 8 58 C11 26 12 10 50 8 Z',
    fill: '#FFD6A5',
    rotate: [-3, 3],
    transition: { duration: 0.15, repeat: Infinity, repeatType: 'reverse' as const },
  },
  yawn: {
    d: 'M60 10 C90 10 110 30 110 60 C110 90 90 110 60 110 C30 110 10 90 10 60 C10 30 30 10 60 10 Z',
    fill: '#FFD6A5',
    scale: [1, 0.98, 1],
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
}

// 眼睛表情（Opt 4 — dx/dy 偏移实现眼睛跟踪鼠标）
function Eyes({ animState, dx, dy }: { animState: PetAnimState; dx: number; dy: number }) {
  if (animState === 'celebrate') {
    return (
      <>
        <path d={`M${44+dx} ${52+dy} Q${48+dx} ${46+dy} ${52+dx} ${52+dy}`} stroke="#5A4A42" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d={`M${68+dx} ${52+dy} Q${72+dx} ${46+dy} ${76+dx} ${52+dy}`} stroke="#5A4A42" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    )
  }
  if (animState === 'anxious') {
    return (
      <>
        <ellipse cx={48+dx} cy={56+dy} rx="4" ry="3" fill="#5A4A42" />
        <ellipse cx={72+dx} cy={56+dy} rx="4" ry="3" fill="#5A4A42" />
        <line x1={44+dx} y1={50+dy} x2={52+dx} y2={53+dy} stroke="#5A4A42" strokeWidth="1.5" />
        <line x1={68+dx} y1={53+dy} x2={76+dx} y2={50+dy} stroke="#5A4A42" strokeWidth="1.5" />
      </>
    )
  }
  if (animState === 'drag') {
    return (
      <>
        <path d={`M${44+dx} ${54+dy} Q${48+dx} ${62+dy} ${52+dx} ${54+dy}`} stroke="#5A4A42" strokeWidth="2" fill="none" />
        <path d={`M${68+dx} ${54+dy} Q${72+dx} ${62+dy} ${76+dx} ${54+dy}`} stroke="#5A4A42" strokeWidth="2" fill="none" />
      </>
    )
  }
  return (
    <>
      <ellipse cx={48+dx} cy={56+dy} rx="5" ry="5.5" fill="#5A4A42" />
      <ellipse cx={72+dx} cy={56+dy} rx="5" ry="5.5" fill="#5A4A42" />
      <ellipse cx={50+dx} cy={54+dy} rx="2" ry="2" fill="white" />
      <ellipse cx={74+dx} cy={54+dy} rx="2" ry="2" fill="white" />
    </>
  )
}

export function Tangyuan({ animState, urgentCount }: Props) {
  const variant = bodyVariants[animState] ?? bodyVariants.idle
  const { dx, dy } = useEyeTracking(3)

  return (
    <svg viewBox="0 0 120 120" width="75" height="75" style={{ overflow: 'visible' }}>
      {/* 身体 */}
      <motion.path
        animate={variant}
        initial={false}
      />

      {/* 腮红 */}
      <ellipse cx="35" cy="70" rx="8" ry="5" fill="#FFB3BA" opacity="0.6" />
      <ellipse cx="85" cy="70" rx="8" ry="5" fill="#FFB3BA" opacity="0.6" />

      {/* 眼睛 */}
      <Eyes animState={animState} dx={dx} dy={dy} />

      {/* 叹号（待办提醒状态） */}
      {animState === 'reminder' && (
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <text x="53" y="22" fontSize="16" fontWeight="bold" fill="#FF6B35">!</text>
        </motion.g>
      )}

      {/* 看手表（濒临逾期） */}
      {animState === 'urgent' && (
        <motion.g
          animate={{ rotate: [-10, 15, -5, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: urgentCount > 2 ? 10 : 15,
          }}
          style={{ transformOrigin: '85px 85px' }}
        >
          <circle cx="85" cy="85" r="8" fill="white" stroke="#5A4A42" strokeWidth="1.5" />
          <line x1="85" y1="85" x2="85" y2="79" stroke="#5A4A42" strokeWidth="1.5" />
          <line x1="85" y1="85" x2="90" y2="85" stroke="#5A4A42" strokeWidth="1" />
        </motion.g>
      )}

      {/* 打哈欠嘴巴 */}
      {animState === 'yawn' && (
        <motion.ellipse
          cx="60" cy="76"
          initial={{ rx: 3, ry: 2 }}
          animate={{ rx: 8, ry: 6 }}
          transition={{ delay: 0.5, duration: 0.8, repeat: 1, repeatType: 'reverse' }}
          fill="#5A4A42"
        />
      )}

      {/* 庆祝粒子 */}
      {animState === 'celebrate' && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.circle
              key={i}
              cx={40 + i * 10}
              cy={20}
              r={3}
              fill={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8', '#C77DFF'][i]}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.8, delay: i * 0.05 }}
            />
          ))}
        </>
      )}
    </svg>
  )
}
