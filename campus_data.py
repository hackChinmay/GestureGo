"""
campus_data.py - Campus and Event Information Data Store for GestureGo.

This module provides structured data for the touchless campus kiosk,
including event schedules, venues, stalls, organizer contacts, and gesture guides.
All sample data is explicitly marked as demo content.
"""

from typing import List, Dict, Any

EVENT_INFO = {
    "name": "Apex Tech Con 2026 — Annual Innovation & AI Summit",
    "tagline": "Empowering Tomorrow's Creators with Touchless & AI Systems",
    "dates": "October 24–26, 2026",
    "venue": "North Quad Innovation Pavilion & Hall 3",
    "disclaimer": "Sample kiosk demonstration content. Real event details may vary.",
}

# The 7 canonical gesture classes and their actions
GESTURE_DEFINITIONS = {
    "OPEN_PALM": {
        "action": "GO_HOME",
        "description": "Return to the main home dashboard",
        "category": "Navigation",
        "icon": "hand",
    },
    "POINTING_UP": {
        "action": "NEXT_ITEM",
        "description": "Move to the next menu or schedule item",
        "category": "Selection",
        "icon": "arrow-up",
    },
    "VICTORY": {
        "action": "OPEN_SCHEDULE",
        "description": "Open the event and keynote schedule",
        "category": "Navigation",
        "icon": "calendar",
    },
    "THUMBS_UP": {
        "action": "CONFIRM",
        "description": "Confirm the selected menu option or registration",
        "category": "Action",
        "icon": "check",
    },
    "CLOSED_FIST": {
        "action": "GO_BACK",
        "description": "Return to the previous screen",
        "category": "Navigation",
        "icon": "undo",
    },
    "THUMBS_DOWN": {
        "action": "CANCEL",
        "description": "Cancel the current modal or pending action",
        "category": "Action",
        "icon": "x",
    },
    "I_LOVE_YOU": {
        "action": "OPEN_HELP",
        "description": "Open help, gesture guide, and kiosk instructions",
        "category": "Help",
        "icon": "help-circle",
    },
}

SCHEDULE_ITEMS: List[Dict[str, Any]] = [
    {
        "id": "s1",
        "time": "09:00 AM - 10:15 AM",
        "title": "Opening Keynote: The Frontier of Edge AI & Vision Systems",
        "speaker": "Dr. Sarah Lin (Dean of Engineering)",
        "location": "Main Auditorium (Hall A)",
        "track": "Keynote",
        "status": "Completed",
    },
    {
        "id": "s2",
        "time": "10:30 AM - 12:00 PM",
        "title": "Workshop: Building Real-Time HCI with MediaPipe & XGBoost",
        "speaker": "Alex Rivera & Maya Chen (AI Robotics Lab)",
        "location": "Innovation Lab 204",
        "track": "Technical Workshop",
        "status": "In Progress",
    },
    {
        "id": "s3",
        "time": "12:15 PM - 01:30 PM",
        "title": "Networking Luncheon & Touchless Project Demonstrations",
        "speaker": "Campus Culinary & Sponsor Teams",
        "location": "Central Dining Atrium",
        "track": "Networking",
        "status": "Upcoming",
    },
    {
        "id": "s4",
        "time": "01:45 PM - 03:15 PM",
        "title": "Inter-Collegiate Hackathon Pitch Showcase",
        "speaker": "Top 12 Finalist Teams",
        "location": "Multipurpose Hall 3",
        "track": "Competition",
        "status": "Upcoming",
    },
    {
        "id": "s5",
        "time": "03:30 PM - 05:00 PM",
        "title": "Panel: Accessibility & Safety in Public Touchless Interfaces",
        "speaker": "Prof. Marcus Thorne, Dr. Priyah Patel",
        "location": "Auditorium B",
        "track": "Panel",
        "status": "Upcoming",
    },
    {
        "id": "s6",
        "time": "05:15 PM - 06:30 PM",
        "title": "Awards Ceremony & Faculty Recognition Gala",
        "speaker": "University President & Guest Luminaries",
        "location": "Main Auditorium (Hall A)",
        "track": "Ceremony",
        "status": "Upcoming",
    },
]

CAMPUS_VENUES: List[Dict[str, Any]] = [
    {
        "id": "v1",
        "name": "Main Auditorium (Hall A)",
        "building": "Science & Arts Complex, Block 1",
        "floor": "Ground Floor",
        "capacity": "850 seats",
        "features": ["Wheelchair Accessible", "Assistive Listening Loop", "Dual Projection"],
        "directions": "Enter through North Portal, turn left past the Central Atrium.",
    },
    {
        "id": "v2",
        "name": "Innovation Lab 204",
        "building": "Computer Science & Robotics Tower",
        "floor": "Level 2 (Elevator B)",
        "capacity": "90 workstations",
        "features": ["GPU Workstations", "Soldering Stations", "High-speed Fiber"],
        "directions": "Take Elevator B to 2nd Floor, straight ahead into Robotics Corridor.",
    },
    {
        "id": "v3",
        "name": "Central Dining Atrium",
        "building": "Campus Student Center",
        "floor": "Ground & Mezzanine",
        "capacity": "600 seats",
        "features": ["Halal/Vegetarian/Vegan Stations", "Water Refill", "Outdoor Terrace"],
        "directions": "South quadrangle, directly across from the Central Library fountain.",
    },
    {
        "id": "v4",
        "name": "Multipurpose Hall 3",
        "building": "Recreation & Exhibition Center",
        "floor": "Level 1",
        "capacity": "500 attendees",
        "features": ["Modular Booths", "A/V Rigging", "Dedicated Registration Desk"],
        "directions": "Follow West Pathway past Tennis Pavilion to Hall 3 entrance.",
    },
]

EVENT_STALLS: List[Dict[str, Any]] = [
    {
        "id": "stall-1",
        "name": "Apex AI Research & Vision Lab",
        "category": "Research Showcase",
        "booth": "Booth A-01",
        "highlights": "Live demos of MediaPipe hand tracking, low-latency edge inference, and robotics manipulation.",
    },
    {
        "id": "stall-2",
        "name": "Google Developer Student Club (GDSC)",
        "category": "Student Organization",
        "booth": "Booth A-07",
        "highlights": "Open-source mentorship, cloud credits distribution, and hackathon project critiques.",
    },
    {
        "id": "stall-3",
        "name": "Hardware Hackers & Embedded IoT",
        "category": "Makerspace",
        "booth": "Booth B-03",
        "highlights": "Raspberry Pi 5 clusters, ESP32 vision sensors, and custom 3D printed kiosk housings.",
    },
    {
        "id": "stall-4",
        "name": "Campus Career & Co-Op Hub",
        "category": "Career Services",
        "booth": "Booth C-12",
        "highlights": "Resume reviews, interview scheduling with attending industry partners, and internship matching.",
    },
    {
        "id": "stall-5",
        "name": "Solar Kart Racing Team",
        "category": "Engineering Project",
        "booth": "Courtyard Display",
        "highlights": "Formula Student electric racing kart display with telemetry dashboard.",
    },
]

ORGANIZER_CONTACTS: List[Dict[str, Any]] = [
    {
        "role": "General Event Chair",
        "name": "Prof. David Vance",
        "dept": "Department of Computer Science & Engineering",
        "email": "d.vance@campus.edu",
        "phone": "+1 (555) 019-2831",
        "office": "CS-318",
    },
    {
        "role": "Student Organizing Lead",
        "name": "Nadia Kowalski",
        "dept": "AI Society & Robotics Club",
        "email": "n.kowalski@student.campus.edu",
        "phone": "+1 (555) 019-4420",
        "office": "Student Council Suite 12",
    },
    {
        "role": "Campus Safety & Medical Desk",
        "name": "Campus First Response Center",
        "dept": "Security & Emergency Services",
        "email": "safety@campus.edu",
        "phone": "+1 (555) 019-9911 (Ext. 4)",
        "office": "North Gate Security HQ",
    },
    {
        "role": "IT & Kiosk Technical Support",
        "name": "GestureGo Engineering Team",
        "dept": "Campus Digital Infrastructure",
        "email": "gesturego-support@campus.edu",
        "phone": "+1 (555) 019-5500",
        "office": "Library Lower Level B4",
    },
]
