import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import ServiceBooking from './pages/public/ServiceBooking'
import BookingFlow from './pages/public/BookingFlow'
import Confirmation from './pages/public/Confirmation'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'
import ForgotPassword from './pages/public/ForgotPassword'
import ResetPassword from './pages/public/ResetPassword'
import AccountLayout from './pages/account/AccountLayout'
import AccountBookings from './pages/account/AccountBookings'
import AccountPets from './pages/account/AccountPets'
import AccountMoney from './pages/account/AccountMoney'
import AccountMessages from './pages/account/AccountMessages'
import AccountProfile from './pages/account/AccountProfile'
import AccountSettingsLayout from './pages/account/AccountSettingsLayout'
import AccountAvailability from './pages/account/AccountAvailability'
import AccountCalendarSync from './pages/account/AccountCalendarSync'
import AccountStripe from './pages/account/AccountStripe'
import AccountNotifications from './pages/account/AccountNotifications'
import { useAuth } from './hooks/useAuth'

function SettingsIndex() {
  const { walkerProfile } = useAuth()
  return <Navigate to={walkerProfile ? 'availability' : 'notifications'} replace />
}
import AccountServices from './pages/account/AccountServices'
import ServiceDetail from './pages/account/ServiceDetail'
import AccountCustomers from './pages/account/AccountCustomers'
import CustomerDetail from './pages/account/CustomerDetail'
import BookingDetail from './pages/account/BookingDetail'
import PaymentDetail from './pages/account/PaymentDetail'

function WalkerRoutes({ walker }) {
  return (
    <Routes>
      <Route element={<Layout walker={walker} />}>
        <Route index element={<WalkerPage />} />
        <Route path="book/:serviceId" element={<ServiceBooking />} />
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
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Path-based walker fallback for local dev */}
        <Route path="w/:walker" element={<WalkerPage />} />
        <Route path="w/:walker/book/:serviceId" element={<ServiceBooking />} />
        <Route path="w/:walker/book" element={<BookingFlow />} />
        <Route path="w/:walker/confirmation" element={<Confirmation />} />
      </Route>

      <Route path="account" element={<ProtectedRoute />}>
        <Route element={<AccountLayout />}>
          <Route index element={<Navigate to="/account/bookings" replace />} />
          <Route path="bookings" element={<AccountBookings />} />
          <Route path="bookings/:bookingId" element={<BookingDetail />} />
          <Route path="pets" element={<AccountPets />} />
          <Route path="money" element={<AccountMoney />} />
          <Route path="payments" element={<Navigate to="/account/money" replace />} />
          <Route path="payments/:paymentId" element={<PaymentDetail />} />
          <Route path="messages" element={<AccountMessages />} />
          <Route path="inbox" element={<Navigate to="/account/messages" replace />} />
          <Route path="notifications" element={<Navigate to="/account/settings/notifications" replace />} />
          <Route path="services" element={<AccountServices />} />
          <Route path="services/:serviceId" element={<ServiceDetail />} />
          <Route path="customers" element={<AccountCustomers />} />
          <Route path="customers/:clientId" element={<CustomerDetail />} />
          <Route path="profile" element={<AccountProfile />} />
          <Route path="settings" element={<AccountSettingsLayout />}>
            <Route index element={<SettingsIndex />} />
            <Route path="availability" element={<AccountAvailability />} />
            <Route path="calendar-sync" element={<AccountCalendarSync />} />
            <Route path="stripe" element={<AccountStripe />} />
            <Route path="notifications" element={<AccountNotifications />} />
          </Route>
        </Route>
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
