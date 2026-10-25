/**
 * scripts/seed_gravitas_supabase.ts
 * 
 * Repeatable import and seed script for official graVITas '26 event data,
 * real VIT Vellore campus venues, and event photograph media into Supabase.
 * 
 * Run with:
 *   npx tsx scripts/seed_gravitas_supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  VERIFIED_VIT_VENUES,
  VERIFIED_GRAVITAS_EVENTS,
  VERIFIED_EVENT_PHOTOS,
  OFFICIAL_FESTIVAL_INFO,
} from '../src/gravitasData.ts';

// Load env vars if available
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

interface SeedReport {
  venues: { total: number; insertedOrUpdated: number; failed: number };
  events: { total: number; insertedOrUpdated: number; failed: number };
  photos: { total: number; insertedOrUpdated: number; failed: number };
  unverifiedFields: string[];
}

async function runSeed() {
  console.log('===============================================================');
  console.log(`  graVITas '26 • Supabase Data Seed & Verification Tool`);
  console.log(`  Host Campus: ${OFFICIAL_FESTIVAL_INFO.campus}`);
  console.log(`  Festival Dates: ${OFFICIAL_FESTIVAL_INFO.dates} (${OFFICIAL_FESTIVAL_INFO.historicalStatus})`);
  console.log('===============================================================\n');

  const report: SeedReport = {
    venues: { total: VERIFIED_VIT_VENUES.length, insertedOrUpdated: 0, failed: 0 },
    events: { total: VERIFIED_GRAVITAS_EVENTS.length, insertedOrUpdated: 0, failed: 0 },
    photos: { total: VERIFIED_EVENT_PHOTOS.length, insertedOrUpdated: 0, failed: 0 },
    unverifiedFields: [
      'Anna Auditorium room number: NULL (Open tiered auditorium structure)',
      'graVITas Inauguration registration_fee: NULL (Complimentary delegate admission)',
      'graVITas Valedictory registration_fee: NULL (Open entry for registered participants)',
    ],
  };

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Notice: SUPABASE credentials not detected in environment.');
    console.log('   Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    console.log('   The application will run using the verified local dataset.\n');
    console.log('Offline Dataset Integrity Summary:');
    console.log(`  ✓ Verified VIT Vellore Venues: ${report.venues.total} records`);
    console.log(`  ✓ Verified graVITas '26 Events: ${report.events.total} records`);
    console.log(`  ✓ Verified Event Photos / Media: ${report.photos.total} records`);
    console.log('\nField Integrity Notes:');
    for (const note of report.unverifiedFields) {
      console.log(`  - ${note}`);
    }
    console.log('\nTo push to live Supabase, configure your .env file and re-run this script.');
    return;
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Seed Venues
  console.log(`\n[1/3] Upserting ${VERIFIED_VIT_VENUES.length} verified VIT Vellore venues...`);
  for (const venue of VERIFIED_VIT_VENUES) {
    const { error } = await supabase.from('venues').upsert(
      {
        id: venue.id,
        name: venue.name,
        building_name: venue.building_name,
        block_name: venue.block_name,
        floor: venue.floor,
        room_number: venue.room_number,
        campus: venue.campus,
        address_description: venue.address_description,
        directions: venue.directions,
        latitude: venue.latitude,
        longitude: venue.longitude,
        official_map_url: venue.official_map_url,
        source_url: venue.source_url,
        verification_status: venue.verification_status,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`  ✗ Failed to upsert venue ${venue.name}:`, error.message);
      report.venues.failed++;
    } else {
      console.log(`  ✓ Venue: ${venue.name} (${venue.building_name})`);
      report.venues.insertedOrUpdated++;
    }
  }

  // 2. Seed Events
  console.log(`\n[2/3] Upserting ${VERIFIED_GRAVITAS_EVENTS.length} verified graVITas '26 events...`);
  for (const event of VERIFIED_GRAVITAS_EVENTS) {
    const { error } = await supabase.from('events').upsert(
      {
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        short_description: event.short_description,
        category: event.category,
        organizer_name: event.organizer_name,
        festival_name: event.festival_name,
        festival_year: event.festival_year,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        venue_id: event.venue_id,
        registration_fee_inr: event.registration_fee_inr,
        min_team_size: event.min_team_size,
        max_team_size: event.max_team_size,
        registration_url: event.registration_url,
        official_event_url: event.official_event_url,
        event_status: event.event_status,
        data_source: event.data_source,
        last_verified_at: event.last_verified_at,
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.error(`  ✗ Failed to upsert event ${event.name}:`, error.message);
      report.events.failed++;
    } else {
      console.log(`  ✓ Event: ${event.name} [${event.category}]`);
      report.events.insertedOrUpdated++;
    }
  }

  // 3. Seed Event Photos
  console.log(`\n[3/3] Upserting ${VERIFIED_EVENT_PHOTOS.length} event photo metadata records...`);
  for (const photo of VERIFIED_EVENT_PHOTOS) {
    const { error } = await supabase.from('event_photos').upsert(
      {
        id: photo.id,
        event_id: photo.event_id,
        filename: photo.filename,
        storage_path: photo.storage_path,
        bucket_name: photo.bucket_name,
        caption: photo.caption,
        alt_text: photo.alt_text,
        image_type: photo.image_type,
        source_url: photo.source_url,
        credit: photo.credit,
        is_primary: photo.is_primary,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`  ✗ Failed to upsert photo ${photo.filename}:`, error.message);
      report.photos.failed++;
    } else {
      console.log(`  ✓ Photo: ${photo.filename} [${photo.image_type}]`);
      report.photos.insertedOrUpdated++;
    }
  }

  console.log('\n===============================================================');
  console.log('  SEEDING SUMMARY REPORT');
  console.log('===============================================================');
  console.log(`  Venues : ${report.venues.insertedOrUpdated} inserted/updated, ${report.venues.failed} failed`);
  console.log(`  Events : ${report.events.insertedOrUpdated} inserted/updated, ${report.events.failed} failed`);
  console.log(`  Photos : ${report.photos.insertedOrUpdated} inserted/updated, ${report.photos.failed} failed`);
  console.log('\nKnown Unverified / Null Fields:');
  for (const note of report.unverifiedFields) {
    console.log(`  - ${note}`);
  }
  console.log('===============================================================\n');
}

runSeed().catch((err) => {
  console.error('Fatal error running graVITas Supabase seed script:', err);
  process.exit(1);
});
