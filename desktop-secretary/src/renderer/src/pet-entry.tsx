import React from 'react'
import { createRoot } from 'react-dom/client'
import { PetApp } from './PetApp'

const root = createRoot(document.getElementById('root')!)
root.render(<PetApp />)
