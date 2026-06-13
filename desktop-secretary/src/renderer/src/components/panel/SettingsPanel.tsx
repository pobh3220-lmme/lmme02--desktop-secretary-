import React from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '../../hooks/useSettings'
import type { PetCharacter, PetPositionMode } from '../../../../shared/types/index'

// ============================================================
// SettingsPanel — 设置面板（通过面板内嵌入口或托盘菜单调用）
// ============================================================

interface Props {
  onClose: () => void
}

const PET_OPTIONS: { id: PetCharacter; label: string; emoji: string }[] = [
  { id: 'tangyuan', label: '团子', emoji: '🟡' },
  { id: 'cloud', label: '云朵', emoji: '☁️' },
  { id: 'sprite', label: '小精灵', emoji: '✨' },
]

export function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useSettings()
  if (!settings) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        position: 'absolute', inset: 0,
        background: '#F5F7FA',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'white', borderBottom: '1px solid #EBEBEB',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>设置</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999' }}>×</button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {/* Task 12.2 — 宠物角色切换 */}
        <Section title="宠物角色">
          <div style={{ display: 'flex', gap: 8 }}>
            {PET_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => updateSettings({ petCharacter: opt.id })}
                style={{
                  flex: 1, padding: '10px 6px',
                  borderRadius: 10,
                  border: `2px solid ${settings.petCharacter === opt.id ? '#2196F3' : '#E0E0E0'}`,
                  background: settings.petCharacter === opt.id ? '#EEF5FF' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22 }}>{opt.emoji}</div>
                <div style={{ fontSize: 11, marginTop: 4, color: '#555' }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Task 12.3 — 定位模式切换 */}
        <Section title="宠物定位">
          {(['fixed', 'follow-mouse'] as PetPositionMode[]).map(mode => (
            <label key={mode} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0', cursor: 'pointer',
            }}>
              <input
                type="radio"
                name="petMode"
                checked={settings.petPositionMode === mode}
                onChange={() => updateSettings({ petPositionMode: mode })}
              />
              <span style={{ fontSize: 13 }}>
                {mode === 'fixed' ? '固定位置' : '跟随鼠标'}
              </span>
            </label>
          ))}
        </Section>
      </div>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
