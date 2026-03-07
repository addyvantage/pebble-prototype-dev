import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { AuthProvider } from './providers/AuthProvider'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PlacementPage } from './pages/PlacementPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { CommunityPage } from './pages/CommunityPage'
import { SessionPage } from './pages/SessionPage'
import { ProfilePage } from './pages/ProfilePage'
import { OpsPage } from './pages/OpsPage'
import { AuthLoginPage } from './pages/auth/AuthLoginPage'
import { AuthSignupPage } from './pages/auth/AuthSignupPage'
import { AuthForgotPasswordPage } from './pages/auth/AuthForgotPasswordPage'
import { AuthThankYouPage } from './pages/auth/AuthThankYouPage'
import { AuthVerifyPage } from './pages/auth/AuthVerifyPage'
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage'
import { TermsPage } from './pages/legal/TermsPage'
import { CookiePolicyPage } from './pages/legal/CookiePolicyPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Main app (with nav/shell layout) ── */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/placement" element={<PlacementPage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ops" element={<OpsPage />} />
          <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/legal/terms" element={<TermsPage />} />
          <Route path="/legal/cookies" element={<CookiePolicyPage />} />
        </Route>

        {/* ── Auth flow (standalone, no nav) ── */}
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/signup" element={<AuthSignupPage />} />
        <Route path="/auth/forgot-password" element={<AuthForgotPasswordPage />} />
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        <Route path="/auth/verify-email" element={<AuthVerifyPage />} />
        <Route path="/auth/thank-you" element={<AuthThankYouPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
