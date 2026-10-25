export type GestureClass =
  | 'OPEN_PALM'
  | 'POINTING_UP'
  | 'POINTING_DOWN'
  | 'VICTORY'
  | 'THUMBS_UP'
  | 'CLOSED_FIST'
  | 'THUMBS_DOWN'
  | 'I_LOVE_YOU'
  | 'NO_HAND'
  | 'UNKNOWN'
  | 'UNCERTAIN'
  | 'LOCKED_HOLD';

export type KioskAction =
  | 'HOME'
  | 'NEXT_PAGE'
  | 'OPEN_SCHEDULE'
  | 'CONFIRM_OR_SELECT'
  | 'BACK'
  | 'SCROLL_DOWN'
  | 'CANCEL'
  | 'OPEN_HELP'
  // Legacy alias compatibility
  | 'GO_HOME'
  | 'NEXT_ITEM'
  | 'CONFIRM'
  | 'GO_BACK';

export type ControllerState =
  | 'READY'
  | 'CANDIDATE'
  | 'EXECUTED'
  | 'LOCKED_HOLD'
  // Legacy aliases
  | 'IDLE'
  | 'CONFIRMED'
  | 'LOCKED'
  | 'REARMED';

export type RejectionReason =
  | 'NONE'
  | 'NO_HAND'
  | 'UNRECOGNIZED_POSE'
  | 'BELOW_CONFIDENCE'
  | 'TEMPORAL_INSTABILITY'
  | 'LOCKED_HOLD'
  | 'COOLDOWN_ACTIVE';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface ControllerTelemetry {
  state: ControllerState;
  gesture: GestureClass;
  confidence: number;
  action: KioskAction | null;
  lastAction: KioskAction | null;
  lockedGesture: GestureClass | null;
  stabilityPct: number;
  candidateFrames: number;
  rejectionReason: RejectionReason;
  rejectionDetail: string;
  counters: {
    totalFrames: number;
    totalActions: number;
    repeatedPreventions: number;
    lowConfidenceRejections: number;
    unstableRejections: number;
    neutralReleases: number;
  };
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  speaker: string;
  location: string;
  track: string;
  status: 'Completed' | 'In Progress' | 'Upcoming';
  description?: string;
}

export interface CampusVenue {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: string;
  features: string[];
  directions: string;
  coordinates?: { x: number; y: number };
}

export interface EventStall {
  id: string;
  name: string;
  category: string;
  booth: string;
  highlights: string;
}

export interface OrganizerContact {
  role: string;
  name: string;
  dept: string;
  email: string;
  phone: string;
  office: string;
}

export interface EvaluationRecord {
  id: string;
  timestamp: number;
  targetGesture: GestureClass;
  detectedGesture: GestureClass;
  confidence: number;
  match: boolean;
  rejected: boolean;
  latencyMs: number;
  rejectionReason: RejectionReason;
}

export interface EventRegistration {
  registrationId: string;
  registrationCode: string;
  eventId: string;
  eventNameSnapshot: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  registrationStatus: 'CONFIRMED' | 'ACTIVE';
  registeredAt: string;
}

export type EventCategory = 'hackathon' | 'workshop' | 'competition' | 'games' | 'entrepreneurship' | 'other';
export type EventStatus = 'scheduled' | 'completed' | 'cancelled' | 'unknown';
export type PhotoType = 'poster' | 'event_photo' | 'gallery_photo' | 'banner';

export interface GravitasVenue {
  id: string;
  name: string;
  building_name?: string | null;
  block_name?: string | null;
  floor?: string | null;
  room_number?: string | null;
  campus: string;
  address_description?: string | null;
  directions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  official_map_url?: string | null;
  source_url?: string | null;
  verification_status: 'verified' | 'partially_verified' | 'unverified';
}

export interface GravitasPhoto {
  id: string;
  event_id?: string | null;
  filename: string;
  storage_path: string;
  bucket_name: string;
  caption?: string | null;
  alt_text: string;
  image_type: PhotoType;
  source_url: string;
  credit?: string | null;
  is_primary: boolean;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface GravitasEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description?: string | null;
  category: EventCategory;
  organizer_name: string;
  festival_name: string;
  festival_year: number;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue_id?: string | null;
  venue?: GravitasVenue | null;
  registration_fee_inr?: number | null;
  min_team_size?: number | null;
  max_team_size?: number | null;
  registration_url?: string | null;
  official_event_url: string;
  event_status: EventStatus;
  data_source: string;
  last_verified_at: string;
  primary_photo?: GravitasPhoto | null;
  photos?: GravitasPhoto[];
}
