export type GestureClass =
  | 'OPEN_PALM'
  | 'POINTING_UP'
  | 'VICTORY'
  | 'THUMBS_UP'
  | 'CLOSED_FIST'
  | 'THUMBS_DOWN'
  | 'I_LOVE_YOU'
  | 'NO_HAND'
  | 'UNKNOWN'
  | 'UNCERTAIN';

export type KioskAction =
  | 'GO_HOME'
  | 'NEXT_ITEM'
  | 'OPEN_SCHEDULE'
  | 'CONFIRM'
  | 'GO_BACK'
  | 'CANCEL'
  | 'OPEN_HELP';

export type ControllerState = 'IDLE' | 'CANDIDATE' | 'CONFIRMED' | 'LOCKED' | 'REARMED';

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
