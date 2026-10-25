import { ScheduleItem, CampusVenue, EventStall, OrganizerContact, GestureClass, KioskAction } from './types';

export const EVENT_INFO = {
  name: "graVITas '26 — International Techno-Management Festival",
  tagline: "VIT Vellore's Flagship Annual Tech Fest",
  dates: 'September 18–20, 2026',
  venue: 'VIT Vellore Campus (SJT, TT, Anna Auditorium & MB)',
  disclaimer: "Verified graVITas '26 historical festival archive and VIT Vellore campus directory.",
};

// Single, centralized page sequence configuration
export const PAGE_ORDER = [
  'Home',
  'Schedule',
  'Venues',
  'Gallery',
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
    description: 'Scroll content container down / advance selected item',
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
    description: 'Register pass for the selected event or confirm action',
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
    description: 'Close open pass window or dismiss dialog',
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
    time: '09:30 AM - 06:00 PM',
    title: 'EnergyThon',
    speaker: 'Energy Club & SELECT',
    location: 'Bhagat Singh Gallery (SJT 8th Floor)',
    track: 'Hackathon',
    status: 'Completed',
    description: '24-hour clean energy, battery storage, and smart power grid prototyping hackathon at graVITas 2026.',
  },
  {
    id: 's2',
    time: '10:00 AM - 07:00 PM',
    title: 'RoboWars ’26: National Combat Robotics Championship',
    speaker: 'RoboVITics Club',
    location: 'RoboWars Arena (SMV Outdoor Court)',
    track: 'Competition',
    status: 'Completed',
    description: 'Flagship 15kg and 60kg combat robotics heavyweight battle championship in a bulletproof polycarbonate arena.',
  },
  {
    id: 's3',
    time: '11:00 AM - 11:00 PM',
    title: 'HackVerse ’26: 36-Hour National Hackathon & CTF',
    speaker: 'CodeChef-VIT & SCOPE',
    location: 'Technology Tower Computer Labs',
    track: 'Hackathon',
    status: 'Completed',
    description: '36-hour national software hackathon and cybersecurity CTF challenge across AI, Web3, and HealthTech.',
  },
  {
    id: 's4',
    time: '09:00 AM - 11:00 AM',
    title: 'graVITas ’26 Grand Inauguration & Keynote',
    speaker: 'University Leadership & Guest Scientists',
    location: 'Anna Auditorium',
    track: 'Keynote',
    status: 'Completed',
    description: 'Official ceremonial opening address and keynote presentation unveiling graVITas 2026.',
  },
  {
    id: 's5',
    time: '09:30 AM - 01:30 PM',
    title: 'Edge AI & Embedded Vision Workshop',
    speaker: 'IEEE Computer Society VIT',
    location: 'Dr. M. Channa Reddy Auditorium',
    track: 'Workshop',
    status: 'Completed',
    description: 'Hands-on technical workshop on lightweight neural networks, quantization, and edge gesture models.',
  },
  {
    id: 's6',
    time: '02:00 PM - 06:00 PM',
    title: 'Circuitron ’26: Hardware Debugging & VLSI Sprint',
    speaker: 'IETE-VIT & SENSE',
    location: 'Sarojini Naidu Gallery',
    track: 'Competition',
    status: 'Completed',
    description: 'Multi-round electronics circuit diagnosis, breadboard prototyping, and FPGA hardware sprint.',
  },
  {
    id: 's7',
    time: '10:00 AM - 01:30 PM',
    title: 'BioSummit & HealthTech Innovation Pitch',
    speaker: 'School of Bio Sciences & Technology (SBST)',
    location: 'Kamaraj Auditorium',
    track: 'Entrepreneurship',
    status: 'Completed',
    description: 'Assistive healthcare devices, biomedical sensing prototypes, and biotech startup pitch competition.',
  },
  {
    id: 's8',
    time: '04:00 PM - 06:30 PM',
    title: 'graVITas ’26 Valedictory & Awards Ceremony',
    speaker: 'Office of Students\' Welfare & Sponsors',
    location: 'Anna Auditorium',
    track: 'Ceremony',
    status: 'Completed',
    description: 'Grand festival finale, hackathon champion announcements, and awards distribution at Anna Auditorium.',
  },
];

export const CAMPUS_VENUES: CampusVenue[] = [
  {
    id: 'v1',
    name: 'Bhagat Singh Gallery',
    building: 'Silver Jubilee Tower (SJT)',
    floor: '8th Floor',
    capacity: '250 attendees',
    features: ['Air Conditioned', 'Multimedia Projection', 'Poster Presentation Rails'],
    directions: 'Take the SJT Central Elevators to the 8th floor. Turn right through the foyer toward the gallery portal.',
    coordinates: { x: 30, y: 40 },
  },
  {
    id: 'v2',
    name: 'Anna Auditorium',
    building: 'Central Campus Complex',
    floor: 'Ground Floor',
    capacity: '1,800 seats',
    features: ['Wheelchair Accessible', 'Theatrical Lighting', 'Surround Acoustics'],
    directions: 'Located in the central campus quadrangle directly north of the Main Administrative Building lawn.',
    coordinates: { x: 50, y: 30 },
  },
  {
    id: 'v3',
    name: 'Dr. M. Channa Reddy Auditorium',
    building: 'Main Building (MB)',
    floor: 'Ground Floor',
    capacity: '469 seats',
    features: ['Fixed Tiered Seating', 'Stage Audio Loop', 'Central A/C'],
    directions: 'Enter through Main Building main portico, pass central reception, proceed left down ground floor gallery.',
    coordinates: { x: 45, y: 65 },
  },
  {
    id: 'v4',
    name: 'Kamaraj Auditorium',
    building: 'Technology Tower (TT)',
    floor: '7th Floor',
    capacity: '320 seats',
    features: ['Acoustic Wall Panels', 'Dual 4K Projectors', 'Fast Wi-Fi'],
    directions: 'Enter Technology Tower main entrance, take East Wing elevators to the 7th floor.',
    coordinates: { x: 70, y: 45 },
  },
  {
    id: 'v5',
    name: 'Sarojini Naidu Gallery',
    building: 'Silver Jubilee Tower (SJT)',
    floor: '7th Floor',
    capacity: '200 seats',
    features: ['Exhibition Stands', 'Digital Podiums', 'A/C'],
    directions: 'Take SJT West elevators to the 7th floor, straight ahead into gallery foyer.',
    coordinates: { x: 32, y: 42 },
  },
  {
    id: 'v6',
    name: 'RoboWars Arena (SMV Outdoor Court)',
    building: 'Sri M. Visvesvaraya Building (SMV)',
    floor: 'Ground Level',
    capacity: '600 spectators',
    features: ['Reinforced Polycarbonate Barrier', 'Pit Area Workbenches', 'Live Match Telecast'],
    directions: 'Walk past SJT promenade toward SMV outdoor courts. Follow festival signage to RoboWars arena.',
    coordinates: { x: 80, y: 70 },
  },
];

export const EVENT_STALLS: EventStall[] = [
  {
    id: 'stall-1',
    name: 'RoboVITics — Official Robotics Club of VIT',
    category: 'Combat Robotics & Demos',
    booth: 'SMV Courtyard Booth S-01',
    highlights: 'Live combat bot pit demonstrations, humanoid robot showcases, and autonomous rover test trials.',
  },
  {
    id: 'stall-2',
    name: 'Energy Club & SELECT Innovation Showcase',
    category: 'Clean Energy & EV Tech',
    booth: 'SJT Ground Foyer Booth S-02',
    highlights: 'EV battery management prototypes, solar charging stations, and EnergyThon finalist project displays.',
  },
  {
    id: 'stall-3',
    name: 'CodeChef-VIT & SCOPE Computing Hub',
    category: 'Software & Open Source',
    booth: 'Technology Tower Promenade Booth S-03',
    highlights: 'Algorithmic problem-solving clinics, HackVerse CTF highlights, and open-source project walkthroughs.',
  },
  {
    id: 'stall-4',
    name: 'IEEE Computer Society VIT Branch',
    category: 'Technical Society',
    booth: 'Food Mall Plaza Booth S-04',
    highlights: 'Edge AI hardware testbeds, computer vision model benchmarks, and student technical papers.',
  },
  {
    id: 'stall-5',
    name: 'IETE-VIT & SENSE Electronics Hub',
    category: 'Hardware & Embedded Systems',
    booth: 'SJT Walkway Booth S-05',
    highlights: 'FPGA demo boards, high-speed oscilloscope diagnostics, and Circuitron competition showcases.',
  },
  {
    id: 'stall-6',
    name: 'Bio-Sciences Innovation Cell (SBST)',
    category: 'HealthTech & Biotechnology',
    booth: 'Main Building Lawn Booth S-06',
    highlights: 'Assistive medical sensing devices, bioinformatics visualization tools, and BioSummit presentations.',
  },
];

export const ORGANIZER_CONTACTS: OrganizerContact[] = [
  {
    role: 'Office of Students\' Welfare',
    name: 'Director of Student Welfare',
    dept: 'Vellore Institute of Technology, Vellore',
    email: 'events.sw@vit.ac.in',
    phone: '+91 416 220 4111',
    office: 'Room #204, 2nd Floor, PRP Annexe, VIT Vellore',
  },
  {
    role: 'graVITas Central Secretariat',
    name: 'graVITas Convenor & Organizing Committee',
    dept: 'Office of Students\' Welfare',
    email: 'gravitas@vit.ac.in',
    phone: '+91 416 220 2011',
    office: 'PRP Block Level 2, VIT Vellore Campus',
  },
  {
    role: 'Campus Security Command Center',
    name: 'VIT Security & Vigilance Wing',
    dept: 'Main Gate Control HQ',
    email: 'security@vit.ac.in',
    phone: '+91 416 220 2222',
    office: 'Main Gate Security Office, Katpadi Entrance',
  },
  {
    role: 'Campus Emergency Health Centre',
    name: 'VIT Health Centre & Ambulance Service',
    dept: 'Emergency Medical Services',
    email: 'healthcentre@vit.ac.in',
    phone: '+91 416 220 9999',
    office: 'Near Mens Hostel Block D & Food Mall',
  },
];
