import '@fontsource/rye/400.css'
import '@fontsource/smokum/400.css'
import '@fontsource/bitter/400.css'
import '@fontsource/bitter/600.css'
import './styles/base.css'
import './styles/game.css'
import './styles/setup.css'
import './styles/chips.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './state/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
