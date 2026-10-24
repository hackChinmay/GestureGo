# GestureGo — Architecture Specification

## 1. System Overview

GestureGo is a touchless human-computer interaction (HCI) system architected for public campus information terminals and event kiosks. The application captures user hand gestures via an RGB webcam, extracts 21 3D spatial landmarks, normalizes coordinates to eliminate camera-distance variance, evaluates gesture probabilities through a machine learning classifier, filters predictions through a temporal stability gate, and dispatches actions through a 5-state one-shot finite state machine (FSM).

```
   ┌───────────────┐
   │  Webcam RGB   │
   └───────┬───────┘
           │ 30 FPS Stream
           ▼
   ┌────────────────────────────────┐
   │ MediaPipe Hands Landmark Model │  21 3D Landmarks (x_i, y_i, z_i)
   └───────────────┬────────────────┘
                   │ Raw Coordinates
                   ▼
   ┌────────────────────────────────┐
   │ Geometric Normalization Engine │  Wrist translation + Scale Invariance
   └───────────────┬────────────────┘
                   │ 63-Element Feature Vector
                   ▼
   ┌────────────────────────────────┐
   │   Hybrid Classification Layer   │
   │  - Primary: Custom XGBoost     │  Class Probability Distribution P(g)
   │  - Fallback: MediaPipe/Kinemat.│
   └───────────────┬────────────────┘
                   │ Top Gesture Class 'g' & Score 'c'
                   ▼
   ┌────────────────────────────────┐
   │ Confidence & Stability Gate    │  Threshold c >= tau (e.g. 0.80)
   │ (Temporal Stability Buffer)    │  Consecutive frames >= N (e.g. 8)
   └───────────────┬────────────────┘
                   │ Filtered Deliberate Gesture
                   ▼
   ┌────────────────────────────────┐
   │   5-State One-Shot Controller  │
   │ IDLE -> CANDIDATE -> CONFIRMED │  Guarantees EXACTLY ONE action execution;
   │         -> LOCKED -> REARMED   │  blocks repeated clicks on held poses.
   └───────────────┬────────────────┘
                   │ Mapped Action (GO_HOME, NEXT_ITEM, etc.)
                   ▼
   ┌────────────────────────────────┐
   │    Campus Kiosk UI / Router    │
   └────────────────────────────────┘
```

---

## 2. Mathematical Landmark Preprocessing

MediaPipe outputs 21 landmarks $P_i = (x_i, y_i, z_i)$ for $i \in \{0, \dots, 20\}$, where $P_0$ corresponds to the wrist anatomical landmark.

### Step 1: Origin Translation
To make predictions invariant to where the user's hand appears in the webcam viewport:
$$P'_i = P_i - P_0 = (x_i - x_0, y_i - y_0, z_i - z_0)$$
Note that $P'_0 = (0, 0, 0)$.

### Step 2: Euclidean Scale Normalization
To make feature representations invariant to hand size and distance from the lens:
$$\text{scale} = \max_{i=0}^{20} \|P'_i\|_2 = \max_{i=0}^{20} \sqrt{(x'_i)^2 + (y'_i)^2 + (z'_i)^2}$$
$$P''_i = \frac{P'_i}{\max(\text{scale}, 10^{-6})}$$

### Step 3: Feature Vector Serialization
The final normalized vector $\mathbf{v} \in \mathbb{R}^{63}$:
$$\mathbf{v} = [x''_0, y''_0, z''_0, x''_1, y''_1, z''_1, \dots, x''_{20}, y''_{20}, z''_{20}]$$

---

## 3. The 5-State One-Shot Finite State Machine

To prevent accidental interactions and prevent repeated firing while a gesture is held, the controller enforces strict state transitions:

```
  ┌──────────────┐
  │     IDLE     │◄─────────────────────────────────────┐
  └──────┬───────┘                                      │
         │ c >= tau (Gesture detected)                  │
         ▼                                              │
  ┌──────────────┐  Gesture flickered or c < tau        │
  │  CANDIDATE   ├──────────────────────────────────────┤
  └──────┬───────┘                                      │
         │ Frame count >= N AND Elapsed >= T            │
         ▼                                              │
  ┌──────────────┐                                      │
  │  CONFIRMED   │ ── Execute Action ONCE               │
  └──────┬───────┘                                      │
         │ Immediate transition                         │
         ▼                                              │
  ┌──────────────┐                                      │
  │    LOCKED    │ ── If gesture held: REJECT (LOCKED)  │
  └──────┬───────┘                                      │
         │ Hand released to neutral (NO_HAND / UNKNOWN) │
         ▼                                              │
  ┌──────────────┐                                      │
  │   REARMED    ├──────────────────────────────────────┘
  └──────────────┘
```

1. **IDLE:** No deliberate candidate gesture is being tracked.
2. **CANDIDATE:** A high-confidence gesture is detected; the controller accumulates consecutive frames and elapsed time.
3. **CONFIRMED:** The gesture satisfied all stability conditions. The mapped kiosk action executes **exactly once**.
4. **LOCKED:** The controller locks execution. As long as the user continues to hold this gesture, all frames are rejected with `LOCKED_HOLD`.
5. **REARMED:** Once the user returns their hand to a neutral position (`NO_HAND` or `UNKNOWN`), the controller enters `REARMED` and resets to `IDLE`, ready for the next intentional gesture.

---

## 4. Gesture Mapping Specification

| Gesture Class | Target Kiosk Action | Semantic Role |
| :--- | :--- | :--- |
| `OPEN_PALM` | `GO_HOME` | Return to main dashboard |
| `POINTING_UP` | `NEXT_ITEM` | Cycle to next schedule/menu item |
| `VICTORY` | `OPEN_SCHEDULE` | Open schedule and keynotes |
| `THUMBS_UP` | `CONFIRM` | Confirm selected option / register |
| `CLOSED_FIST` | `GO_BACK` | Return to previous view |
| `THUMBS_DOWN` | `CANCEL` | Dismiss modal or cancel action |
| `I_LOVE_YOU` | `OPEN_HELP` | Open help & gesture instruction modal |

---

## 5. Privacy, Ethics & Security

1. **Zero Cloud Frame Upload:** Camera frames are evaluated strictly in local memory and are never transmitted over the network or persisted to disk.
2. **Anonymous Landmark Data:** Training data stores only geometric coordinates, stripped of biometric facial or identifying visual data.
3. **Manual Fallback Guaranteed:** Full keyboard and mouse/touch controls remain continuously available on every screen.
4. **HCI Classification vs. Sign Language:** GestureGo is a designated static kiosk control vocabulary and is explicitly not a sign language translation tool.
