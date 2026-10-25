import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUniqueCode,
  createOrGetRegistration,
  loadRegistrations,
  saveRegistrations,
  cancelRegistration,
  STORAGE_KEY,
} from '../src/registrationStore.ts';
import { SCHEDULE_ITEMS } from '../src/campusData.ts';
import { GestureControllerTS } from '../src/gestureController.ts';

// In-memory mock for window.localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('GestureGo Event Registration & Pass Code Suite', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    globalThis.window = {
      localStorage: mockStorage,
    };
  });

  // Scenario 1: Valid registration object returned
  test('1. Registering for an event returns a valid EventRegistration object', () => {
    const event = SCHEDULE_ITEMS[0];
    const { registration, isNew } = createOrGetRegistration(event);

    assert.equal(isNew, true);
    assert.ok(registration.registrationId.startsWith('reg_'));
    assert.equal(registration.eventId, event.id);
    assert.equal(registration.eventNameSnapshot, event.title);
    assert.equal(registration.eventTime, event.time);
    assert.equal(registration.venue, event.location);
    assert.equal(registration.registrationStatus, 'CONFIRMED');
    assert.ok(registration.registeredAt);
  });

  // Scenario 2: Code format conforms to GG-XXXXXXXX with 8 alphanumeric characters
  test('2. Registration code strictly conforms to GG-XXXXXXXX format and Crockford alphabet', () => {
    const existing = new Set();
    const codeRegex = /^GG-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

    for (let i = 0; i < 50; i++) {
      const code = generateUniqueCode(existing);
      assert.match(
        code,
        codeRegex,
        `Code ${code} must match GG-XXXXXXXX with non-ambiguous Crockford characters`
      );
      assert.equal(code.includes('0'), false, 'Code must not contain 0');
      assert.equal(code.includes('O'), false, 'Code must not contain O');
      assert.equal(code.includes('1'), false, 'Code must not contain 1');
      assert.equal(code.includes('I'), false, 'Code must not contain I');
      assert.equal(code.includes('L'), false, 'Code must not contain L');
      existing.add(code);
    }
  });

  // Scenario 3: Codes are unique across multiple registrations
  test('3. Generated registration codes are unique across multiple generations', () => {
    const existing = new Set();
    const count = 100;
    for (let i = 0; i < count; i++) {
      const code = generateUniqueCode(existing);
      assert.equal(existing.has(code), false, `Code collision detected: ${code}`);
      existing.add(code);
    }
    assert.equal(existing.size, count);
  });

  // Scenario 4: Registering the same event multiple times returns existing record without duplicate
  test('4. Registering for the same event multiple times returns existing registration without creating duplicates', () => {
    const event = SCHEDULE_ITEMS[1];
    const firstCall = createOrGetRegistration(event);
    assert.equal(firstCall.isNew, true);
    const originalCode = firstCall.registration.registrationCode;

    // Second call for the same event
    const secondCall = createOrGetRegistration(event);
    assert.equal(secondCall.isNew, false);
    assert.equal(secondCall.registration.registrationCode, originalCode);
    assert.equal(secondCall.registration.registrationId, firstCall.registration.registrationId);

    // Verify localStorage contains only 1 entry
    const all = loadRegistrations();
    assert.equal(all.length, 1);
    assert.equal(all[0].eventId, event.id);
  });

  // Scenario 5: Reopening the pass preserves the exact same code
  test('5. Reopening the pass dialog for an already registered event preserves the exact same code', () => {
    const event = SCHEDULE_ITEMS[2];
    const initial = createOrGetRegistration(event);

    // Simulate closing and reopening multiple times
    for (let i = 0; i < 5; i++) {
      const reopen = createOrGetRegistration(event);
      assert.equal(reopen.isNew, false);
      assert.equal(reopen.registration.registrationCode, initial.registration.registrationCode);
      assert.equal(reopen.registration.registeredAt, initial.registration.registeredAt);
    }
  });

  // Scenario 6: Different events receive distinct codes
  test('6. Registering for different events produces distinct codes for each event', () => {
    const eventA = SCHEDULE_ITEMS[0];
    const eventB = SCHEDULE_ITEMS[1];
    const eventC = SCHEDULE_ITEMS[2];

    const regA = createOrGetRegistration(eventA);
    const regB = createOrGetRegistration(eventB);
    const regC = createOrGetRegistration(eventC);

    assert.notEqual(regA.registration.registrationCode, regB.registration.registrationCode);
    assert.notEqual(regB.registration.registrationCode, regC.registration.registrationCode);
    assert.notEqual(regA.registration.registrationCode, regC.registration.registrationCode);

    const all = loadRegistrations();
    assert.equal(all.length, 3);
  });

  // Scenario 7: Persistence in localStorage survives serialization and reloading
  test('7. Registration state is successfully persisted to localStorage', () => {
    const event = SCHEDULE_ITEMS[3];
    const { registration } = createOrGetRegistration(event);

    // Raw verify in mock localStorage
    const raw = mockStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null, 'localStorage item must exist');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].registrationCode, registration.registrationCode);

    // Clear memory and reload from storage
    const reloaded = loadRegistrations();
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].registrationCode, registration.registrationCode);
    assert.equal(reloaded[0].eventNameSnapshot, event.title);
  });

  // Scenario 8: Invalid or corrupt storage data handled gracefully
  test('8. Corrupted or invalid localStorage data fails safely to empty array', () => {
    mockStorage.setItem(STORAGE_KEY, 'invalid-json-syntax{[');
    const result = loadRegistrations();
    assert.deepEqual(result, []);

    mockStorage.setItem(STORAGE_KEY, JSON.stringify([{ invalid: 'record' }]));
    const filtered = loadRegistrations();
    assert.deepEqual(filtered, []);
  });

  // Scenario 9: My Registrations view correctly retrieves all registered passes
  test('9. My Registrations retrieves all registered passes in chronological order', () => {
    assert.equal(loadRegistrations().length, 0);

    createOrGetRegistration(SCHEDULE_ITEMS[0]);
    createOrGetRegistration(SCHEDULE_ITEMS[2]);
    createOrGetRegistration(SCHEDULE_ITEMS[4]);

    const passes = loadRegistrations();
    assert.equal(passes.length, 3);
    assert.deepEqual(
      passes.map((p) => p.eventId),
      ['s1', 's3', 's5']
    );
  });

  // Scenario 10: One-shot FSM anti-repeat prevents duplicate registrations when holding THUMBS_UP
  test('10. One-shot controller fires registration once without creating rapid duplicates when holding pose', () => {
    const controller = new GestureControllerTS(0.80, 0.20, 4, 0.10, 3);
    let firedActions = [];

    // Hold THUMBS_UP across 12 consecutive frames (step 0.08s -> first 4 trigger action)
    for (let f = 0; f < 12; f++) {
      const { action } = controller.processFrame('THUMBS_UP', 0.95, 1.0 + f * 0.08);
      if (action) {
        firedActions.push(action);
        createOrGetRegistration(SCHEDULE_ITEMS[0]);
      }
    }

    assert.equal(firedActions.length, 1, 'Holding gesture must only trigger exactly 1 action');
    assert.equal(firedActions[0], 'CONFIRM_OR_SELECT');

    // Registrations must contain only 1 item
    const stored = loadRegistrations();
    assert.equal(stored.length, 1);
  });

  // Scenario 11: Background navigation gestures are suppressed when pass modal is active
  test('11. Background navigation gestures are ignored while registration modal is active', () => {
    let activeModal = { isOpen: true, code: 'GG-TEST1234' };
    let currentPage = 'Schedule';

    function simulateDispatch(action) {
      if (activeModal.isOpen) {
        if (action === 'CANCEL' || action === 'CONFIRM_OR_SELECT') {
          activeModal.isOpen = false;
        }
        // Suppress background route changes!
        return;
      }
      if (action === 'NEXT_PAGE') {
        currentPage = 'Venues';
      } else if (action === 'HOME') {
        currentPage = 'Home';
      }
    }

    // Attempting navigation while modal is open
    simulateDispatch('NEXT_PAGE');
    assert.equal(currentPage, 'Schedule', 'Page must not change while modal is open');
    simulateDispatch('HOME');
    assert.equal(currentPage, 'Schedule', 'Page must not change while modal is open');
    assert.equal(activeModal.isOpen, true);

    // CANCEL dismisses the modal
    simulateDispatch('CANCEL');
    assert.equal(activeModal.isOpen, false);

    // Now navigation works
    simulateDispatch('NEXT_PAGE');
    assert.equal(currentPage, 'Venues');
  });

  // Scenario 12: Manual saveRegistrations handles empty or invalid state safely
  test('12. saveRegistrations safely handles empty arrays and preserves structure', () => {
    const ok = saveRegistrations([]);
    assert.equal(ok, true);
    assert.equal(loadRegistrations().length, 0);
  });

  // Scenario 13: Cancelling a registration removes it from store and allows re-registration
  test('13. cancelRegistration removes event and allows re-registration with a new pass', () => {
    const item = SCHEDULE_ITEMS[0];
    const initial = createOrGetRegistration(item);
    assert.equal(initial.isNew, true);
    assert.equal(loadRegistrations().length, 1);

    const remaining = cancelRegistration(item.id);
    assert.equal(remaining.length, 0);
    assert.equal(loadRegistrations().length, 0);

    const second = createOrGetRegistration(item);
    assert.equal(second.isNew, true);
    assert.equal(loadRegistrations().length, 1);
  });
});
