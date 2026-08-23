import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useGame } from './state/GameContext'
import Layout from './components/shared/Layout'
import OnboardingFlow from './components/dashboard/OnboardingFlow'
import CityDashboard from './components/dashboard/CityDashboard'
import DefencePlan from './components/dashboard/DefencePlan'
import CapstoneChallenge from './components/dashboard/CapstoneChallenge'
import BreadcrumbsHub from './components/breadcrumbs/BreadcrumbsHub'
import FindAlexMission from './components/breadcrumbs/FindAlexMission'
import RecoveryRushHub from './components/recoveryRush/RecoveryRushHub'
import IncidentScenario from './components/recoveryRush/IncidentScenario'
import CommunityCentreHub from './components/communityCentre/CommunityCentreHub'
import ResidentMission from './components/communityCentre/ResidentMission'
import GuardianMode from './components/communityCentre/GuardianMode'

function ProtectedLayout() {
  const { onboarded } = useGame()
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<CityDashboard />} />
        <Route path="/defence-plan" element={<DefencePlan />} />
        <Route path="/final-challenge" element={<CapstoneChallenge />} />
        <Route path="/breadcrumbs" element={<BreadcrumbsHub />} />
        <Route path="/breadcrumbs/find-alex" element={<FindAlexMission />} />
        <Route path="/recovery-rush" element={<RecoveryRushHub />} />
        <Route path="/recovery-rush/:levelId" element={<IncidentScenario />} />
        <Route path="/community-centre" element={<CommunityCentreHub />} />
        <Route path="/community-centre/guardian" element={<GuardianMode />} />
        <Route path="/community-centre/:residentId" element={<ResidentMission />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
