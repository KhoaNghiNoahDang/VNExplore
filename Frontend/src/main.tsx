import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { wakeBackend } from './lib/backend'
import { AuthProvider } from './store/AuthContext'
import { QuestProvider } from './store/QuestContext'
import './index.css'

wakeBackend()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QuestProvider>
          <App />
        </QuestProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
