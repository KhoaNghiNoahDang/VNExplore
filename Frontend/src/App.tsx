import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import AskPage from './pages/AskPage'
import FinishPage from './pages/FinishPage'
import PlacesPage from './pages/PlacesPage'
import QuestPage from './pages/QuestPage'
import RolePage from './pages/RolePage'
import StopPage from './pages/StopPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<AskPage />} />
        <Route path="/role" element={<RolePage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/quest" element={<QuestPage />} />
        <Route path="/go/:step" element={<StopPage />} />
        <Route path="/finish" element={<FinishPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
