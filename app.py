"""
app.py - GestureGo Touchless AI Campus Assistant (Streamlit Kiosk & Dashboard).

A touchless campus information kiosk driven by confidence-aware
computer vision, temporal stability, and one-shot execution.

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
from campus_data import (
    EVENT_INFO,
    GESTURE_DEFINITIONS,
    SCHEDULE_ITEMS,
    CAMPUS_VENUES,
    EVENT_STALLS,
    ORGANIZER_CONTACTS,
)

# Page configuration
st.set_page_config(
    page_title="GestureGo — Touchless AI Campus Assistant",
    page_icon="🖐️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom styling for high-contrast kiosk navy/teal/white aesthetic
st.markdown(
    """
    <style>
    .kiosk-header {
        background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0D9488 100%);
        padding: 24px 32px;
        border-radius: 12px;
        color: white;
        margin-bottom: 24px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .kiosk-badge {
        display: inline-block;
        padding: 4px 12px;
        background-color: rgba(20, 184, 166, 0.2);
        border: 1px solid #14B8A6;
        border-radius: 9999px;
        color: #2DD4BF;
        font-size: 0.85rem;
        font-weight: 600;
        margin-right: 8px;
    }
    .telemetry-card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 16px;
        color: #F8FAFC;
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #38BDF8;
    }
    .state-badge-idle { background-color: #64748B; color: white; padding: 4px 10px; border-radius: 6px; }
    .state-badge-candidate { background-color: #F59E0B; color: white; padding: 4px 10px; border-radius: 6px; }
    .state-badge-confirmed { background-color: #10B981; color: white; padding: 4px 10px; border-radius: 6px; }
    .state-badge-locked { background-color: #EF4444; color: white; padding: 4px 10px; border-radius: 6px; }
    .state-badge-rearmed { background-color: #06B6D4; color: white; padding: 4px 10px; border-radius: 6px; }
    </style>
    """,
    unsafe_allow_html=True,
)

# Session State Initialization
if "controller" not in st.session_state:
    st.session_state.controller = GestureController(
        confidence_threshold=0.80,
        stability_duration_sec=0.40,
        required_stable_frames=6,
        cooldown_sec=0.35,
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

# Action Dispatcher
def execute_action(action: str, source: str = "gesture"):
    """Executes a kiosk navigation or interaction command."""
    prev = st.session_state.current_page

    if action == "GO_HOME":
        st.session_state.history_stack.append("Home")
        st.session_state.current_page = "Home"
        st.session_state.confirmed_modal = None

    elif action == "NEXT_ITEM":
        if st.session_state.current_page == "Schedule":
            st.session_state.selected_schedule_index = (
                st.session_state.selected_schedule_index + 1
            ) % len(SCHEDULE_ITEMS)
        else:
            pages = ["Home", "Schedule", "Venues", "Stalls", "Contacts", "Help"]
            idx = pages.index(st.session_state.current_page) if st.session_state.current_page in pages else 0
            st.session_state.current_page = pages[(idx + 1) % len(pages)]
            st.session_state.history_stack.append(st.session_state.current_page)

    elif action == "OPEN_SCHEDULE":
        st.session_state.history_stack.append("Schedule")
        st.session_state.current_page = "Schedule"

    elif action == "CONFIRM":
        if st.session_state.current_page == "Schedule":
            item = SCHEDULE_ITEMS[st.session_state.selected_schedule_index]
            st.session_state.confirmed_modal = f"Registered for: {item['title']} ({item['location']})"
        else:
            st.session_state.confirmed_modal = f"Action confirmed on {st.session_state.current_page}"

    elif action == "GO_BACK":
        if len(st.session_state.history_stack) > 1:
            st.session_state.history_stack.pop()
            st.session_state.current_page = st.session_state.history_stack[-1]
        else:
            st.session_state.current_page = "Home"
        st.session_state.confirmed_modal = None

    elif action == "CANCEL":
        st.session_state.confirmed_modal = None

    elif action == "OPEN_HELP":
        st.session_state.history_stack.append("Help")
        st.session_state.current_page = "Help"

# Sidebar: Controls & Live Settings
with st.sidebar:
    st.markdown("### 🖐️ GestureGo Navigation")
    st.caption("Active Mode: Touchless Kiosk")

    # Destination Picker
    nav_selection = st.radio(
        "Direct Navigation (Fallback)",
        options=["Home", "Schedule", "Venues", "Stalls", "Contacts", "Help", "Evaluation"],
        index=["Home", "Schedule", "Venues", "Stalls", "Contacts", "Help", "Evaluation"].index(
            st.session_state.current_page if st.session_state.current_page in ["Home", "Schedule", "Venues", "Stalls", "Contacts", "Help", "Evaluation"] else "Home"
        ),
    )
    if nav_selection != st.session_state.current_page:
        st.session_state.current_page = nav_selection

    st.divider()
    st.markdown("### ⚙️ Decision Layer Settings")
    conf_thresh = st.slider(
        "Confidence Threshold",
        min_value=0.50,
        max_value=0.98,
        value=st.session_state.controller.confidence_threshold,
        step=0.02,
        help="Rejects any gesture prediction scored below this value.",
    )
    st.session_state.controller.set_confidence_threshold(conf_thresh)

    stability_sec = st.slider(
        "Stability Duration (sec)",
        min_value=0.15,
        max_value=1.20,
        value=st.session_state.controller.stability_duration_sec,
        step=0.05,
        help="Time a candidate gesture must be steadily held before triggering.",
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
    st.markdown("### 🧠 Active Classifier")
    active_backend = st.session_state.classifier.active_backend
    if active_backend == "CUSTOM_XGBOOST":
        st.success("🟢 Custom XGBoost Model Active")
    else:
        st.info("🔵 MediaPipe Kinematics Fallback Active")
        st.caption("Custom model absent or not loaded. Run train_model.py to enable XGBoost.")

    if st.button("Reset State Machine"):
        st.session_state.controller.reset()
        st.toast("State machine reset to IDLE.")

# Header Banner
st.markdown(
    f"""
    <div class="kiosk-header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span class="kiosk-badge">AI Campus Assistant</span>
                <span class="kiosk-badge" style="border-color: #38BDF8; color: #38BDF8;">Confidence-Aware</span>
                <h1 style="margin: 8px 0 4px 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em;">GestureGo</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 1rem;">{EVENT_INFO['name']} — {EVENT_INFO['venue']}</p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.85rem; opacity: 0.8;">CURRENT STATUS</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: #34D399;">TOUCHLESS READY</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">State: {st.session_state.controller.state.value}</div>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Manual Navigation Controls (Always Available Fallback)
m_col1, m_col2, m_col3, m_col4, m_col5, m_col6, m_col7 = st.columns(7)
with m_col1:
    if st.button("🏠 Home (Open Palm)", use_container_width=True):
        execute_action("GO_HOME", source="manual")
with m_col2:
    if st.button("➡️ Next (Point Up)", use_container_width=True):
        execute_action("NEXT_ITEM", source="manual")
with m_col3:
    if st.button("📅 Schedule (Victory)", use_container_width=True):
        execute_action("OPEN_SCHEDULE", source="manual")
with m_col4:
    if st.button("✅ Confirm (Thumbs Up)", use_container_width=True):
        execute_action("CONFIRM", source="manual")
with m_col5:
    if st.button("⬅️ Back (Closed Fist)", use_container_width=True):
        execute_action("GO_BACK", source="manual")
with m_col6:
    if st.button("❌ Cancel (Thumbs Down)", use_container_width=True):
        execute_action("CANCEL", source="manual")
with m_col7:
    if st.button("❓ Help (I Love You)", use_container_width=True):
        execute_action("OPEN_HELP", source="manual")

if st.session_state.confirmed_modal:
    st.info(f"🔔 **Notification:** {st.session_state.confirmed_modal}")

# Main Layout: 2 Columns (Live Camera & Telemetry | Content Screen)
col_cam, col_content = st.columns([1, 1.4])

with col_cam:
    st.subheader("Live Gesture Sensor & Decision Telemetry")

    # Camera control toggle
    cam_active = st.toggle("Enable Camera Sensor Feed", value=st.session_state.camera_active)
    st.session_state.camera_active = cam_active

    if cam_active:
        st.caption("Live sensor input enabled. Processing landmarks via local computer-vision.")
    else:
        st.warning("📷 Camera Sensor Paused. Toggle above to activate real-time recognition.")

    # Telemetry metrics row
    ctrl = st.session_state.controller
    state_color = {
        "IDLE": "#64748B",
        "CANDIDATE": "#F59E0B",
        "CONFIRMED": "#10B981",
        "LOCKED": "#EF4444",
        "REARMED": "#06B6D4",
    }.get(ctrl.state.value, "#64748B")

    st.markdown(
        f"""
        <div style="background: #0F172A; padding: 14px; border-radius: 8px; border: 1px solid #1E293B; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 0.8rem; color: #94A3B8;">CONTROLLER STATE</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: {state_color};">{ctrl.state.value}</div>
                </div>
                <div>
                    <span style="font-size: 0.8rem; color: #94A3B8;">CANDIDATE STABILITY</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #38BDF8;">{ctrl.candidate_frames} / {ctrl.required_stable_frames} frames</div>
                </div>
                <div>
                    <span style="font-size: 0.8rem; color: #94A3B8;">LAST ACTION</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #34D399;">{ctrl.last_action or 'None'}</div>
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #CBD5E1;">
                <strong>Rejection Reason:</strong> {ctrl.last_rejection_reason.value}
                <br/><span style="color: #94A3B8;">{ctrl.last_rejection_detail or 'Awaiting gesture candidate'}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Interactive Gesture Simulator / Test Input for Kiosk Preview
    st.markdown("#### 🧪 Interactive Gesture Test Input")
    st.caption("Select a simulated gesture and confidence to test state machine transitions:")
    sim_col1, sim_col2 = st.columns([1.5, 1])
    with sim_col1:
        test_gesture = st.selectbox(
            "Simulated Pose",
            options=["NO_HAND", "OPEN_PALM", "POINTING_UP", "VICTORY", "THUMBS_UP", "CLOSED_FIST", "THUMBS_DOWN", "I_LOVE_YOU", "UNKNOWN"],
            index=0,
        )
    with sim_col2:
        test_conf = st.slider("Confidence", min_value=0.0, max_value=1.0, value=0.92, step=0.02)

    f_col1, f_col2 = st.columns(2)
    with f_col1:
        if st.button("Send 1 Frame", use_container_width=True):
            act, tel = ctrl.process_frame(test_gesture, test_conf)
            if act:
                execute_action(act, source="simulated_gesture")
                st.success(f"Action Fired: {act}")
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
                st.success(f"Action Executed Once: {triggered} (Now LOCKED)")
            st.rerun()

    st.markdown("---")
    st.markdown("#### 🛡️ Anti-Repetition Counters")
    st.caption("Proves that holding a gesture does not cause repeated clicks:")
    c_m1, c_m2, c_m3 = st.columns(3)
    c_m1.metric("Actions Fired", ctrl.total_actions_triggered)
    c_m2.metric("Repeats Blocked", ctrl.repeated_action_preventions)
    c_m3.metric("Low-Conf Dropped", ctrl.low_confidence_rejections)

with col_content:
    # Page Content Switching
    cur = st.session_state.current_page

    if cur == "Home":
        st.subheader("🏛️ Campus Information Kiosk")
        st.markdown(
            f"""
            Welcome to **Apex Tech Con 2026**! GestureGo is a touchless AI assistant designed for public terminals,
            allowing attendees to navigate without touching the screen.
            """
        )
        st.info("💡 **Tip:** Hold **OPEN_PALM** to return here, or make a **VICTORY (✌️)** sign to view the full schedule.")

        h_col1, h_col2 = st.columns(2)
        with h_col1:
            st.markdown(
                """
                ### 🚀 Quick Destinations
                - 📅 **Event Schedule:** Keynotes, tracks & hackathons
                - 📍 **Venue Map:** Auditoriums, labs & accessible paths
                - 🎪 **Event Stalls:** Sponsor booths, research exhibits
                - 📞 **Contacts:** Organizers & campus emergency desk
                """
            )
            if st.button("View Schedule Now", key="h_btn1"):
                execute_action("OPEN_SCHEDULE")
                st.rerun()
        with h_col2:
            st.markdown(
                """
                ### 🖐️ Gesture Reference
                - **POINTING_UP:** Next item
                - **THUMBS_UP:** Confirm selection
                - **CLOSED_FIST:** Back to previous
                - **THUMBS_DOWN:** Cancel operation
                - **I_LOVE_YOU:** Open help guide
                """
            )

    elif cur == "Schedule":
        st.subheader("📅 Event & Keynote Schedule")
        st.caption("Use POINTING_UP to cycle through items, THUMBS_UP to register/confirm.")

        for idx, item in enumerate(SCHEDULE_ITEMS):
            is_selected = (idx == st.session_state.selected_schedule_index)
            border_style = "border: 2px solid #0D9488; background: #134E4A22;" if is_selected else "border: 1px solid #334155;"

            st.markdown(
                f"""
                <div style="{border_style} padding: 14px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 700; font-size: 1.1rem; color: #F8FAFC;">{item['title']}</span>
                        <span style="color: #2DD4BF; font-weight: 600;">{item['time']}</span>
                    </div>
                    <div style="margin-top: 4px; font-size: 0.9rem; color: #94A3B8;">
                        🎤 <strong>Speaker:</strong> {item['speaker']} | 📍 <strong>Location:</strong> {item['location']} | 🏷️ <em>{item['track']}</em>
                    </div>
                    <div style="margin-top: 6px;">
                        {'<span style="background: #0D9488; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">CURRENTLY SELECTED</span>' if is_selected else ''}
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    elif cur == "Venues":
        st.subheader("📍 Campus Venues & Accessibility")
        for v in CAMPUS_VENUES:
            with st.expander(f"{v['name']} — {v['building']}", expanded=True):
                st.markdown(f"**Floor / Area:** {v['floor']} | **Capacity:** {v['capacity']}")
                st.markdown(f"**Features:** {', '.join(v['features'])}")
                st.markdown(f"**Directions:** {v['directions']}")

    elif cur == "Stalls":
        st.subheader("🎪 Innovation Stalls & Exhibits")
        for s in EVENT_STALLS:
            st.markdown(
                f"""
                <div style="background: #1E293B; border: 1px solid #334155; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 700; color: #38BDF8;">{s['name']}</span>
                        <span style="background: #334155; color: #E2E8F0; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">{s['booth']}</span>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 0.9rem; color: #CBD5E1;">{s['highlights']}</p>
                    <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Track: {s['category']}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    elif cur == "Contacts":
        st.subheader("📞 Organizers & Emergency Assistance")
        for c in ORGANIZER_CONTACTS:
            st.markdown(
                f"""
                <div style="background: #1E293B; border: 1px solid #334155; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <span style="color: #F59E0B; font-weight: 600; font-size: 0.85rem;">{c['role']}</span>
                    <div style="font-size: 1.1rem; font-weight: 700; color: white;">{c['name']}</div>
                    <div style="font-size: 0.9rem; color: #94A3B8;">{c['dept']} • Office: {c['office']}</div>
                    <div style="font-size: 0.9rem; color: #38BDF8; margin-top: 4px;">✉️ {c['email']} | 📱 {c['phone']}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    elif cur == "Help":
        st.subheader("❓ Gesture Reference & Kiosk Instructions")
        st.markdown("All 7 canonical gestures are mapped to kiosk functions:")
        for name, d in GESTURE_DEFINITIONS.items():
            st.markdown(
                f"""
                <div style="display: flex; align-items: center; justify-content: space-between; background: #0F172A; border: 1px solid #1E293B; padding: 10px 14px; border-radius: 6px; margin-bottom: 6px;">
                    <div>
                        <strong style="color: #2DD4BF;">{name}</strong>
                        <div style="font-size: 0.85rem; color: #94A3B8;">{d['description']}</div>
                    </div>
                    <span style="background: #1E293B; color: #38BDF8; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">{d['action']}</span>
                </div>
                """,
                unsafe_allow_html=True,
            )

    elif cur == "Evaluation":
        st.subheader("📊 Testing & Faculty Evaluation Dashboard")
        st.caption("Real performance metrics and state machine diagnostic telemetry.")

        metrics_file = "models/evaluation_metrics.json"
        if os.path.exists(metrics_file):
            with open(metrics_file, "r") as f:
                metrics_data = json.load(f)

            ev1, ev2, ev3 = st.columns(3)
            ev1.metric("Model Architecture", metrics_data.get("model_type", "Unknown"))
            ev2.metric("Test Accuracy", f"{metrics_data.get('accuracy', 0.0) * 100:.2f}%")
            ev3.metric("Macro F1-Score", f"{metrics_data.get('macro_f1', 0.0) * 100:.2f}%")

            st.markdown("#### Confusion Matrix")
            st.write(metrics_data.get("confusion_matrix"))
        else:
            st.info("ℹ️ Status: **Not evaluated yet**. Run `python3 train_model.py` and `python3 evaluate_model.py` to populate formal evaluation metrics.")

        st.markdown("#### Live State Machine Telemetry")
        st.json(ctrl._telemetry("TEST", 0.95, None, time.time())["counters"])

# Footer
st.markdown("---")
st.markdown(
    """
    <div style="text-align: center; color: #64748B; font-size: 0.85rem;">
        GestureGo HCI System • Privacy First: Processed locally in memory • Not for Sign Language translation
    </div>
    """,
    unsafe_allow_html=True,
)
