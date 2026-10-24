/**
 * registrationStore.ts - Local Persistent Registration Engine for GestureGo.
 * 
 * Manages unique pass codes, duplicate prevention, and local persistence.
 * Uses Crockford-inspired alphanumeric characters (no ambiguous 0/O or 1/I/L)
 * with a 32^8 (~1.1 trillion) random keyspace.
 */

import { EventRegistration, ScheduleItem } from './types';

export const STORAGE_KEY = 'gesturego_registrations_v1';

// 32-character alphabet omitting visually ambiguous glyphs: 0, O, 1, I, L
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a collision-free human-readable registration code in format GG-XXXXXXXX.
 */
export function generateUniqueCode(existingCodes: Set<string>): string {
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let suffix = '';
    // Use Web Crypto if available, falling back gracefully
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buffer = new Uint8Array(8);
      crypto.getRandomValues(buffer);
      for (let i = 0; i < 8; i++) {
        suffix += CODE_ALPHABET[buffer[i] % CODE_ALPHABET.length];
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const randIdx = Math.floor(Math.random() * CODE_ALPHABET.length);
        suffix += CODE_ALPHABET[randIdx];
      }
    }

    const code = `GG-${suffix}`;
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  // Extreme fallback with timestamp seed if 100 random attempts collide
  const fallbackSuffix = Date.now().toString(36).toUpperCase().padStart(8, 'X').slice(-8);
  return `GG-${fallbackSuffix}`;
}

/**
 * Loads saved registrations from local storage.
 */
export function loadRegistrations(): EventRegistration[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (r) => r && typeof r.eventId === 'string' && typeof r.registrationCode === 'string'
      );
    }
    return [];
  } catch (err) {
    console.warn('[RegistrationStore] Failed to read registrations from localStorage:', err);
    return [];
  }
}

/**
 * Persists registration list to local storage.
 */
export function saveRegistrations(registrations: EventRegistration[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    return true;
  } catch (err) {
    console.error('[RegistrationStore] Failed to save registrations to localStorage:', err);
    return false;
  }
}

/**
 * Core registration function:
 * If user has already registered for eventId, returns existing registration (isNew: false).
 * If not, generates a unique code, stores the record, and returns (isNew: true).
 */
export function createOrGetRegistration(
  event: ScheduleItem,
  eventDate = 'October 24–26, 2026'
): { registration: EventRegistration; isNew: boolean } {
  const currentList = loadRegistrations();

  // 1. Check for existing registration by stable event ID
  const existing = currentList.find((r) => r.eventId === event.id);
  if (existing) {
    return { registration: existing, isNew: false };
  }

  // 2. Collect existing codes for collision detection
  const existingCodes = new Set<string>(currentList.map((r) => r.registrationCode));
  const newCode = generateUniqueCode(existingCodes);

  // 3. Create new immutable registration record
  const newRegistration: EventRegistration = {
    registrationId: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    registrationCode: newCode,
    eventId: event.id,
    eventNameSnapshot: event.title,
    eventDate: eventDate,
    eventTime: event.time,
    venue: event.location,
    registrationStatus: 'CONFIRMED',
    registeredAt: new Date().toISOString(),
  };

  currentList.push(newRegistration);
  saveRegistrations(currentList);

  return { registration: newRegistration, isNew: true };
}

/**
 * Copies registration code to clipboard with cross-browser fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to manual fallback
    }
  }

  // DOM fallback
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('[RegistrationStore] Clipboard copy failed:', err);
      return false;
    }
  }

  return false;
}

/**
 * Downloads a formatted digital pass file (.txt).
 */
export function downloadPassFile(reg: EventRegistration): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const content = `=======================================================
       GESTUREGO — EVENT REGISTRATION PASS
       Apex Tech Con 2026 • Touchless Campus Assistant
=======================================================

REGISTRATION CODE : ${reg.registrationCode}
STATUS            : ${reg.registrationStatus}
REGISTERED AT     : ${new Date(reg.registeredAt).toLocaleString()}

EVENT DETAILS
-------------------------------------------------------
EVENT TITLE       : ${reg.eventNameSnapshot}
DATE              : ${reg.eventDate}
TIME              : ${reg.eventTime}
VENUE             : ${reg.venue}

LOCAL DEMONSTRATION NOTICE:
This pass was generated locally on the GestureGo Touchless
Campus Kiosk terminal. Present this registration code at
the registration desk for session check-in.
=======================================================
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pass-${reg.registrationCode}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
