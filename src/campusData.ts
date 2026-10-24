import { ScheduleItem, CampusVenue, EventStall, OrganizerContact, GestureClass, KioskAction } from './types';

export const EVENT_INFO = {
  name: 'Apex Tech Con 2026 — Annual Innovation & AI Summit',
  tagline: "Student-Led Touchless HCI Systems for Campus Navigation",
  dates: 'October 24–26, 2026',
  venue: 'North Quad Innovation Pavilion & Hall 3',
  disclaimer: 'Demonstration campus kiosk content for evaluation and testing.',
};

// Single, centralized page sequence configuration
export const PAGE_ORDER = [
  'Home',
  'Schedule',
  'Venues',
  'Stalls',
  'Contacts',
  'Help',
  'Evaluation',
] as const;

export type PageId = typeof PAGE_ORDER[number];

export function getNextPage(currentPage: string): PageId {
  const idx = PAGE_ORDER.indexOf(currentPage as PageId);
  if (idx === -1) return PAGE_ORDER[0];
  return PAGE_ORDER[(idx + 1) % PAGE_ORDER.length];
}

export function getPrevPage(currentPage: string): PageId {
  const idx = PAGE_ORDER.indexOf(currentPage as PageId);
  if (idx === -1 || idx === 0) return PAGE_ORDER[PAGE_ORDER.length - 1];
  return PAGE_ORDER[idx - 1];
}

export const GESTURE_DEFINITIONS: Record<
  GestureClass,
  { action: KioskAction; description: string; category: string; icon: string; prompt: string }
> = {
  OPEN_PALM: {
    action: 'HOME',
    description: 'Return to the main campus home dashboard',
    category: 'Navigation',
    icon: '✋',
    prompt: 'Open flat hand with all 5 fingers clearly extended.',
  },
  POINTING_UP: {
    action: 'NEXT_PAGE',
    description: 'Advance to the next campus page in sequence',
    category: 'Navigation',
    icon: '☝️',
    prompt: 'Point index finger upward; curl middle, ring, pinky, and thumb.',
  },
  POINTING_DOWN: {
    action: 'SCROLL_DOWN',
    description: 'Scroll content container down by 65% height',
    category: 'Navigation',
    icon: '👇',
    prompt: 'Point index finger downward toward floor; curl other fingers.',
  },
  VICTORY: {
    action: 'OPEN_SCHEDULE',
    description: 'Directly open the event and keynote schedule',
    category: 'Shortcut',
    icon: '✌️',
    prompt: 'Extend index and middle fingers in a V shape; curl ring and pinky.',
  },
  THUMBS_UP: {
    action: 'CONFIRM_OR_SELECT',
    description: 'Confirm selection or acknowledge alert',
    category: 'Action',
    icon: '👍',
    prompt: 'Extend thumb upward with other fingers curled into a fist.',
  },
  CLOSED_FIST: {
    action: 'BACK',
    description: 'Return to previous screen in history stack',
    category: 'Navigation',
    icon: '✊',
    prompt: 'Curl all fingers and thumb tightly into a solid fist.',
  },
  THUMBS_DOWN: {
    action: 'CANCEL',
    description: 'Dismiss active modal or cancel pending operation',
    category: 'Action',
    icon: '👎',
    prompt: 'Point thumb downward with other fingers curled into a fist.',
  },
  I_LOVE_YOU: {
    action: 'OPEN_HELP',
    description: 'Open help, gesture guide, and kiosk instructions',
    category: 'Help',
    icon: '🤟',
    prompt: 'Extend thumb, index, and pinky; keep middle and ring curled.',
  },
  NO_HAND: {
    action: 'HOME',
    description: 'No hand detected in camera frame (neutral state)',
    category: 'Internal',
    icon: '🚫',
    prompt: 'Place your hand 1.5 - 3 feet in front of camera.',
  },
  UNKNOWN: {
    action: 'HOME',
    description: 'Hand visible but pose not recognized in target set',
    category: 'Internal',
    icon: '❓',
    prompt: 'Form one of the 8 supported gestures clearly facing the camera.',
  },
  UNCERTAIN: {
    action: 'HOME',
    description: 'Confidence below threshold or gesture held too briefly',
    category: 'Internal',
    icon: '⚠️',
    prompt: 'Hold the gesture steady for ~300ms in good lighting.',
  },
  LOCKED_HOLD: {
    action: 'HOME',
    description: 'Gesture executed; locked until released to neutral',
    category: 'Internal',
    icon: '🔒',
    prompt: 'Release hand to neutral before performing next gesture.',
  },
};

export const GESTURE_TO_ACTION: Record<string, KioskAction> = {
  OPEN_PALM: 'HOME',
  POINTING_UP: 'NEXT_PAGE',
  POINTING_DOWN: 'SCROLL_DOWN',
  VICTORY: 'OPEN_SCHEDULE',
  THUMBS_UP: 'CONFIRM_OR_SELECT',
  CLOSED_FIST: 'BACK',
  THUMBS_DOWN: 'CANCEL',
  I_LOVE_YOU: 'OPEN_HELP',
};

export const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 's1',
    time: '09:00 AM - 10:15 AM',
    title: 'Opening Keynote: Edge Computer Vision & Tactile Interfaces',
    speaker: 'Dr. Sarah Lin (Dean of Engineering)',
    location: 'Main Auditorium (Hall A)',
    track: 'Keynote',
    status: 'Completed',
    description: 'Exploration of real-time computer vision models operating locally on edge silicon with low power and zero cloud latency.',
  },
  {
    id: 's2',
    time: '10:30 AM - 12:00 PM',
    title: 'Workshop: Real-Time HCI with MediaPipe & Decision Trees',
    speaker: 'Alex Rivera & Maya Chen (AI Robotics Lab)',
    location: 'Innovation Lab 204',
    track: 'Technical Workshop',
    status: 'In Progress',
    description: 'Hands-on lab training decision trees on normalized 3D hand coordinates for microsecond edge inference.',
  },
  {
    id: 's3',
    time: '12:15 PM - 01:30 PM',
    title: 'Networking Luncheon & Touchless Project Demonstrations',
    speaker: 'Campus Culinary & Sponsor Teams',
    location: 'Central Dining Atrium',
    track: 'Networking',
    status: 'Upcoming',
    description: 'Informal networking with industry sponsors, student project showcases, and complimentary buffet.',
  },
  {
    id: 's4',
    time: '01:45 PM - 03:15 PM',
    title: 'Inter-Collegiate Hackathon Pitch Showcase',
    speaker: 'Top 12 Finalist Teams',
    location: 'Multipurpose Hall 3',
    track: 'Competition',
    status: 'Upcoming',
    description: 'Live 4-minute pitches before faculty and venture judges covering assistive tech, campus IoT, and computer vision.',
  },
  {
    id: 's5',
    time: '03:30 PM - 05:00 PM',
    title: 'Panel: Ergonomics & Safety in Public Touchless Kiosks',
    speaker: 'Prof. Marcus Thorne, Dr. Priyah Patel',
    location: 'Auditorium B',
    track: 'Panel',
    status: 'Upcoming',
    description: 'Discussions on hygienic public kiosks, motor impairment ergonomics, and confidence-gated decision layers.',
  },
  {
    id: 's6',
    time: '05:15 PM - 06:30 PM',
    title: 'Awards Ceremony & Student Recognition Gala',
    speaker: 'University President & Guest Luminaries',
    location: 'Main Auditorium (Hall A)',
    track: 'Ceremony',
    status: 'Upcoming',
    description: 'Closing honors, hackathon champion prize distribution, and student research excellence medals.',
  },
  {
    id: 's7',
    time: '07:00 PM - 09:00 PM',
    title: 'Open Robotics Maker Social & Lightning Talks',
    speaker: 'Student Autonomous Club & Guest Engineers',
    location: 'Innovation Hub Courtyard',
    track: 'Social',
    status: 'Upcoming',
    description: 'Casual robotics demo mixer, hardware prototyping demos, and peer-to-peer student tech lightning talks.',
  },
];

export const CAMPUS_VENUES: CampusVenue[] = [
  {
    id: 'v1',
    name: 'Main Auditorium (Hall A)',
    building: 'Science & Arts Complex, Block 1',
    floor: 'Ground Floor',
    capacity: '850 seats',
    features: ['Wheelchair Accessible', 'Assistive Listening Loop', 'Dual 4K Laser Projection'],
    directions: 'Enter through North Portal, turn left past the Central Atrium fountain.',
    coordinates: { x: 28, y: 35 },
  },
  {
    id: 'v2',
    name: 'Innovation Lab 204',
    building: 'Computer Science & Robotics Tower',
    floor: 'Level 2 (Elevator B)',
    capacity: '90 workstations',
    features: ['GPU Workstations', 'Soldering Stations', 'Gigabit Ethernet', 'Oscilloscopes'],
    directions: 'Take Elevator B to 2nd Floor, straight ahead into the Robotics Research Corridor.',
    coordinates: { x: 65, y: 25 },
  },
  {
    id: 'v3',
    name: 'Central Dining Atrium',
    building: 'Campus Student Center',
    floor: 'Ground & Mezzanine',
    capacity: '600 seats',
    features: ['Dietary Stations (Halal/Vegan)', 'Hydration Refills', 'Outdoor Garden Terrace'],
    directions: 'South quadrangle, directly across from the Central Library fountain.',
    coordinates: { x: 45, y: 68 },
  },
  {
    id: 'v4',
    name: 'Multipurpose Hall 3',
    building: 'Recreation & Exhibition Center',
    floor: 'Level 1',
    capacity: '500 attendees',
    features: ['Modular Hackathon Booths', 'Rigged A/V', 'Dedicated Registration Desk'],
    directions: 'Follow West Pathway past Tennis Pavilion directly to Hall 3 main foyer.',
    coordinates: { x: 80, y: 75 },
  },
  {
    id: 'v5',
    name: 'Library Digital Commons',
    building: 'University Memorial Library',
    floor: 'Floor 1 West Wing',
    capacity: '200 seats',
    features: ['Quiet Study Pods', '3D Printing Lab', 'Bookable Group Collaboration Rooms'],
    directions: 'Enter Main Library, pass turnstiles, take West Hallway to Digital Commons.',
    coordinates: { x: 50, y: 45 },
  },
];

export const EVENT_STALLS: EventStall[] = [
  {
    id: 'stall-1',
    name: 'Apex AI Research & Vision Lab',
    category: 'Research Showcase',
    booth: 'Booth A-01',
    highlights: 'Live demos of MediaPipe hand tracking, low-latency edge inference, and robotic gripper control.',
  },
  {
    id: 'stall-2',
    name: 'Google Developer Student Club (GDSC)',
    category: 'Student Organization',
    booth: 'Booth A-07',
    highlights: 'Open-source mentorship, cloud architecture guides, and hackathon prototype critiques.',
  },
  {
    id: 'stall-3',
    name: 'Hardware Hackers & Embedded IoT',
    category: 'Makerspace',
    booth: 'Booth B-03',
    highlights: 'Raspberry Pi 5 clusters, ESP32-CAM vision modules, and 3D printed touchless kiosk enclosures.',
  },
  {
    id: 'stall-4',
    name: 'Campus Career & Co-Op Hub',
    category: 'Career Services',
    booth: 'Booth C-12',
    highlights: 'Resume reviews, mock technical interviews with tech partners, and fall internship registration.',
  },
  {
    id: 'stall-5',
    name: 'Solar Kart Racing Team',
    category: 'Engineering Project',
    booth: 'Courtyard Display',
    highlights: 'Formula Student electric solar kart on display with real-time CAN bus telemetry dashboard.',
  },
  {
    id: 'stall-6',
    name: 'Bio-Informatics & Genomics Society',
    category: 'Student Research',
    booth: 'Booth D-04',
    highlights: 'CRISPR visualization tools, protein folding simulation rigs, and student poster presentations.',
  },
];

export const ORGANIZER_CONTACTS: OrganizerContact[] = [
  {
    role: 'General Event Chair',
    name: 'Prof. David Vance',
    dept: 'Department of Computer Science & Engineering',
    email: 'd.vance@campus.edu',
    phone: '+1 (555) 019-2831',
    office: 'CS-318',
  },
  {
    role: 'Student Organizing Lead',
    name: 'Nadia Kowalski',
    dept: 'AI Society & Robotics Club',
    email: 'n.kowalski@student.campus.edu',
    phone: '+1 (555) 019-4420',
    office: 'Student Council Suite 12',
  },
  {
    role: 'Campus Safety & First Aid',
    name: 'Campus Response Center',
    dept: 'Emergency Operations Command',
    email: 'safety@campus.edu',
    phone: '+1 (555) 019-9911',
    office: 'North Gate Security HQ',
  },
  {
    role: 'Kiosk & HCI Support',
    name: 'GestureGo Engineering Team',
    dept: 'Campus Digital Infrastructure',
    email: 'gesturego-support@campus.edu',
    phone: '+1 (555) 019-5500',
    office: 'Library Level B4',
  },
];
