import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { resolveWalker } from './lib/walker'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import Layout from './components/Layout'
import PlatformLanding from './pages/public/PlatformLanding'
import WalkerPage from './pages/public/WalkerPage'
import WalkerDirectory from './pages/public/WalkerDirectory'
import BookingFlow from './pages/public/BookingFlow'
import Confirmation from './pages/public/Confirmation'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'
import AccountLayout from './pages/account/AccountLayout'
import AccountDashboard from './pages/account/AccountDashboard'
import AccountBookings from './pages/account/AccountBookings'
import AccountPets from './pages/account/AccountPets'
import AccountPayments from './pages/account/AccountPayments'
import AccountInbox from './pages/account/AccountInbox'
import AccountProfile from './pages/account/AccountProfile'
import AccountWalkerPage from './pages/account/AccountWalkerPage'
import Onboarding from './pages/account/Onboarding'

function WalkerRoutes({ walker }) {
  return (
    <Routes>
      <Route element={<Layout walker={walker} />}>
        <Route index element={<WalkerPage />} />
        <Route path="book" element={<BookingFlow />} />
        <Route path="confirmation" element={<Confirmation />} />
      </Route>
    </Routes>
  )
}

function PlatformRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlatformLanding />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="walkers" element={<WalkerDirectory />} />

        {/* Path-based walker fallback for local dev */}
        <Route path="w/:walker" element={<WalkerPage />} />
        <Route path="w/:walker/book" element={<BookingFlow />} />
        <Route path="w/:walker/confirmation" element={<Confirmation />} />
      </Route>

      <Route path="account" element={<ProtectedRoute />}>
        <Route element={<AccountLayout />}>
          <Route index element={<AccountDashboard />} />
          <Route path="bookings" element={<AccountBookings />} />
          <Route path="pets" element={<AccountPets />} />
          <Route path="payments" element={<AccountPayments />} />
          <Route path="inbox" element={<AccountInbox />} />
          <Route path="profile" element={<AccountProfile />} />
          <Route path="walker-page" element={<AccountWalkerPage />} />
        </Route>
        <Route path="onboarding" element={<Onboarding />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const walker = resolveWalker(window.location.hostname)

  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        {walker ? <WalkerRoutes walker={walker} /> : <PlatformRoutes />}
      </BrowserRouter>
    </AuthProvider>
  )
}
