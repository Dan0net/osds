import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { resolveWalker } from './lib/walker'
import Layout from './components/Layout'
import PlatformLanding from './pages/public/PlatformLanding'
import WalkerPage from './pages/public/WalkerPage'
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
import AccountSettings from './pages/account/AccountSettings'

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

        {/* Path-based walker fallback for local dev */}
        <Route path="w/:walker" element={<WalkerPage />} />
        <Route path="w/:walker/book" element={<BookingFlow />} />
        <Route path="w/:walker/confirmation" element={<Confirmation />} />
      </Route>

      <Route path="account" element={<AccountLayout />}>
        <Route index element={<AccountDashboard />} />
        <Route path="bookings" element={<AccountBookings />} />
        <Route path="pets" element={<AccountPets />} />
        <Route path="payments" element={<AccountPayments />} />
        <Route path="inbox" element={<AccountInbox />} />
        <Route path="profile" element={<AccountProfile />} />
        <Route path="settings" element={<AccountSettings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const walker = resolveWalker(window.location.hostname)

  return (
    <BrowserRouter>
      {walker ? <WalkerRoutes walker={walker} /> : <PlatformRoutes />}
    </BrowserRouter>
  )
}
