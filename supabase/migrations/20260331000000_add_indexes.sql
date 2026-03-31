-- Performance indexes for calendar/availability queries
-- These tables were missing indexes entirely, causing full table scans

CREATE INDEX idx_bookings_walker_date_status ON public.bookings (walker_id, booking_date, status);
CREATE INDEX idx_bookings_walker_status_enddate ON public.bookings (walker_id, status)
  WHERE end_date IS NOT NULL;
CREATE INDEX idx_blocked_dates_walker_date ON public.blocked_dates (walker_id, date);
CREATE INDEX idx_availability_walker_dow ON public.availability (walker_id, day_of_week);
CREATE INDEX idx_ical_imports_walker ON public.ical_imports (walker_id);
CREATE INDEX idx_services_walker_active ON public.services (walker_id, active);
CREATE INDEX idx_walker_profiles_user ON public.walker_profiles (user_id);
CREATE INDEX idx_reviews_walker ON public.reviews (walker_id);
