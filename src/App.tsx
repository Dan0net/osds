import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { resolveWalker } from '@/utils/walker'
import { AuthProvider } from '@/auth/AuthContext'
import { useAuth } from '@/auth/useAuth'
import ProtectedRoute from '@/shared/ProtectedRoute'
import Layout from '@/shared/Layout'
import AccountLayout from '@/shared/AccountLayout'
import AccountSettingsLayout from '@/shared/AccountSettingsLayout'
import PlatformLanding from '@/features/public/PlatformLanding'
import WalkerPage from '@/features/public/WalkerPage'
import ServiceBooking from '@/features/public/ServiceBooking'
import BookingFlow from '@/features/public/BookingFlow'
import Confirmation from '@/auth/Confirmation'
import Login from '@/auth/Login'
import Signup from '@/auth/Signup'
import ForgotPassword from '@/auth/ForgotPassword'
import ResetPassword from '@/auth/ResetPassword'
import AccountBookings from '@/features/bookings/AccountBookings'
import BookingDetail from '@/features/bookings/BookingDetail'
import AccountPets from '@/features/pets/AccountPets'
import AccountMoney from '@/features/payments/AccountMoney'
import PaymentDetail from '@/features/payments/PaymentDetail'
import AccountMessages from '@/features/messages/AccountMessages'
import ConversationDetail from '@/features/messages/ConversationDetail'
import AccountProfile from '@/features/profile/AccountProfile'
import AccountAvailability from '@/features/calendar/AccountAvailability'
import AccountCalendarSync from '@/features/calendar/AccountCalendarSync'
import AccountStripe from '@/features/profile/AccountStripe'
import AccountNotifications from '@/features/profile/AccountNotifications'
import AccountServices from '@/features/services/AccountServices'
import ServiceDetail from '@/features/services/ServiceDetail'
import AccountCustomers from '@/features/customers/AccountCustomers'
import CustomerDetail from '@/features/customers/CustomerDetail'
import AccountWalkers from '@/features/walkers/AccountWalkers'
import WalkerDetail from '@/features/walkers/WalkerDetail'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function SettingsIndex() {
  const { walkerProfile } = useAuth()
  return <Navigate to={walkerProfile ? 'availability' : 'notifications'} replace />
}

function PaymentLegacyRedirect() {
  const { paymentId } = useParams()
  return <Navigate to={`/account/money/${paymentId}`} replace />
}

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

        <Route path="w/:walker" element={<WalkerPage />} />
        <Route path="w/:walker/book/:serviceId" element={<ServiceBooking />} />
        <Route path="w/:walker/book" element={<BookingFlow />} />
        <Route path="w/:walker/confirmation" element={<Confirmation />} />
      </Route>

      <Route path="account" element={<ProtectedRoute />}>
        <Route element={<AccountLayout />}>
          <Route index element={<Navigate to="/account/bookings" replace />} />
          <Route path="bookings" element={<AccountBookings />}>
            <Route path=":bookingId" element={<BookingDetail />} />
          </Route>
          <Route path="pets" element={<AccountPets />} />
          <Route path="money" element={<AccountMoney />}>
            <Route path=":paymentId" element={<PaymentDetail />} />
          </Route>
          <Route path="payments" element={<Navigate to="/account/money" replace />} />
          <Route path="payments/:paymentId" element={<PaymentLegacyRedirect />} />
          <Route path="messages" element={<AccountMessages />}>
            <Route path=":conversationId" element={<ConversationDetail />} />
          </Route>
          <Route path="inbox" element={<Navigate to="/account/messages" replace />} />
          <Route path="notifications" element={<Navigate to="/account/settings/notifications" replace />} />
          <Route path="services" element={<AccountServices />}>
            <Route path=":serviceId" element={<ServiceDetail />} />
          </Route>
          <Route path="customers" element={<AccountCustomers />}>
            <Route path=":clientId" element={<CustomerDetail />} />
          </Route>
          <Route path="walkers" element={<AccountWalkers />}>
            <Route path=":walkerId" element={<WalkerDetail />} />
          </Route>
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
