"""
collect_data.py - Real-Time Landmark Dataset Collection for GestureGo.

Captures real-time MediaPipe hand landmarks from your webcam, normalizes
them via preprocess.py, and appends labelled samples to data/gesture_landmarks.csv.

Usage:
    python3 collect_data.py --label OPEN_PALM --samples 150 --participant P01
    python3 collect_data.py --interactive

Hotkeys in interactive mode:
    1: OPEN_PALM
    2: POINTING_UP
    3: VICTORY
    4: THUMBS_UP
    5: CLOSED_FIST
    6: THUMBS_DOWN
    7: I_LOVE_YOU
    Space: Capture single sample
    c: Toggle continuous capture mode
    q: Quit and save dataset
"""

import os
import sys
import time
import argparse
import csv
from typing import Optional, List
from preprocess import normalize_landmarks, FEATURE_NAMES, GESTURE_CLASSES

KEY_TO_GESTURE = {
    ord("1"): "OPEN_PALM",
    ord("2"): "POINTING_UP",
    ord("3"): "VICTORY",
    ord("4"): "THUMBS_UP",
    ord("5"): "CLOSED_FIST",
    ord("6"): "THUMBS_DOWN",
    ord("7"): "I_LOVE_YOU",
}

DATASET_PATH = "data/gesture_landmarks.csv"

def initialize_dataset_file(filepath: str = DATASET_PATH) -> None:
    """Ensure the target CSV exists with proper header columns."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    if not os.path.exists(filepath):
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            header = FEATURE_NAMES + ["label", "participant_id", "session_id", "timestamp"]
            writer.writerow(header)
        print(f"[Dataset] Created initial dataset file at {filepath}")

def append_sample(
    norm_features: List[float],
    label: str,
    participant: str = "anon",
    session_id: str = "s1",
    filepath: str = DATASET_PATH,
) -> None:
    """Appends a normalized 63-element feature vector to the dataset."""
    if len(norm_features) != 63:
        raise ValueError(f"Feature vector must contain 63 values, got {len(norm_features)}")
    if label not in GESTURE_CLASSES:
        raise ValueError(f"Unknown gesture label: {label}. Allowed: {GESTURE_CLASSES}")

    initialize_dataset_file(filepath)
    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        row = [f"{val:.6f}" for val in norm_features] + [
            label,
            participant,
            session_id,
            f"{time.time():.3f}",
        ]
        writer.writerow(row)

def run_collection_opencv(label: Optional[str] = None, max_samples: int = 100, participant: str = "user"):
    """Live OpenCV webcam collector using MediaPipe Hands."""
    try:
        import cv2
        import mediapipe as mp
    except ImportError as e:
        print(f"[Error] Required packages not found: {e}")
        print("Please install requirements: pip install opencv-python mediapipe")
        return

    mp_hands = mp.solutions.hands
    mp_draw = mp.solutions.drawing_utils
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7,
    )

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Error] Could not open camera (index 0). Ensure webcam is connected and permitted.")
        return

    current_label = label or "OPEN_PALM"
    captured_count = 0
    continuous_mode = False
    session_id = f"sess_{int(time.time())}"

    print("=" * 60)
    print(" GestureGo Landmark Collector")
    print(" Privacy notice: Only landmark coordinates are stored.")
    print(" Raw video is processed in memory and never saved to disk.")
    print("=" * 60)
    print(f"Target Label: {current_label}")
    print("Keys: [1-7] Select Label | [Space] Capture 1 | [C] Continuous | [Q] Quit")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)  # Mirror view
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        hand_detected = False
        norm_features = None

        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            hand_detected = True

            raw = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand_landmarks.landmark]
            try:
                norm_features = normalize_landmarks(raw)
            except Exception as e:
                norm_features = None

        # Draw HUD
        cv2.rectangle(frame, (10, 10), (450, 110), (20, 20, 20), -1)
        status_color = (0, 255, 120) if hand_detected else (0, 0, 255)
        cv2.putText(frame, f"Label: {current_label}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Hand: {'TRACKED' if hand_detected else 'NO HAND'} | Samples: {captured_count}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        cv2.putText(frame, f"Mode: {'CONTINUOUS' if continuous_mode else 'MANUAL'}", (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow("GestureGo Landmark Collector", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break
        elif key in KEY_TO_GESTURE:
            current_label = KEY_TO_GESTURE[key]
            print(f"[Collector] Switched label to: {current_label}")
        elif key == ord("c"):
            continuous_mode = not continuous_mode
            print(f"[Collector] Continuous capture: {continuous_mode}")
        elif key == ord(" ") or (continuous_mode and hand_detected):
            if hand_detected and norm_features:
                append_sample(norm_features, current_label, participant, session_id)
                captured_count += 1
                if continuous_mode:
                    time.sleep(0.08)  # Throttle continuous capture to ~12 fps
                if max_samples and captured_count >= max_samples:
                    print(f"[Collector] Reached target {max_samples} samples.")
                    break

    cap.release()
    cv2.destroyAllWindows()
    print(f"[Collector] Completed session. Saved {captured_count} samples to {DATASET_PATH}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GestureGo Landmark Dataset Collector")
    parser.add_argument("--label", type=str, choices=GESTURE_CLASSES, default=None)
    parser.add_argument("--samples", type=int, default=100)
    parser.add_argument("--participant", type=str, default="user_01")
    args = parser.parse_args()

    run_collection_opencv(label=args.label, max_samples=args.samples, participant=args.participant)
