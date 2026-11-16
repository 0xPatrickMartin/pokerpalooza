import '@fontsource/rye/400.css'
import '@fontsource/smokum/400.css'
import '@fontsource/bitter/400.css'
import '@fontsource/bitter/600.css'
import '../styles/base.css'
import '../styles/game.css'
import '../styles/chips.css'
import '../styles/picker.css'
import '../styles/viewer.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ViewerApp } from './ViewerApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>,
)
