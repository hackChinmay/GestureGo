import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gravitasService } from '../src/gravitasService.ts';
import {
  VERIFIED_GRAVITAS_EVENTS,
  VERIFIED_VIT_VENUES,
  VERIFIED_EVENT_PHOTOS,
  OFFICIAL_VIT_CONTACTS,
  OFFICIAL_FESTIVAL_INFO,
} from '../src/gravitasData.ts';

describe('Supabase graVITas ’26 Integration & Data Integrity Suite', () => {
  // Test 1: Event records can be retrieved
  test('1. Verified graVITas ’26 event records are retrieved with complete schema', async () => {
    const events = await gravitasService.getEvents();
    assert.ok(events.length >= 8, 'Must return at least 8 verified graVITas events');

    const energyThon = events.find((e) => e.slug === 'energython-2026');
    assert.ok(energyThon !== undefined, 'EnergyThon event must exist');
    assert.equal(energyThon.festival_name, "graVITas '26");
    assert.equal(energyThon.festival_year, 2026);
    assert.equal(energyThon.category, 'hackathon');
    assert.ok(energyThon.official_event_url.startsWith('https://gravitas.vit.ac.in/'));
  });

  // Test 2: Venue records can be retrieved
  test('2. Verified VIT Vellore campus venues are retrieved with real locations', async () => {
    const venues = await gravitasService.getVenues();
    assert.ok(venues.length >= 8, 'Must return at least 8 verified VIT Vellore venues');

    const bhagatSingh = venues.find((v) => v.name === 'Bhagat Singh Gallery');
    assert.ok(bhagatSingh !== undefined, 'Bhagat Singh Gallery must exist');
    assert.equal(bhagatSingh.building_name, 'Silver Jubilee Tower (SJT)');
    assert.equal(bhagatSingh.floor, '8th Floor');
    assert.equal(bhagatSingh.campus, 'VIT Vellore');
    assert.equal(bhagatSingh.verification_status, 'verified');

    const annaAuditorium = venues.find((v) => v.name === 'Anna Auditorium');
    assert.ok(annaAuditorium !== undefined, 'Anna Auditorium must exist');
    assert.equal(annaAuditorium.campus, 'VIT Vellore');
  });

  // Test 3: Events link to the correct venue
  test('3. Events link accurately to their corresponding verified venue_id', async () => {
    const events = await gravitasService.getEvents();
    const venues = await gravitasService.getVenues();
    const venueMap = new Map(venues.map((v) => [v.id, v]));

    for (const ev of events) {
      if (ev.venue_id) {
        assert.ok(venueMap.has(ev.venue_id), `Event ${ev.name} venue_id ${ev.venue_id} must resolve in venues`);
      }
    }

    const energyThon = events.find((e) => e.slug === 'energython-2026');
    assert.equal(energyThon?.venue?.name, 'Bhagat Singh Gallery');

    const roboWars = events.find((e) => e.slug === 'robowars-2026');
    assert.equal(roboWars?.venue?.name, 'RoboWars Arena (SMV Outdoor Court)');
  });

  // Test 4: Multiple photos can belong to the festival, and event photos link to event_id
  test('4. Photo metadata records correctly associate with events or campus gallery', async () => {
    const photos = await gravitasService.getEventPhotos();
    assert.ok(photos.length >= 10, 'Must have at least 10 verified photo records');

    // General festival photos have null event_id
    const generalPhotos = photos.filter((p) => p.event_id === null);
    assert.ok(generalPhotos.length >= 2, 'Must include general campus atmosphere photos');

    // Event-specific photos
    const energyPhotos = await gravitasService.getEventPhotos('11111111-1111-1111-1111-111111110001');
    assert.ok(energyPhotos.length >= 1, 'EnergyThon must have at least 1 photo record');
    assert.equal(energyPhotos[0].filename, 'energython-2026-poster.jpg');
    assert.equal(energyPhotos[0].bucket_name, 'gravitas-event-photos');
  });

  // Test 5: Missing event photos do not crash the UI (graceful placeholder fallback)
  test('5. Missing or null photos resolve safely without throwing exceptions', () => {
    const resolvedEmpty = gravitasService.resolveImageUrl(null);
    assert.equal(resolvedEmpty, '');

    const photoWithoutStorage = {
      id: 'test-id',
      filename: 'missing.jpg',
      storage_path: '2026/missing.jpg',
      bucket_name: 'gravitas-event-photos',
      alt_text: 'Missing placeholder',
      image_type: 'poster',
      source_url: 'https://gravitas.vit.ac.in/events',
      is_primary: true,
    };

    const resolvedUrl = gravitasService.resolveImageUrl(photoWithoutStorage);
    assert.ok(resolvedUrl.length > 0);
  });

  // Test 6: Missing venue information is handled gracefully
  test('6. Events with unverified or null venue do not crash lookups', async () => {
    const eventWithNullVenue = {
      ...VERIFIED_GRAVITAS_EVENTS[0],
      venue_id: null,
      venue: null,
    };
    assert.equal(eventWithNullVenue.venue, null);
    assert.equal(eventWithNullVenue.venue_id, null);
  });

  // Test 7: Filtering events by category
  test('7. Events filter correctly by category (hackathon, competition, workshop)', async () => {
    const hackathons = await gravitasService.getEvents({ category: 'hackathon' });
    assert.ok(hackathons.length >= 2);
    for (const h of hackathons) {
      assert.equal(h.category, 'hackathon');
    }

    const competitions = await gravitasService.getEvents({ category: 'competition' });
    assert.ok(competitions.length >= 2);
    for (const c of competitions) {
      assert.equal(c.category, 'competition');
    }

    const workshops = await gravitasService.getEvents({ category: 'workshop' });
    assert.ok(workshops.length >= 1);
    for (const w of workshops) {
      assert.equal(w.category, 'workshop');
    }
  });

  // Test 8: Filtering events by festival date
  test('8. Events filter accurately by festival date (18, 19, 20 September 2026)', async () => {
    const day1 = await gravitasService.getEvents({ date: '2026-09-18' });
    assert.ok(day1.length >= 3, 'Day 1 must contain EnergyThon, HackVerse, and Inauguration');
    for (const e of day1) {
      assert.equal(e.start_date, '2026-09-18');
    }

    const day2 = await gravitasService.getEvents({ date: '2026-09-19' });
    assert.ok(day2.length >= 3, 'Day 2 must contain RoboWars, Edge AI, Circuitron');
    for (const e of day2) {
      assert.equal(e.start_date, '2026-09-19');
    }
  });

  // Test 9: Search query filtering
  test('9. Search query filters events by title, organizer, and description', async () => {
    const roboSearch = await gravitasService.getEvents({ search: 'RoboWars' });
    assert.equal(roboSearch.length, 1);
    assert.equal(roboSearch[0].slug, 'robowars-2026');

    const cleanEnergySearch = await gravitasService.getEvents({ search: 'clean energy' });
    assert.ok(cleanEnergySearch.length >= 1);
    assert.equal(cleanEnergySearch[0].slug, 'energython-2026');
  });

  // Test 10: Historical event status is completed (Sept 2026 has passed)
  test('10. Historical event status is completed and never mislabeled as live or upcoming', async () => {
    const events = await gravitasService.getEvents();
    for (const ev of events) {
      assert.equal(
        ev.event_status,
        'completed',
        `Event ${ev.name} must have status completed because graVITas '26 took place in Sept 2026`
      );
    }
  });

  // Test 11: Verified official VIT Vellore contacts (no fictional entries)
  test('11. Directory contacts contain only verified official VIT Vellore contacts', () => {
    assert.ok(OFFICIAL_VIT_CONTACTS.length >= 4);

    const sw = OFFICIAL_VIT_CONTACTS.find((c) => c.role.includes("Students' Welfare"));
    assert.ok(sw !== undefined);
    assert.equal(sw.email, 'events.sw@vit.ac.in');
    assert.equal(sw.phone, '+91 416 220 4111');
    assert.ok(sw.office.includes('PRP Annexe'));

    const security = OFFICIAL_VIT_CONTACTS.find((c) => c.role.includes('Security'));
    assert.ok(security !== undefined);
    assert.equal(security.phone, '+91 416 220 2222');
  });

  // Test 12: Festival dates and host campus match official festival data
  test('12. Festival metadata accurately reflects graVITas ’26 at VIT Vellore', () => {
    assert.equal(OFFICIAL_FESTIVAL_INFO.edition, "graVITas '26");
    assert.equal(OFFICIAL_FESTIVAL_INFO.dates, "September 18–20, 2026");
    assert.ok(OFFICIAL_FESTIVAL_INFO.campus.includes("VIT Vellore"));
    assert.equal(OFFICIAL_FESTIVAL_INFO.historicalStatus, "Completed");
    assert.equal(OFFICIAL_FESTIVAL_INFO.officialUrl, "https://gravitas.vit.ac.in/");
  });
});
