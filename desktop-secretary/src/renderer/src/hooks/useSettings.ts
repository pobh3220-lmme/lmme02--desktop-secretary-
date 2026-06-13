import { useState, useEffect } from 'react'
import type { AppSettings } from '../../../shared/types/index'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.electronAPI?.settings.get().then(s => setSettings(s))
  }, [])

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const updated = await window.electronAPI?.settings.set(patch)
    if (updated) setSettings(updated)
    return updated
  }

  return { settings, updateSettings }
}
