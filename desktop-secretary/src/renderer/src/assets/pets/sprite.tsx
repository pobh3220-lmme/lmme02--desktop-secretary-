// 角色3：小精灵（六角星形发光生物）
import React from 'react'
import { motion } from 'framer-motion'
import type { PetAnimState } from '../../store/petStore'
import { useEyeTracking } from '../../hooks/useEyeTracking'

interface Props {
  animState: PetAnimState
  urgentCount: number
}

const SPRITE_COLORS: Record<PetAnimState, string> = {
  idle: '#A8DADC',
  reminder: '#FFE0A3',
  anxious: '#C8B8D8',
  urgent: '#FF8FAB',
  celebrate: '#B7E4C7',
  click: '#A8DADC',
  drag: '#7FC8E8',
  yawn: '#A8DADC',
}

export function Sprite({ animState, urgentCount }: Props) {
  const fill = SPRITE_COLORS[animState] ?? SPRITE_COLORS.idle
  const { dx, dy } = useEyeTracking(3)

  // 六角星路径
  const starPath = 'M60 15 L67 40 L93 40 L72 56 L79 82 L60 66 L41 82 L48 56 L27 40 L53 40 Z'

  return (
    <svg viewBox="0 0 120 100" width="75" height="65" style={{ overflow: 'visible' }}>
      {/* 光晕 */}
      <motion.ellipse
        cx="60" cy="55" rx="48" ry="42"
        fill={fill}
        opacity={0.2}
        animate={
          animState === 'urgent'
            ? { opacity: [0.2, 0.5, 0.2] }
            : { opacity: [0.15, 0.25, 0.15] }
        }
        transition={{ duration: animState === 'urgent' ? 0.4 : 2, repeat: Infinity }}
      />

      <motion.g
        animate={
          animState === 'urgent'
            ? { x: [0, -3, 3, -1, 1, 0] }
            : animState === 'celebrate'
            ? { y: [0, -20, 0], rotate: [0, 15, -10, 0] }
            : animState === 'anxious'
            ? { scale: 0.9 }
            : animState === 'click'
            ? { scale: [1, 1.25, 0.9, 1.05, 1] }
            : { y: [0, -5, 0], rotate: [0, 2, -2, 0] }
        }
        transition={
          animState === 'urgent'
            ? { duration: 0.3, repeat: Infinity }
            : animState === 'celebrate'
            ? { duration: 0.6, repeat: 3 }
            : animState === 'click'
            ? { duration: 0.5, ease: 'backOut' }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ transformOrigin: '60px 50px' }}
      >
        {/* 主星形 */}
        <motion.path d={starPath} fill={fill} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />

        {/* 内发光 */}
        <motion.path
          d={starPath}
          fill="none"
          stroke="white"
          strokeWidth="3"
          opacity={0.4}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* 眼睛 */}
        {animState === 'celebrate' ? (
          <>
            <path d={`M${50+dx} ${52+dy} Q${54+dx} ${46+dy} ${58+dx} ${52+dy}`} stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d={`M${62+dx} ${52+dy} Q${66+dx} ${46+dy} ${70+dx} ${52+dy}`} stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : animState === 'anxious' ? (
          <>
            <ellipse cx={53+dx} cy={54+dy} rx="3.5" ry="3" fill="rgba(255,255,255,0.9)" />
            <ellipse cx={67+dx} cy={54+dy} rx="3.5" ry="3" fill="rgba(255,255,255,0.9)" />
          </>
        ) : (
          <>
            <ellipse cx={53+dx} cy={54+dy} rx="5" ry="5" fill="white" />
            <ellipse cx={67+dx} cy={54+dy} rx="5" ry="5" fill="white" />
            <ellipse cx={54+dx} cy={53+dy} rx="2" ry="2" fill="rgba(0,0,0,0.4)" />
            <ellipse cx={68+dx} cy={53+dy} rx="2" ry="2" fill="rgba(0,0,0,0.4)" />
          </>
        )}

        {/* 叹号 */}
        {animState === 'reminder' && (
          <motion.text x="54" y="22" fontSize="14" fontWeight="bold" fill="#E67E22"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >!</motion.text>
        )}

        {/* 看手表 */}
        {animState === 'urgent' && (
          <motion.g
            animate={{ rotate: [-8, 12, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: urgentCount > 2 ? 8 : 16 }}
            style={{ transformOrigin: '85px 80px' }}
          >
            <circle cx="85" cy="80" r="7" fill="white" stroke={fill} strokeWidth="1.5" />
            <line x1="85" y1="80" x2="85" y2="75" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
            <line x1="85" y1="80" x2="89" y2="80" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
          </motion.g>
        )}
      </motion.g>

      {/* 庆祝粒子 */}
      {animState === 'celebrate' && (
        [...Array(8)].map((_, i) => (
          <motion.circle key={i}
            cx={30 + i * 10} cy={15}
            r={2.5}
            fill={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8', '#C77DFF', '#FF9F43', '#54A0FF'][i]}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -28, x: (i - 3.5) * 4, opacity: 0 }}
            transition={{ duration: 0.9, delay: i * 0.06 }}
          />
        ))
      )}
    </svg>
  )
}
