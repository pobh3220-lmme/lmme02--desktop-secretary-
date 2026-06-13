// 角色2：云朵（蓬松棉花糖云）
import React from 'react'
import { motion } from 'framer-motion'
import type { PetAnimState } from '../../store/petStore'
import { useEyeTracking } from '../../hooks/useEyeTracking'

interface Props {
  animState: PetAnimState
  urgentCount: number
}

const CLOUD_COLORS: Record<PetAnimState, string> = {
  idle: '#E8F4FD',
  reminder: '#FFF3CD',
  anxious: '#D3D3E0',
  urgent: '#FFCDD2',
  celebrate: '#E8F5E9',
  click: '#E8F4FD',
  drag: '#E8F4FD',
  yawn: '#E8F4FD',
}

export function Cloud({ animState, urgentCount }: Props) {
  const fill = CLOUD_COLORS[animState] ?? CLOUD_COLORS.idle
  const isUrgent = animState === 'urgent'
  const { dx, dy } = useEyeTracking(3)

  return (
    <svg viewBox="0 0 120 100" width="75" height="65" style={{ overflow: 'visible' }}>
      <motion.g
        animate={
          isUrgent
            ? { x: [0, -3, 3, -2, 2, 0] }
            : animState === 'celebrate'
            ? { y: [0, -18, 0] }
            : animState === 'click'
            ? { scale: [1, 1.15, 0.95, 1] }
            : { y: [0, -4, 0] }
        }
        transition={
          isUrgent
            ? { duration: 0.35, repeat: Infinity }
            : animState === 'celebrate'
            ? { duration: 0.5, repeat: 3 }
            : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ transformOrigin: '60px 50px' }}
      >
        {/* 云朵主体 */}
        <ellipse cx="60" cy="60" rx="42" ry="28" fill={fill} />
        <ellipse cx="38" cy="52" rx="22" ry="20" fill={fill} />
        <ellipse cx="82" cy="52" rx="22" ry="20" fill={fill} />
        <ellipse cx="60" cy="42" rx="24" ry="22" fill={fill} />

        {/* 描边 */}
        <ellipse cx="60" cy="60" rx="42" ry="28" fill="none" stroke="#B8D4E8" strokeWidth="1.5" />
        <ellipse cx="38" cy="52" rx="22" ry="20" fill="none" stroke="#B8D4E8" strokeWidth="1.5" />
        <ellipse cx="82" cy="52" rx="22" ry="20" fill="none" stroke="#B8D4E8" strokeWidth="1.5" />
        <ellipse cx="60" cy="42" rx="24" ry="22" fill="none" stroke="#B8D4E8" strokeWidth="1.5" />

        {/* 眼睛 */}
        {animState === 'anxious' ? (
          <>
            <ellipse cx={50+dx} cy={58+dy} rx="4" ry="3" fill="#7A7A8A" />
            <ellipse cx={70+dx} cy={58+dy} rx="4" ry="3" fill="#7A7A8A" />
            <line x1={46+dx} y1={52+dy} x2={54+dx} y2={55+dy} stroke="#7A7A8A" strokeWidth="1.5" />
            <line x1={66+dx} y1={55+dy} x2={74+dx} y2={52+dy} stroke="#7A7A8A" strokeWidth="1.5" />
          </>
        ) : animState === 'celebrate' ? (
          <>
            <path d={`M${46+dx} ${56+dy} Q${50+dx} ${50+dy} ${54+dx} ${56+dy}`} stroke="#5A6A7A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d={`M${66+dx} ${56+dy} Q${70+dx} ${50+dy} ${74+dx} ${56+dy}`} stroke="#5A6A7A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx={50+dx} cy={58+dy} rx="5" ry="5" fill="#5A6A7A" />
            <ellipse cx={70+dx} cy={58+dy} rx="5" ry="5" fill="#5A6A7A" />
            <ellipse cx={52+dx} cy={56+dy} rx="2" ry="2" fill="white" />
            <ellipse cx={72+dx} cy={56+dy} rx="2" ry="2" fill="white" />
          </>
        )}

        {/* 嘴巴（打哈欠） */}
        {animState === 'yawn' && (
          <motion.ellipse cx="60" cy="70" rx={5} ry={4}
            animate={{ rx: 9, ry: 7 }}
            transition={{ delay: 0.6, duration: 0.7, repeat: 1, repeatType: 'reverse' }}
            fill="#7A8A9A"
          />
        )}

        {/* 叹号 */}
        {animState === 'reminder' && (
          <motion.text x="53" y="26" fontSize="16" fontWeight="bold" fill="#E67E22"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >!</motion.text>
        )}

        {/* 看手表 */}
        {isUrgent && (
          <motion.g
            animate={{ rotate: [-10, 15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: urgentCount > 2 ? 8 : 15 }}
            style={{ transformOrigin: '88px 78px' }}
          >
            <circle cx="88" cy="78" r="7" fill="white" stroke="#7A8A9A" strokeWidth="1.5" />
            <line x1="88" y1="78" x2="88" y2="73" stroke="#7A8A9A" strokeWidth="1.5" />
            <line x1="88" y1="78" x2="92" y2="78" stroke="#7A8A9A" strokeWidth="1" />
          </motion.g>
        )}
      </motion.g>
    </svg>
  )
}
