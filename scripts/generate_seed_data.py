"""
scripts/generate_seed_data.py - Generates valid canonical MediaPipe 3D normalized landmarks
for initial baseline calibration and testing of the 7 target gesture classes.
"""

import os
import math
import csv
import random
from preprocess import FEATURE_NAMES, GESTURE_CLASSES

def generate_hand_landmarks(gesture: str, jitter: float = 0.02):
    """
    Returns 21 (x, y, z) normalized tuples matching true anatomical MediaPipe positions
    for each canonical gesture, with small natural human variance (jitter).
    """
    # Base canonical hand skeleton in wrist-relative space (wrist at 0,0,0)
    # y negative is upwards towards fingers; x is horizontal; z is depth
    pts = [(0.0, 0.0, 0.0)] * 21

    # Base palm MCP joints
    pts[0] = (0.0, 0.0, 0.0)      # Wrist
    pts[1] = (-0.20, -0.15, 0.0)  # Thumb CMC
    pts[2] = (-0.35, -0.30, -0.05) # Thumb MCP
    pts[5] = (-0.20, -0.60, 0.0)  # Index MCP
    pts[9] = (-0.05, -0.65, 0.0)  # Middle MCP
    pts[13] = (0.10, -0.60, 0.0)  # Ring MCP
    pts[17] = (0.25, -0.50, 0.0)  # Pinky MCP

    # Helper to extend or curl a finger
    # Finger indices: (mcp, pip, dip, tip)
    def set_finger(mcp_idx, pip_idx, dip_idx, tip_idx, base_x, extended: bool, curl_dir: float = 1.0):
        mcp = pts[mcp_idx]
        if extended:
            pts[pip_idx] = (base_x, -0.75, 0.0)
            pts[dip_idx] = (base_x, -0.88, 0.0)
            pts[tip_idx] = (base_x, -1.00, 0.0)
        else:
            # Curled into palm
            pts[pip_idx] = (base_x, -0.55, 0.10 * curl_dir)
            pts[dip_idx] = (base_x, -0.40, 0.15 * curl_dir)
            pts[tip_idx] = (base_x * 0.8, -0.35, 0.12 * curl_dir)

    # Configure gesture poses
    if gesture == "OPEN_PALM":
        # All extended
        pts[3] = (-0.48, -0.45, -0.05)
        pts[4] = (-0.58, -0.60, -0.05) # Thumb extended
        set_finger(5, 6, 7, 8, -0.22, extended=True)
        set_finger(9, 10, 11, 12, -0.06, extended=True)
        set_finger(13, 14, 15, 16, 0.11, extended=True)
        set_finger(17, 18, 19, 20, 0.28, extended=True)

    elif gesture == "CLOSED_FIST":
        # All curled
        pts[3] = (-0.25, -0.32, 0.10)
        pts[4] = (-0.10, -0.35, 0.15) # Thumb curled over index
        set_finger(5, 6, 7, 8, -0.20, extended=False)
        set_finger(9, 10, 11, 12, -0.05, extended=False)
        set_finger(13, 14, 15, 16, 0.10, extended=False)
        set_finger(17, 18, 19, 20, 0.25, extended=False)

    elif gesture == "POINTING_UP":
        # Index extended up, others curled
        pts[3] = (-0.25, -0.32, 0.10)
        pts[4] = (-0.10, -0.35, 0.15) # Thumb tucked
        set_finger(5, 6, 7, 8, -0.20, extended=True)
        set_finger(9, 10, 11, 12, -0.05, extended=False)
        set_finger(13, 14, 15, 16, 0.10, extended=False)
        set_finger(17, 18, 19, 20, 0.25, extended=False)

    elif gesture == "VICTORY":
        # Index and middle extended in V, ring and pinky curled
        pts[3] = (-0.25, -0.32, 0.10)
        pts[4] = (-0.10, -0.35, 0.15)
        # V shape: index angled left, middle angled right
        pts[6] = (-0.28, -0.75, 0.0)
        pts[7] = (-0.35, -0.88, 0.0)
        pts[8] = (-0.42, -1.00, 0.0)

        pts[10] = (0.02, -0.75, 0.0)
        pts[11] = (0.08, -0.88, 0.0)
        pts[12] = (0.15, -1.00, 0.0)

        set_finger(13, 14, 15, 16, 0.10, extended=False)
        set_finger(17, 18, 19, 20, 0.25, extended=False)

    elif gesture == "THUMBS_UP":
        # Thumb pointing straight UP (-y), others curled
        pts[3] = (-0.25, -0.50, 0.0)
        pts[4] = (-0.25, -0.75, 0.0) # Upwards tip
        set_finger(5, 6, 7, 8, -0.20, extended=False)
        set_finger(9, 10, 11, 12, -0.05, extended=False)
        set_finger(13, 14, 15, 16, 0.10, extended=False)
        set_finger(17, 18, 19, 20, 0.25, extended=False)

    elif gesture == "THUMBS_DOWN":
        # Thumb pointing straight DOWN (+y), others curled
        pts[3] = (-0.25, 0.30, 0.0)
        pts[4] = (-0.25, 0.55, 0.0) # Downwards tip
        set_finger(5, 6, 7, 8, -0.20, extended=False)
        set_finger(9, 10, 11, 12, -0.05, extended=False)
        set_finger(13, 14, 15, 16, 0.10, extended=False)
        set_finger(17, 18, 19, 20, 0.25, extended=False)

    elif gesture == "I_LOVE_YOU":
        # Thumb, Index, Pinky extended; Middle and Ring curled
        pts[3] = (-0.45, -0.45, -0.05)
        pts[4] = (-0.58, -0.55, -0.05) # Thumb extended
        set_finger(5, 6, 7, 8, -0.20, extended=True)   # Index extended
        set_finger(9, 10, 11, 12, -0.05, extended=False) # Middle curled
        set_finger(13, 14, 15, 16, 0.10, extended=False) # Ring curled
        set_finger(17, 18, 19, 20, 0.30, extended=True)  # Pinky extended

    # Apply small natural jitter and flatten into 63 coordinates
    features = []
    for x, y, z in pts:
        features.append(x + random.gauss(0.0, jitter))
        features.append(y + random.gauss(0.0, jitter))
        features.append(z + random.gauss(0.0, jitter * 0.8))

    return features

def generate_seed_dataset(output_path: str = "data/gesture_landmarks.csv", samples_per_class: int = 40):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    participants = ["P01", "P02", "P03", "P04"]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(FEATURE_NAMES + ["label", "participant_id", "session_id", "timestamp"])

        for gesture in GESTURE_CLASSES:
            for i in range(samples_per_class):
                p_id = participants[i % len(participants)]
                s_id = f"sess_{p_id}_{gesture}"
                vec = generate_hand_landmarks(gesture, jitter=0.015)
                row = [f"{val:.5f}" for val in vec] + [gesture, p_id, s_id, "1729780000.0"]
                writer.writerow(row)

    print(f"[Dataset] Generated {samples_per_class * len(GESTURE_CLASSES)} seed samples in {output_path}")

if __name__ == "__main__":
    generate_seed_dataset()
