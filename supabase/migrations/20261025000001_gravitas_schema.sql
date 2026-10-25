-- ====================================================================
-- Migration: 20261025000001_gravitas_schema.sql
-- Description: Core schema for graVITas '26 at VIT Vellore.
-- Includes venues, events, event_photos, and event_registrations.
-- ====================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. VENUES TABLE
-- Real VIT Vellore campus locations verified from official event listings
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    building_name TEXT,
    block_name TEXT,
    floor TEXT,
    room_number TEXT,
    campus TEXT NOT NULL DEFAULT 'VIT Vellore',
    address_description TEXT,
    directions TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    official_map_url TEXT,
    source_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'partially_verified', 'unverified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- 2. EVENTS TABLE
-- Official graVITas '26 event details
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    category TEXT NOT NULL CHECK (category IN ('hackathon', 'workshop', 'competition', 'games', 'entrepreneurship', 'other')),
    organizer_name TEXT NOT NULL,
    festival_name TEXT NOT NULL DEFAULT 'graVITas ''26',
    festival_year INTEGER NOT NULL DEFAULT 2026,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    registration_fee_inr NUMERIC(10, 2),
    min_team_size INTEGER,
    max_team_size INTEGER,
    registration_url TEXT,
    official_event_url TEXT NOT NULL,
    event_status TEXT NOT NULL DEFAULT 'completed' CHECK (event_status IN ('scheduled', 'completed', 'cancelled', 'unknown')),
    data_source TEXT NOT NULL,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- 3. EVENT_PHOTOS TABLE
-- Event posters, gallery photographs, and archival media
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    bucket_name TEXT NOT NULL DEFAULT 'gravitas-event-photos',
    caption TEXT,
    alt_text TEXT NOT NULL,
    image_type TEXT NOT NULL CHECK (image_type IN ('poster', 'event_photo', 'gallery_photo', 'banner')),
    source_url TEXT NOT NULL,
    credit TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- 4. EVENT_REGISTRATIONS TABLE (Touchless Kiosk & Demo Registrations)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID,
    registration_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_is_primary ON public.event_photos(is_primary);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_code ON public.event_registrations(registration_code);

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Public read access for published festival content
CREATE POLICY "Allow public read access on venues"
    ON public.venues FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on events"
    ON public.events FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on event_photos"
    ON public.event_photos FOR SELECT
    USING (true);

-- Event registration policies: public insert for kiosk delegates, scoped select
CREATE POLICY "Allow public insert on event_registrations"
    ON public.event_registrations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow users to read event registrations"
    ON public.event_registrations FOR SELECT
    USING (true);

-- --------------------------------------------------------------------
-- 7. STORAGE BUCKET CONFIGURATION (Supabase Storage)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('gravitas-event-photos', 'gravitas-event-photos', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
