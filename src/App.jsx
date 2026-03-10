import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { resolveWalker } from './lib/walker'
import Layout from './components/Layout'
import PlatformLanding from './pages/public/PlatformLanding'
import WalkerPage from './pages/public/WalkerPage'
import BookingFlow from './pages/public/BookingFlow'
import Confirmation from './pages/public/Confirmation'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'
import AdminLayout from './pages/admin/AdminLayout'
import AdminBookings from './pages/admin/AdminBookings'
import AdminServices from './pages/admin/AdminServices'
import AdminAvailability from './pages/admin/AdminAvailability'
import AdminCalendarSync from './pages/admin/AdminCalendarSync'
import AdminProfile from './pages/admin/AdminProfile'
import MyBookings from './pages/client/MyBookings'

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
        <Route path="my-bookings" element={<MyBookings />} />

        {/* Path-based walker fallback for local dev */}
        <Route path="w/:walker" element={<WalkerPage />} />
        <Route path="w/:walker/book" element={<BookingFlow />} />
        <Route path="w/:walker/confirmation" element={<Confirmation />} />
      </Route>

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminBookings />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="availability" element={<AdminAvailability />} />
        <Route path="calendar" element={<AdminCalendarSync />} />
        <Route path="profile" element={<AdminProfile />} />
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
