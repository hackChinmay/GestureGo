"""
preprocess.py - Landmark Extraction and Geometric Normalization Pipeline.

Normalizes raw MediaPipe 21-landmark (x, y, z) coordinates into an invariant
numerical feature vector of length 63.

Methodology:
1. Origin Translation:
   Subtract Wrist (Landmark 0) from all 21 points:
       x'_i = x_i - x_0,  y'_i = y_i - y_0,  z'_i = z_i - z_0
2. Scale Normalization:
   Compute maximum Euclidean distance from wrist across all landmarks:
       scale = max_{i} ||p'_i||_2
   Divide all coordinates by scale:
       p''_i = p'_i / max(scale, 1e-6)

Feature Dimensionality:
   21 landmarks * 3 coordinates = 63 normalized float features.

Limitations & Edge Cases:
- MediaPipe's 'z' coordinate is estimated relative to the wrist depth using an
  assumed synthetic camera focal length; monocular depth is inherently noisier
  than 2D (x, y).
- Scale normalization is invariant to hand distance from camera, but extreme
  perspective distortion or camera tilt can alter relative foreshortening.
- Hand roll/pitch rotations are preserved unless an additional 3D canonical
  coordinate frame alignment (Procrustes analysis) is applied.
"""

from typing import List, Dict, Any, Optional, Tuple
import math

FEATURE_NAMES = [
    f"lm_{i}_{axis}" for i in range(21) for axis in ("x", "y", "z")
]

GESTURE_CLASSES = [
    "OPEN_PALM",
    "POINTING_UP",
    "VICTORY",
    "THUMBS_UP",
    "CLOSED_FIST",
    "THUMBS_DOWN",
    "I_LOVE_YOU",
]

def extract_raw_landmarks_from_mediapipe(hand_landmarks) -> Optional[List[Dict[str, float]]]:
    """
    Extract raw 21 landmark dictionary from MediaPipe LandmarkList.
    Returns None if hand_landmarks is invalid or empty.
    """
    if hand_landmarks is None:
        return None

    # Handle both MediaPipe Tasks Vision object and legacy Solutions LandmarkList
    landmarks = getattr(hand_landmarks, "landmark", hand_landmarks)
    if len(landmarks) < 21:
        return None

    coords = []
    for lm in landmarks:
        coords.append({
            "x": float(getattr(lm, "x", 0.0)),
            "y": float(getattr(lm, "y", 0.0)),
            "z": float(getattr(lm, "z", 0.0)),
        })
    return coords

def normalize_landmarks(raw_landmarks: List[Dict[str, float]]) -> List[float]:
    """
    Transforms a list of 21 landmark dicts into a normalized 63-element feature vector.

    Args:
        raw_landmarks: List of 21 dicts with keys 'x', 'y', 'z'

    Returns:
        63-element float list of normalized coordinates.

    Raises:
        ValueError: If input does not contain exactly 21 valid landmark dicts.
    """
    if len(raw_landmarks) != 21:
        raise ValueError(f"Expected 21 landmarks, received {len(raw_landmarks)}")

    # Step 1: Origin translation relative to Wrist (Landmark 0)
    wrist = raw_landmarks[0]
    translated = []
    max_dist = 0.0

    for pt in raw_landmarks:
        dx = pt["x"] - wrist["x"]
        dy = pt["y"] - wrist["y"]
        dz = pt["z"] - wrist["z"]
        dist = math.sqrt(dx * dx + dy * dy + dz * dz)
        if dist > max_dist:
            max_dist = dist
        translated.append((dx, dy, dz))

    # Guard against zero or near-zero scale (collapsed landmarks)
    scale = max_dist if max_dist > 1e-6 else 1.0

    # Step 2: Scale normalization
    feature_vector: List[float] = []
    for dx, dy, dz in translated:
        feature_vector.append(dx / scale)
        feature_vector.append(dy / scale)
        feature_vector.append(dz / scale)

    return feature_vector

def compute_finger_extensions(norm_vec: List[float]) -> Dict[str, bool]:
    """
    Rule-based geometric heuristics to determine which fingers are extended.
    Used for validation, built-in fallback classification, and data sanity checks.

    Points indexed:
    Thumb: 1,2,3,4
    Index: 5,6,7,8
    Middle: 9,10,11,12
    Ring: 13,14,15,16
    Pinky: 17,18,19,20
    """
    def pt(idx: int) -> Tuple[float, float, float]:
        start = idx * 3
        return (norm_vec[start], norm_vec[start + 1], norm_vec[start + 2])

    def dist(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
        return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] - b[2])**2)

    wrist = (0.0, 0.0, 0.0)

    # A finger is considered extended if the tip is substantially farther from the wrist
    # than its corresponding PIP joint (proximal interphalangeal joint)
    thumb_extended = dist(pt(4), pt(17)) > dist(pt(2), pt(17)) and dist(pt(4), wrist) > 0.45
    index_extended = dist(pt(8), wrist) > dist(pt(6), wrist) * 1.15
    middle_extended = dist(pt(12), wrist) > dist(pt(10), wrist) * 1.15
    ring_extended = dist(pt(16), wrist) > dist(pt(14), wrist) * 1.15
    pinky_extended = dist(pt(20), wrist) > dist(pt(18), wrist) * 1.15

    return {
        "thumb": thumb_extended,
        "index": index_extended,
        "middle": middle_extended,
        "ring": ring_extended,
        "pinky": pinky_extended,
    }
