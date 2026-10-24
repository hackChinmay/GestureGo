# GestureGo — Confidence-Aware Touchless AI Campus Assistant

[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-17%2F17%20Passing-success)](tests/)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11-blue)](requirements.txt)
[![HCI](https://img.shields.io/badge/Interface-Touchless%20Kiosk-teal)](app.py)

GestureGo is a production-grade touchless human-computer interaction (HCI) kiosk system. It enables students, event attendees, and campus visitors to navigate digital kiosks without physically touching the screen, using real-time hand gestures captured via standard webcams.

---

## 1. Key Engineering Features

- **Real-Time Hand Landmark Tracking:** Extracts 21 3D landmarks via MediaPipe.
- **Geometric Normalization:** Invariant to camera distance and user hand size via wrist translation and maximum Euclidean scale normalization (63-element feature vectors).
- **Hybrid Classifier Architecture:**
  - *Primary:* Custom multiclass XGBoost / Gradient Boosted decision trees with probability calibration.
  - *Fallback:* MediaPipe gesture recognition and anatomical kinematic heuristics.
  - *Honesty Guarantee:* The UI prominently shows which model is active; never fakes XGBoost execution when fallback is running.
- **Confidence-Aware Decision Layer:** Configurable acceptance threshold (default: $\tau = 0.80$). Predictions below threshold are explicitly rejected with explanatory telemetry.
- **Temporal Stability Gate:** Requires candidate poses to remain steady for a configurable duration (e.g. 0.40s / 8 consecutive frames) before activation.
- **One-Shot State Machine (`IDLE` ➔ `CANDIDATE` ➔ `CONFIRMED` ➔ `LOCKED` ➔ `REARMED`):**
  - **Guarantees exactly one action execution** per deliberate gesture.
  - Holding a pose for 10 seconds **never** triggers repeated actions.
  - Requires returning hand to neutral (`NO_HAND` or `UNKNOWN`) before re-arming.
- **Full Manual Fallback:** Screen buttons for all actions remain accessible at all times.
- **Privacy First:** Frames are processed locally in RAM; no camera video is ever uploaded or saved.

---

## 2. Gesture-to-Action Mapping

| Gesture Class | Assigned Kiosk Action | Behavior |
| :--- | :--- | :--- |
| `OPEN_PALM` | `HOME` | Returns to the central campus dashboard |
| `POINTING_UP` | `NEXT_PAGE` | Advances to the next campus page along configured PAGE_ORDER |
| `POINTING_DOWN` | `SCROLL_DOWN` | Smoothly scrolls active content container down by 65% |
| `VICTORY` | `OPEN_SCHEDULE` | Directly opens the Tech Con keynote and track schedule |
| `THUMBS_UP` | `CONFIRM_OR_SELECT` | Confirms current selection / registers for session |
| `CLOSED_FIST` | `BACK` | Returns to the previous view in navigation history stack |
| `THUMBS_DOWN` | `CANCEL` | Dismisses modal alerts or cancels operations |
| `I_LOVE_YOU` | `OPEN_HELP` | Displays the help and gesture guide |

Special States (Never Trigger Actions):
- `NO_HAND`: No hand detected in frame; releases locked state to neutral.
- `UNKNOWN`: Hand visible but does not match any supported classes.
- `UNCERTAIN`: Prediction score is below configured confidence threshold or temporal stability threshold.
- `LOCKED_HOLD`: Action already fired once; holding pose blocked from repeating.

---

## 3. Project File Structure

```
GestureGo/
├── app.py                     # Streamlit touchless campus kiosk application
├── collect_data.py            # Real-time landmark collector via OpenCV & MediaPipe
├── preprocess.py              # 21-landmark extraction and 63-feature normalization
├── train_model.py             # Custom XGBoost training pipeline with leakage prevention
├── evaluate_model.py          # Test-set evaluation, confusion matrix, latency benchmarking
├── gesture_classifier.py      # Hybrid classifier (XGBoost + MediaPipe fallback)
├── gesture_controller.py      # 5-state one-shot confidence-aware state machine
├── campus_data.py             # Structured campus schedules, venues, stalls & contacts
├── requirements.txt           # Python dependency definitions
├── README.md                  # Complete documentation and setup manual
├── .gitignore                 # Excludes cache, model weights, and logs
├── data/
│   ├── README.md              # Dataset formatting guide
│   └── gesture_landmarks.csv  # 280 normalized samples across all 7 gestures
├── models/
│   ├── README.md              # Model artifacts documentation
│   └── evaluation_metrics.json# JSON evaluation output
├── tests/
│   ├── test_controller.py     # State machine, temporal stability & anti-repeat tests
│   └── test_action_mapping.py # Action mapping and pipeline verification tests
└── docs/
    └── architecture.md        # Mathematical formulations and state diagrams
```

---

## 4. Local Setup & Execution Guide

### Step 1: Clone and Create Virtual Environment
```bash
git clone <repo_url>
cd GestureGo

# Python 3.10 or 3.11 is recommended
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run Automated Controller Tests
Run the 17 unit tests verifying state machine transitions, anti-repeat locks, and action mappings:
```bash
python3 -m unittest discover tests
```

### Step 4: Launch the Streamlit Kiosk
```bash
streamlit run app.py
```
Open `http://localhost:8501` in your browser.

---

## 5. Machine Learning Pipeline Guide

### A. Collecting Real Landmark Data
Capture real hand landmarks using your webcam:
```bash
# Capture 100 samples for OPEN_PALM
python3 collect_data.py --label OPEN_PALM --samples 100 --participant user_01

# Hotkeys in interactive collection mode:
# Keys 1-7: Select gesture class
# Space: Record single sample
# C: Toggle continuous capture (~12 FPS)
# Q: Quit and save to data/gesture_landmarks.csv
```

### B. Training the Custom Model
Train the multiclass classifier with session-aware splitting:
```bash
python3 train_model.py --data data/gesture_landmarks.csv --output models/gesture_xgboost.joblib
```

### C. Evaluating Model Performance
Evaluate test-set accuracy, macro F1-score, and latency:
```bash
python3 evaluate_model.py --model models/gesture_xgboost.joblib --test-data data/gesture_landmarks.csv
```

---

## 6. Testing & Demonstration Protocol

Follow this checklist during evaluation:

1. **Held Gesture Test:** Hold `OPEN_PALM` steadily for 5 seconds. Verify that `Actions Fired` increments by **exactly 1**, while `Repeats Blocked` continuously increments in `LOCKED` state.
2. **Neutral Release Test:** Pull your hand out of camera view. Verify controller transitions from `LOCKED` ➔ `REARMED` ➔ `IDLE`.
3. **Threshold Tuning Test:** Increase the confidence slider in the sidebar to 0.95. Observe that shaky or ambiguous hand poses are filtered with `BELOW_CONFIDENCE`.
4. **Manual Navigation Test:** Click the top manual buttons (`Home`, `Next`, `Schedule`, `Confirm`, `Back`, `Cancel`, `Help`) to confirm full operational fallback when camera is disabled.
5. **Lighting & Background Variations:** Test in dim light and cluttered backgrounds. MediaPipe and the custom classifier maintain landmark tracking via relative distance normalization.

---

## 7. Known Limitations & Responsible AI Notice

- **Static Gestures Only:** GestureGo detects static hand poses; dynamic trajectory gestures (e.g., continuous waving or swiping) are not implemented in this version.
- **Sign Language Disclaimer:** This interface uses designated kiosk control poses and is **not** an American Sign Language (ASL) or British Sign Language (BSL) translator.
- **Monocular Depth Approximation:** MediaPipe z-coordinates are synthetic relative estimates from 2D monocular cameras and possess higher noise variance than x/y plane coordinates.
