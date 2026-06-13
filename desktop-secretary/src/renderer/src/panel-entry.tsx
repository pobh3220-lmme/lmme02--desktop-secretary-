import React from 'react'
import { createRoot } from 'react-dom/client'
import { PanelApp } from './PanelApp'

const root = createRoot(document.getElementById('root')!)
root.render(<PanelApp />)
