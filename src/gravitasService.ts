import { supabase, isSupabaseConfigured, getStorageImageUrl } from './supabaseClient';
import { GravitasEvent, GravitasVenue, GravitasPhoto } from './types';
import {
  VERIFIED_GRAVITAS_EVENTS,
  VERIFIED_VIT_VENUES,
  VERIFIED_EVENT_PHOTOS,
} from './gravitasData';

export interface EventFilterOptions {
  category?: string;
  date?: string;
  venueId?: string;
  search?: string;
}

/**
 * Service providing verified graVITas '26 event data, VIT Vellore campus venues,
 * and event photograph media via Supabase with seamless offline fallback.
 */
export const gravitasService = {
  /**
   * Fetches verified events with optional filtering.
   */
  async getEvents(filters: EventFilterOptions = {}): Promise<GravitasEvent[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('events')
          .select(`
            *,
            venue:venues(*),
            photos:event_photos(*)
          `)
          .order('start_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters.date && filters.date !== 'all') {
          query = query.eq('start_date', filters.date);
        }
        if (filters.venueId && filters.venueId !== 'all') {
          query = query.eq('venue_id', filters.venueId);
        }
        if (filters.search && filters.search.trim()) {
          query = query.ilike('name', `%${filters.search.trim()}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            primary_photo:
              item.photos?.find((p: GravitasPhoto) => p.is_primary) || item.photos?.[0] || null,
          }));
        }
      } catch (err) {
        console.warn('[GravitasService] Supabase fetch failed, using verified fallback data:', err);
      }
    }

    // Verified in-memory fallback
    let results = [...VERIFIED_GRAVITAS_EVENTS];

    if (filters.category && filters.category !== 'all') {
      results = results.filter((e) => e.category === filters.category);
    }
    if (filters.date && filters.date !== 'all') {
      results = results.filter((e) => e.start_date === filters.date);
    }
    if (filters.venueId && filters.venueId !== 'all') {
      results = results.filter((e) => e.venue_id === filters.venueId);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.organizer_name.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    return results;
  },

  /**
   * Fetches all verified VIT Vellore venues.
   */
  async getVenues(): Promise<GravitasVenue[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as GravitasVenue[];
        }
      } catch (err) {
        console.warn('[GravitasService] Supabase venues fetch failed, using verified fallback:', err);
      }
    }
    return VERIFIED_VIT_VENUES;
  },

  /**
   * Fetches event photographs and media from Supabase Storage / archive.
   */
  async getEventPhotos(eventId?: string): Promise<GravitasPhoto[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('event_photos')
          .select(`
            *,
            event:events(id, name, slug)
          `)
          .order('is_primary', { ascending: false });

        if (eventId) {
          query = query.eq('event_id', eventId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as GravitasPhoto[];
        }
      } catch (err) {
        console.warn('[GravitasService] Supabase photos fetch failed, using verified fallback:', err);
      }
    }

    if (eventId) {
      return VERIFIED_EVENT_PHOTOS.filter((p) => p.event_id === eventId);
    }
    return VERIFIED_EVENT_PHOTOS;
  },

  /**
   * Retrieves a single event by ID or slug.
   */
  async getEventById(idOrSlug: string): Promise<GravitasEvent | null> {
    const events = await this.getEvents();
    return events.find((e) => e.id === idOrSlug || e.slug === idOrSlug) || null;
  },

  /**
   * Resolves a photo object to its displayable URL.
   */
  resolveImageUrl(photo?: GravitasPhoto | null): string {
    if (!photo) return '';
    return getStorageImageUrl(photo.bucket_name, photo.storage_path, photo.source_url);
  },

  /**
   * Inserts an event registration into Supabase.
   */
  async recordRegistration(eventId: string, registrationCode: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('event_registrations').insert({
          event_id: eventId,
          registration_code: registrationCode,
          status: 'CONFIRMED',
        });
        if (!error) return true;
      } catch (err) {
        console.warn('[GravitasService] Supabase registration insert failed:', err);
      }
    }
    return false;
  },
};
