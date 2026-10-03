import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { RequireStart } from './components/NeedStart'
import TabBar from './components/TabBar'
import AskPage from './pages/AskPage'
import CreateQuestPage from './pages/CreateQuestPage'
import FinishPage from './pages/FinishPage'
import LoginPage from './pages/LoginPage'
import MePage from './pages/MePage'
import PartyPage from './pages/PartyPage'
import PassportPage from './pages/PassportPage'
import PlacesPage from './pages/PlacesPage'
import QuestPage from './pages/QuestPage'
import QuestSharePage from './pages/QuestSharePage'
import QuestsPage from './pages/QuestsPage'
import ResetPage from './pages/ResetPage'
import RolePage from './pages/RolePage'
import StopPage from './pages/StopPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<AskPage />} />
        <Route path="/role" element={<RequireStart><RolePage /></RequireStart>} />
        <Route path="/places" element={<RequireStart><PlacesPage /></RequireStart>} />
        <Route path="/quest" element={<RequireStart><QuestPage /></RequireStart>} />
        <Route path="/go/:step" element={<StopPage />} />
        <Route path="/finish" element={<FinishPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/passport" element={<PassportPage />} />
        <Route path="/quests" element={<QuestsPage />} />
        <Route path="/create" element={<CreateQuestPage />} />
        <Route path="/q/:id" element={<QuestSharePage />} />
        <Route path="/party/:code" element={<PartyPage />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </AppShell>
  )
}
