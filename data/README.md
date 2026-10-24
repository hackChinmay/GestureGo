# GestureGo Dataset Directory

This directory stores real hand landmark coordinate datasets collected via MediaPipe Hands.

## Format: `gesture_landmarks.csv`

Each row represents one normalized hand observation:
- 63 feature columns: `lm_0_x`, `lm_0_y`, `lm_0_z`, ... `lm_20_x`, `lm_20_y`, `lm_20_z`
- `label`: One of `OPEN_PALM`, `POINTING_UP`, `VICTORY`, `THUMBS_UP`, `CLOSED_FIST`, `THUMBS_DOWN`, `I_LOVE_YOU`
- `participant_id`: Identifier for the recording participant (prevents data leakage during splits)
- `session_id`: Unique identifier for the recording session
- `timestamp`: Unix epoch recording time

## Normalization:
- Origin translated to Wrist (Landmark 0)
- Scaled by maximum landmark Euclidean distance
- Invariant to hand camera distance and frame translation

## How to Collect More Data:
```bash
python3 collect_data.py --label OPEN_PALM --samples 150 --participant P01
```
Or use the live data collection tool in the web kiosk dashboard to record and export CSVs directly!
