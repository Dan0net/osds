-- Phase 8 Migration: User Journey Improvements
-- Adds location fields for walker search/discovery and service descriptions

-- walker_profiles: postcode + coordinates for proximity search
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS postcode text DEFAULT NULL;
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS lat float8 DEFAULT NULL;
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS lng float8 DEFAULT NULL;

-- services: description field for walker public pages
ALTER TABLE services ADD COLUMN IF NOT EXISTS description text DEFAULT '';
