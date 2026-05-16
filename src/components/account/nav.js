import {
  Calendar,
  MessageSquare,
  Wallet,
  PawPrint,
  Wrench,
  Users,
  User,
  Settings,
  Clock,
  Repeat,
  CreditCard,
  Bell,
} from 'lucide-react'

export const NAV_ITEMS = [
  { key: 'bookings', to: '/account/bookings', label: 'Bookings', icon: Calendar },
  { key: 'messages', to: '/account/messages', label: 'Messages', icon: MessageSquare },
  { key: 'money', to: '/account/money', label: 'Money', icon: Wallet },
  { key: 'pets', to: '/account/pets', label: 'Pets', icon: PawPrint, ownerOnly: true },
  { key: 'services', to: '/account/services', label: 'Services', icon: Wrench, walkerOnly: true },
  { key: 'customers', to: '/account/customers', label: 'Customers', icon: Users, walkerOnly: true },
  { key: 'profile', to: '/account/profile', label: 'Profile', icon: User },
  { key: 'settings', to: '/account/settings', label: 'Settings', icon: Settings },
  { key: 'settings.availability', to: '/account/settings/availability', label: 'Availability', icon: Clock, walkerOnly: true, parent: 'settings' },
  { key: 'settings.calendar-sync', to: '/account/settings/calendar-sync', label: 'Calendar sync', icon: Repeat, walkerOnly: true, parent: 'settings' },
  { key: 'settings.stripe', to: '/account/settings/stripe', label: 'Stripe', icon: CreditCard, walkerOnly: true, parent: 'settings' },
  { key: 'settings.notifications', to: '/account/settings/notifications', label: 'Notifications', icon: Bell, parent: 'settings' },
]

export const BOTTOM_BAR_KEYS = ['bookings', 'messages', 'money']

export function filterForRole(items, isWalker) {
  return items.filter((i) => {
    if (i.walkerOnly && !isWalker) return false
    if (i.ownerOnly && isWalker) return false
    return true
  })
}
