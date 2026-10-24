"""
app.py - GestureGo Touchless AI Campus Assistant (Streamlit Kiosk & Dashboard).

A touchless campus information kiosk driven by confidence-aware
computer vision, temporal stability, and one-shot execution.
Redesigned with the Swiss poster editorial design language.

Launch locally with:
    streamlit run app.py
"""

import os
import time
import json
from typing import Optional
import streamlit as st

from gesture_controller import GestureController, ControllerState, GESTURE_TO_ACTION
from gesture_classifier import GestureClassifier
from registration_db import (
    create_or_get_registration,
    get_all_registrations,
    get_registration_by_event,
)
from campus_data import (
    EVENT_INFO,
    GESTURE_DEFINITIONS,
    PAGE_ORDER,
    SCHEDULE_ITEMS,
    CAMPUS_VENUES,
    EVENT_STALLS,
    ORGANIZER_CONTACTS,
)

# Page configuration
st.set_page_config(
    page_title="GestureGo — Touchless AI Campus Assistant",
    page_icon="✋",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom styling for Swiss poster editorial aesthetic (warm paper #FFF7E8, ink #17151B, lime #D8FF4F)
st.markdown(
    """
    <style>
    .stApp {
        background-color: #FFF7E8;
        color: #17151B;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    .kiosk-header {
        background: #FFFFFF;
        border: 2px solid #17151B;
        box-shadow: 4px 4px 0px #17151B;
        padding: 20px 24px;
        border-radius: 8px;
        color: #17151B;
        margin-bottom: 20px;
    }
    .kiosk-badge {
        display: inline-block;
        padding: 3px 10px;
        background-color: #D8FF4F;
        border: 1px solid #17151B;
        border-radius: 4px;
        color: #17151B;
        font-size: 0.8rem;
        font-weight: 800;
        margin-right: 6px;
    }
    .card-surface {
        background: #FFFFFF;
        border: 2px solid #17151B;
        box-shadow: 3px 3px 0px #17151B;
        border-radius: 8px;
        padding: 16px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Session State Initialization
if "controller" not in st.session_state:
    st.session_state.controller = GestureController(
        confidence_threshold=0.80,
        stability_duration_sec=0.35,
        required_stable_frames=7,
        cooldown_sec=0.30,
        required_neutral_frames=3,
    )

if "classifier" not in st.session_state:
    st.session_state.classifier = GestureClassifier()

if "current_page" not in st.session_state:
    st.session_state.current_page = "Home"

if "selected_schedule_index" not in st.session_state:
    st.session_state.selected_schedule_index = 0

if "confirmed_modal" not in st.session_state:
    st.session_state.confirmed_modal = None

if "history_stack" not in st.session_state:
    st.session_state.history_stack = ["Home"]

if "camera_active" not in st.session_state:
    st.session_state.camera_active = False

if "scroll_notice" not in st.session_state:
    st.session_state.scroll_notice = None

# Centralized Action Dispatcher
def execute_action(action: str, source: str = "gesture"):
    """Executes a centralized kiosk navigation or interaction command."""
    if action in ("HOME", "GO_HOME"):
        if st.session_state.current_page != "Home":
            st.session_state.current_page = "Home"
            st.session_state.history_stack.append("Home")
        st.session_state.confirmed_modal = None

    elif action in ("NEXT_PAGE", "NEXT_ITEM"):
        # Real next-page navigation along PAGE_ORDER
        pages = list(PAGE_ORDER)
        cur_idx = pages.index(st.session_state.current_page) if st.session_state.current_page in pages else 0
        next_page = pages[(cur_idx + 1) % len(pages)]
        st.session_state.current_page = next_page
        st.session_state.history_stack.append(next_page)

    elif action == "SCROLL_DOWN":
        if st.session_state.current_page == "Schedule":
            max_idx = len(SCHEDULE_ITEMS) - 1
            if st.session_state.selected_schedule_index < max_idx:
                st.session_state.selected_schedule_index += 1
                cur_it = SCHEDULE_ITEMS[st.session_state.selected_schedule_index]
                st.session_state.scroll_notice = f"Selected: {cur_it['title']} ({st.session_state.selected_schedule_index + 1}/{len(SCHEDULE_ITEMS)})"
            else:
                st.session_state.scroll_notice = f"End of schedule reached ({max_idx + 1}/{max_idx + 1} events)"
        else:
            st.session_state.scroll_notice = f"Scrolled {st.session_state.current_page} down (65%)"

    elif action == "OPEN_SCHEDULE":
        if st.session_state.current_page != "Schedule":
            st.session_state.current_page = "Schedule"
            st.session_state.history_stack.append("Schedule")

    elif action in ("CONFIRM_OR_SELECT", "CONFIRM"):
        if st.session_state.current_page == "Schedule":
            item = SCHEDULE_ITEMS[st.session_state.selected_schedule_index]
            reg, is_new = create_or_get_registration(
                event_id=item["id"],
                event_name=item["title"],
                event_date="October 24–26, 2026",
                event_time=item["time"],
                venue=item["location"],
            )
            st.session_state.confirmed_modal = {
                "title": "Registration Confirmed!" if is_new else "Existing Pass Retrieved",
                "event": item["title"],
                "code": reg["registration_code"],
                "time": item["time"],
                "venue": item["location"],
                "status": reg["registration_status"],
                "registered_at": reg["registered_at"],
                "is_new": is_new,
            }
        else:
            st.session_state.confirmed_modal = {
                "title": f"Action Confirmed on {st.session_state.current_page}",
                "event": st.session_state.current_page,
                "code": None,
                "time": "",
                "venue": "",
                "status": "CONFIRMED",
                "registered_at": "",
                "is_new": False,
            }

    elif action in ("BACK", "GO_BACK"):
        if len(st.session_state.history_stack) > 1:
            st.session_state.history_stack.pop()
            st.session_state.current_page = st.session_state.history_stack[-1]
        else:
            pages = list(PAGE_ORDER)
            cur_idx = pages.index(st.session_state.current_page) if st.session_state.current_page in pages else 0
            prev_page = pages[(cur_idx - 1) % len(pages)]
            st.session_state.current_page = prev_page
            st.session_state.history_stack = [prev_page]
        st.session_state.confirmed_modal = None

    elif action == "CANCEL":
        st.session_state.confirmed_modal = None
        st.session_state.scroll_notice = None

    elif action == "OPEN_HELP":
        if st.session_state.current_page != "Help":
            st.session_state.current_page = "Help"
            st.session_state.history_stack.append("Help")

# Sidebar: Controls & Live Settings
with st.sidebar:
    st.markdown("### 🖐️ GestureGo Navigation")
    st.caption("Active Mode: Touchless Kiosk (Swiss Editorial)")

    nav_selection = st.radio(
        "Page Sequence (PAGE_ORDER)",
        options=list(PAGE_ORDER),
        index=list(PAGE_ORDER).index(
            st.session_state.current_page if st.session_state.current_page in PAGE_ORDER else "Home"
        ),
    )
    if nav_selection != st.session_state.current_page:
        st.session_state.current_page = nav_selection
        st.session_state.history_stack.append(nav_selection)

    st.divider()
    st.markdown("### ⚙️ Decision Layer Settings")
    conf_thresh = st.slider(
        "Confidence Threshold",
        min_value=0.50,
        max_value=0.98,
        value=st.session_state.controller.confidence_threshold,
        step=0.02,
    )
    st.session_state.controller.set_confidence_threshold(conf_thresh)

    stability_sec = st.slider(
        "Stability Duration (sec)",
        min_value=0.15,
        max_value=1.20,
        value=st.session_state.controller.stability_duration_sec,
        step=0.05,
    )
    req_frames = st.slider(
        "Required Stable Frames",
        min_value=2,
        max_value=15,
        value=st.session_state.controller.required_stable_frames,
        step=1,
    )
    st.session_state.controller.set_stability_requirements(stability_sec, req_frames)

    st.divider()
    active_backend = st.session_state.classifier.active_backend
    if active_backend == "CUSTOM_XGBOOST":
        st.success("Custom XGBoost Active")
    else:
        st.info("MediaPipe Kinematics Fallback Active (supports POINTING_DOWN)")

    if st.button("Reset State Machine"):
        st.session_state.controller.reset()
        st.toast("State machine reset to READY.")

# Header Banner
st.markdown(
    f"""
    <div class="kiosk-header">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <span class="kiosk-badge">GestureGo</span>
                <span class="kiosk-badge" style="background-color: #E9E0FF;">Touchless Campus Guide</span>
                <h1 style="margin: 8px 0 2px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                    {EVENT_INFO['name']}
                </h1>
                <p style="margin: 0; color: #655E68; font-size: 0.9rem; font-weight: 600;">
                    {EVENT_INFO['venue']} • Current Page: <strong>{st.session_state.current_page}</strong>
                </p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.75rem; font-family: monospace; color: #655E68;">FSM STATE</div>
                <div style="font-size: 1.25rem; font-weight: 900; color: #17151B; background: #D8FF4F; padding: 2px 8px; border: 1px solid #17151B; border-radius: 4px;">
                    {st.session_state.controller.state.value}
                </div>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Manual Navigation Controls (8 Centralized Controls)
m1, m2, m3, m4, m5, m6, m7, m8 = st.columns(8)
with m1:
    if st.button("🏠 Home", use_container_width=True):
        execute_action("HOME", source="manual")
with m2:
    if st.button("➡️ Next Page", use_container_width=True):
        execute_action("NEXT_PAGE", source="manual")
with m3:
    if st.button("📅 Schedule", use_container_width=True):
        execute_action("OPEN_SCHEDULE", source="manual")
with m4:
    if st.button("✅ Confirm", use_container_width=True):
        execute_action("CONFIRM_OR_SELECT", source="manual")
with m5:
    if st.button("⬅️ Back", use_container_width=True):
        execute_action("BACK", source="manual")
with m6:
    if st.button("⬇️ Scroll Down", use_container_width=True):
        execute_action("SCROLL_DOWN", source="manual")
with m7:
    if st.button("❌ Cancel", use_container_width=True):
        execute_action("CANCEL", source="manual")
with m8:
    if st.button("❓ Help", use_container_width=True):
        execute_action("OPEN_HELP", source="manual")

if st.session_state.confirmed_modal:
    modal = st.session_state.confirmed_modal
    if isinstance(modal, dict):
        if modal.get("code"):
            st.success(
                f"🎫 **{modal['title']}**\n\n"
                f"**Event:** {modal['event']}\n\n"
                f"**Pass Code:** `{modal['code']}` | **Venue:** {modal['venue']} ({modal['time']}) | **Status:** {modal['status']}"
            )
        else:
            st.info(f"🔔 **{modal['title']}**")
    else:
        st.info(f"🔔 **Notification:** {modal}")

if st.session_state.scroll_notice:
    st.success(f"📜 **Scroll Action:** {st.session_state.scroll_notice}")

# Layout Columns
col_cam, col_content = st.columns([1, 1.4])

with col_cam:
    st.subheader("Gesture Sensor & Decision Telemetry")
    ctrl = st.session_state.controller

    st.markdown(
        f"""
        <div style="background: #FFFFFF; border: 2px solid #17151B; box-shadow: 2px 2px 0px #17151B; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 0.85rem;">
                <span>STATE: <strong>{ctrl.state.value}</strong></span>
                <span>STABILITY: <strong>{ctrl.candidate_frames}/{ctrl.required_stable_frames}</strong></span>
                <span>LAST ACTION: <strong>{ctrl.last_action or 'None'}</strong></span>
            </div>
            <div style="margin-top: 6px; font-size: 0.8rem; color: #655E68;">
                Reason: {ctrl.last_rejection_reason.value} ({ctrl.last_rejection_detail or 'Active'})
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Interactive Simulator with all 8 poses
    st.markdown("#### 🧪 Gesture Simulator")
    sim_col1, sim_col2 = st.columns([1.5, 1])
    with sim_col1:
        test_gesture = st.selectbox(
            "Simulated Pose",
            options=[
                "NO_HAND",
                "OPEN_PALM",
                "POINTING_UP",
                "POINTING_DOWN",
                "VICTORY",
                "THUMBS_UP",
                "CLOSED_FIST",
                "THUMBS_DOWN",
                "I_LOVE_YOU",
                "UNKNOWN",
            ],
            index=0,
        )
    with sim_col2:
        test_conf = st.slider("Confidence", min_value=0.0, max_value=1.0, value=0.92, step=0.02)

    f_col1, f_col2 = st.columns(2)
    with f_col1:
        if st.button("Send 1 Frame", use_container_width=True):
            act, _ = ctrl.process_frame(test_gesture, test_conf)
            if act:
                execute_action(act, source="simulated_gesture")
            st.rerun()
    with f_col2:
        if st.button(f"Hold Pose ({ctrl.required_stable_frames} frames)", use_container_width=True):
            triggered = None
            for _ in range(ctrl.required_stable_frames):
                act, _ = ctrl.process_frame(test_gesture, test_conf)
                if act:
                    triggered = act
            if triggered:
                execute_action(triggered, source="simulated_gesture")
            st.rerun()

    if st.button("Release Hand (3 neutral frames)", use_container_width=True):
        for _ in range(3):
            ctrl.process_frame("NO_HAND", 0.0)
        st.rerun()

    st.markdown("---")
    st.caption(f"Actions Executed: {ctrl.total_actions_triggered} | Repeats Blocked: {ctrl.repeated_action_preventions}")

with col_content:
    cur = st.session_state.current_page
    st.markdown(f"### {cur} Section")

    if cur == "Home":
        st.write("Welcome to Apex Tech Con 2026. Use POINTING_UP to advance page-by-page, or POINTING_DOWN to scroll.")
        for item in SCHEDULE_ITEMS[:3]:
            st.markdown(f"- **{item['time']}**: {item['title']} ({item['location']})")

    elif cur == "Schedule":
        sel_idx = st.session_state.selected_schedule_index
        cur_it = SCHEDULE_ITEMS[sel_idx]
        st.info(f"👉 **Selected Event ({sel_idx + 1}/{len(SCHEDULE_ITEMS)}):** {cur_it['title']} ({cur_it['time']})")

        all_regs = get_all_registrations()
        if all_regs:
            with st.expander(f"🎫 My Registered Passes ({len(all_regs)})", expanded=False):
                for r in all_regs:
                    st.markdown(f"- `{r['registration_code']}` ({r['registration_status']}): **{r['event_name_snapshot']}** — *{r['event_time']}, {r['venue']}*")

        for idx, item in enumerate(SCHEDULE_ITEMS):
            is_selected = idx == sel_idx
            prefix = "👉 [SELECTED] " if is_selected else ""
            reg_info = get_registration_by_event(item["id"])
            pass_badge = f" `[PASS: {reg_info['registration_code']}]`" if reg_info else ""
            st.markdown(f"**{prefix}{item['time']}** — {item['title']}{pass_badge} ({item['location']})")
            st.caption(item.get("description", ""))

    elif cur == "Venues":
        for v in CAMPUS_VENUES:
            st.markdown(f"**{v['name']}** — {v['building']} ({v['floor']})")
            st.caption(v['directions'])

    elif cur == "Stalls":
        for s in EVENT_STALLS:
            st.markdown(f"**{s['name']}** ({s['booth']}) — *{s['category']}*")
            st.caption(s['highlights'])

    elif cur == "Contacts":
        for c in ORGANIZER_CONTACTS:
            st.markdown(f"**{c['name']}** ({c['role']}) — Office: {c['office']}")
            st.caption(f"Email: {c['email']} | Phone: {c['phone']}")

    elif cur == "Help":
        for g, d in GESTURE_DEFINITIONS.items():
            st.markdown(f"- **{g}** ➔ `{d['action']}`: {d['description']}")

    elif cur == "Evaluation":
        st.write("Formal evaluation and trial testing dashboard.")
        st.json(ctrl._telemetry("TEST", 0.95, None, time.time())["counters"])
