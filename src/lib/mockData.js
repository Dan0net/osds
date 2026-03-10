// Mock data for Phase 2 — unified user model

// Current logged-in user (Ellie — both a walker and a client)
export const MOCK_USER = {
  id: 'user-1',
  name: 'Ellie',
  email: 'ellie@example.com',
  phone: '07700 900001',
  avatar_url: null,
  favourite_walkers: ['walker-2'],
  has_walker_profile: true,
}

export const MOCK_PETS = [
  { id: 'pet-1', user_id: 'user-1', name: 'Luna', breed: 'Border Collie', weight: '18kg', age: '3 years', notes: 'Very energetic, loves fetch' },
  { id: 'pet-2', user_id: 'user-1', name: 'Biscuit', breed: 'Cockapoo', weight: '10kg', age: '1 year', notes: 'Still a puppy, needs socialisation' },
]

export const MOCK_WALKERS = [
  {
    id: 'walker-1',
    slug: 'ellie',
    business_name: "Ellie's Dog Walking",
    bio: 'Fully insured, DBS checked dog walker in Brighton with 5+ years experience.',
    theme_color: '#4f46e5',
    rating: 4.7,
    review_count: 3,
  },
  {
    id: 'walker-2',
    slug: 'james',
    business_name: "James's Paw Patrol",
    bio: 'Group and solo walks around Hove. First aid trained and pet first aid certified.',
    theme_color: '#059669',
    rating: 4.9,
    review_count: 12,
  },
  {
    id: 'walker-3',
    slug: 'sarah',
    business_name: "Sarah's Happy Tails",
    bio: 'Specialising in puppy socialisation walks and anxious dogs. Calm, patient approach.',
    theme_color: '#d97706',
    rating: 5.0,
    review_count: 7,
  },
]

// Full walker profiles keyed by slug
const WALKER_PROFILES = {
  ellie: {
    id: 'walker-1', slug: 'ellie', business_name: "Ellie's Dog Walking",
    bio: "Hi, I'm Ellie! I've been walking dogs in Brighton for over 5 years. I'm fully insured, DBS checked, and absolutely love spending time with your furry friends. Whether it's a quick lunchtime walk or an all-day adventure, your dog is in safe hands.",
    theme_color: '#4f46e5',
  },
  james: {
    id: 'walker-2', slug: 'james', business_name: "James's Paw Patrol",
    bio: "Hey! I'm James, a qualified canine behaviourist offering group and solo walks around Hove and the seafront. First aid trained, pet first aid certified, and mad about dogs.",
    theme_color: '#059669',
  },
  sarah: {
    id: 'walker-3', slug: 'sarah', business_name: "Sarah's Happy Tails",
    bio: "I specialise in puppy socialisation walks and working with anxious dogs. My calm, patient approach helps nervous pups build confidence. Fully insured, DBS checked, and a lifelong dog lover.",
    theme_color: '#d97706',
  },
}

// Per-walker services
const WALKER_SERVICES = {
  'walker-1': [
    { id: 'svc-1', walker_id: 'walker-1', name: '30-Minute Walk', price_cents: 1500, duration_minutes: 30, service_type: 'standard', active: true },
    { id: 'svc-2', walker_id: 'walker-1', name: '60-Minute Walk', price_cents: 2500, duration_minutes: 60, service_type: 'standard', active: true },
    { id: 'svc-3', walker_id: 'walker-1', name: 'Puppy Visit', price_cents: 2000, duration_minutes: 45, service_type: 'standard', active: true },
    { id: 'svc-4', walker_id: 'walker-1', name: 'Bath & Groom', price_cents: 4500, duration_minutes: 90, service_type: 'standard', active: true },
    { id: 'svc-12', walker_id: 'walker-1', name: 'Overnight', price_cents: 5000, duration_minutes: 30, service_type: 'overnight', active: true },
  ],
  'walker-2': [
    { id: 'svc-5', walker_id: 'walker-2', name: 'Group Walk', price_cents: 1200, duration_minutes: 60, service_type: 'standard', active: true },
    { id: 'svc-6', walker_id: 'walker-2', name: 'Solo Adventure', price_cents: 2000, duration_minutes: 60, service_type: 'standard', active: true },
    { id: 'svc-7', walker_id: 'walker-2', name: 'Beach Run', price_cents: 3000, duration_minutes: 90, service_type: 'standard', active: true },
    { id: 'svc-8', walker_id: 'walker-2', name: 'Puppy Playdate', price_cents: 1800, duration_minutes: 45, service_type: 'standard', active: true },
  ],
  'walker-3': [
    { id: 'svc-9', walker_id: 'walker-3', name: 'Socialisation Walk', price_cents: 2200, duration_minutes: 45, service_type: 'standard', active: true },
    { id: 'svc-10', walker_id: 'walker-3', name: 'Anxious Dog Walk', price_cents: 2500, duration_minutes: 60, service_type: 'standard', active: true },
    { id: 'svc-11', walker_id: 'walker-3', name: 'Puppy Training Walk', price_cents: 3500, duration_minutes: 60, service_type: 'standard', active: true },
  ],
}

// Per-walker reviews
const WALKER_REVIEWS = {
  'walker-1': [
    { id: 'rev-1', walker_id: 'walker-1', client_name: 'Dan', rating: 5, comment: 'Ellie is fantastic with my dog Max. He always comes back tired and happy!', created_at: '2026-02-15' },
    { id: 'rev-2', walker_id: 'walker-1', client_name: 'Sarah', rating: 4, comment: 'Very reliable and always on time. Bella loves her walks with Ellie.', created_at: '2026-01-28' },
    { id: 'rev-3', walker_id: 'walker-1', client_name: 'James', rating: 5, comment: "Best dog walker in Brighton. Can't recommend enough!", created_at: '2026-02-02' },
  ],
  'walker-2': [
    { id: 'rev-4', walker_id: 'walker-2', client_name: 'Emma', rating: 5, comment: 'My dog loves the group walks — comes home exhausted every time!', created_at: '2026-02-20' },
    { id: 'rev-5', walker_id: 'walker-2', client_name: 'Tom', rating: 5, comment: 'James is brilliant. Really knows how to handle high-energy dogs.', created_at: '2026-01-15' },
  ],
  'walker-3': [
    { id: 'rev-6', walker_id: 'walker-3', client_name: 'Lisa', rating: 5, comment: "Sarah worked wonders with our rescue dog. She's so much more confident now.", created_at: '2026-03-01' },
    { id: 'rev-7', walker_id: 'walker-3', client_name: 'Dan', rating: 5, comment: 'Incredible patience. Our anxious pup actually looks forward to walks now.', created_at: '2026-02-10' },
  ],
}

export function getWalkerBySlug(slug) {
  return WALKER_PROFILES[slug] || null
}

export function getServicesByWalkerId(walkerId) {
  return WALKER_SERVICES[walkerId] || []
}

export function getReviewsByWalkerId(walkerId) {
  return WALKER_REVIEWS[walkerId] || []
}

// Legacy exports for account pages
export const MOCK_WALKER = WALKER_PROFILES.ellie
export const MOCK_SERVICES = WALKER_SERVICES['walker-1']

export const MOCK_AVAILABILITY = [
  { day_of_week: 1, start_time: '08:00', end_time: '17:00' }, // Mon
  { day_of_week: 2, start_time: '08:00', end_time: '17:00' }, // Tue
  { day_of_week: 3, start_time: '08:00', end_time: '17:00' }, // Wed
  { day_of_week: 4, start_time: '08:00', end_time: '17:00' }, // Thu
  { day_of_week: 5, start_time: '08:00', end_time: '14:00' }, // Fri
]

export const MOCK_BLOCKED_DATES = [
  { date: '2026-03-25', reason: 'Holiday' },
  { date: '2026-04-03', reason: 'Vet appointment' },
]

// Client bookings (booked by Ellie as a client from other walkers)
export const MOCK_CLIENT_BOOKINGS = [
  {
    id: 'cbk-1',
    walker_id: 'walker-2',
    walker_name: "James's Paw Patrol",
    client_id: 'user-1',
    service_name: 'Group Walk',
    pet_name: 'Luna',
    booking_date: '2026-03-13',
    start_time: '09:00',
    end_time: '10:00',
    status: 'confirmed',
    price_cents: 1200,
  },
  {
    id: 'cbk-2',
    walker_id: 'walker-3',
    walker_name: "Sarah's Happy Tails",
    client_id: 'user-1',
    service_name: 'Socialisation Walk',
    pet_name: 'Biscuit',
    booking_date: '2026-03-17',
    start_time: '11:00',
    end_time: '11:45',
    status: 'requested',
    price_cents: 2200,
  },
]

// Incoming bookings (to Ellie as a walker, from clients)
export const MOCK_BOOKINGS = [
  {
    id: 'bk-1',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: '30-Minute Walk',
    pet_name: 'Max',
    booking_date: '2026-03-12',
    start_time: '10:00',
    end_time: '10:30',
    status: 'requested',
    price_cents: 1500,
  },
  {
    id: 'bk-2',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: 'Bath & Groom',
    pet_name: 'Max',
    booking_date: '2026-03-14',
    start_time: '09:00',
    end_time: '10:30',
    status: 'requested',
    price_cents: 4500,
  },
  {
    id: 'bk-3',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: '60-Minute Walk',
    pet_name: 'Max',
    booking_date: '2026-03-08',
    start_time: '14:00',
    end_time: '15:00',
    status: 'confirmed',
    price_cents: 2500,
  },
  {
    id: 'bk-4',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: '30-Minute Walk',
    pet_name: 'Max',
    booking_date: '2026-03-05',
    start_time: '11:00',
    end_time: '11:30',
    status: 'declined',
    price_cents: 1500,
  },
  {
    id: 'bk-5',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: 'Puppy Visit',
    pet_name: 'Max',
    booking_date: '2026-03-15',
    start_time: '13:00',
    end_time: '13:45',
    status: 'confirmed',
    price_cents: 2000,
  },
  {
    id: 'bk-6',
    walker_id: 'walker-1',
    client_id: 'client-1',
    client_name: 'Dan',
    service_name: 'Overnight',
    pet_name: 'Max',
    booking_date: '2026-03-16',
    start_time: '10:00',
    end_date: '2026-03-18',
    end_time: '14:00',
    status: 'confirmed',
    price_cents: 10000,
    is_overnight: true,
    nights: 2,
    reopened_slots: [],
  },
]

// Get availability window for a date (null if unavailable)
export function getAvailabilityWindow(date) {
  const dayOfWeek = new Date(date).getDay()
  const schemaDay = dayOfWeek === 0 ? 7 : dayOfWeek
  const isBlocked = MOCK_BLOCKED_DATES.some((b) => b.date === date)
  if (isBlocked) return null
  const avail = MOCK_AVAILABILITY.find((a) => a.day_of_week === schemaDay)
  return avail || null
}

// Generate all 30-min grid slots for a date, marking which are bookable for a given duration
// For overnight services, constrain drop-off times to 7am–7pm
export function getMockSlots(date, durationMinutes = 30, { overnight = false } = {}) {
  const avail = getAvailabilityWindow(date)
  if (!avail) return []

  const slots = []
  const [startH, startM] = avail.start_time.split(':').map(Number)
  const [endH, endM] = avail.end_time.split(':').map(Number)
  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  if (overnight) {
    // Constrain to 7am–7pm for overnight drop-off
    startMinutes = Math.max(startMinutes, 7 * 60)
    endMinutes = Math.min(endMinutes, 19 * 60)
  }

  for (let m = startMinutes; m + durationMinutes <= endMinutes; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    slots.push(time)
  }
  return slots
}
