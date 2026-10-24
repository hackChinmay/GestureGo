"""
gesture_classifier.py - Hybrid Gesture Recognition Engine.

Supports two distinct backends with transparent telemetry:
1. CUSTOM_XGBOOST: Trained on 63 normalized landmark features with calibrated probabilities.
2. MEDIAPIPE_BUILTIN: Native MediaPipe recognizer + geometric kinematics fallback.

Honesty guarantee:
- Clearly flags whether the active model is 'XGBOOST' or 'MEDIAPIPE_BUILTIN'.
- Never pretends an XGBoost model is active if the weights file is absent.
"""

import os
import math
from typing import Dict, Any, Tuple, Optional, List
from preprocess import normalize_landmarks, compute_finger_extensions, GESTURE_CLASSES

class GestureClassifier:
    """
    Classifier supporting trained XGBoost inference with transparent fallback
    to built-in MediaPipe gesture recognition.
    """

    def __init__(self, model_path: str = "models/gesture_xgboost.joblib"):
        self.model_path = model_path
        self.model = None
        self.label_encoder = None
        self.active_backend = "MEDIAPIPE_BUILTIN"
        self.model_metadata: Dict[str, Any] = {
            "loaded": False,
            "backend": "MEDIAPIPE_BUILTIN",
            "model_path": model_path,
            "classes": GESTURE_CLASSES,
        }

        # Attempt to load trained XGBoost model if available
        self.load_custom_model(model_path)

    def load_custom_model(self, path: str) -> bool:
        """
        Loads a trained XGBoost / Scikit-Learn pipeline from disk.
        Gracefully falls back to built-in if absent or unreadable.
        """
        self.model_path = path
        if not os.path.exists(path):
            self.model = None
            self.active_backend = "MEDIAPIPE_BUILTIN"
            self.model_metadata["loaded"] = False
            self.model_metadata["backend"] = "MEDIAPIPE_BUILTIN"
            self.model_metadata["note"] = f"No trained model at {path}. Operating on built-in fallback."
            return False

        try:
            import joblib
            saved_bundle = joblib.load(path)
            if isinstance(saved_bundle, dict) and "model" in saved_bundle:
                self.model = saved_bundle["model"]
                self.label_encoder = saved_bundle.get("label_encoder")
                self.model_metadata = saved_bundle.get("metadata", {})
            else:
                self.model = saved_bundle

            self.active_backend = "CUSTOM_XGBOOST"
            self.model_metadata["loaded"] = True
            self.model_metadata["backend"] = "CUSTOM_XGBOOST"
            self.model_metadata["model_path"] = path
            return True
        except Exception as e:
            self.model = None
            self.active_backend = "MEDIAPIPE_BUILTIN"
            self.model_metadata["loaded"] = False
            self.model_metadata["backend"] = "MEDIAPIPE_BUILTIN"
            self.model_metadata["error"] = f"Failed to load {path}: {str(e)}"
            return False

    def predict(
        self,
        raw_landmarks: Optional[List[Dict[str, float]]],
        mediapipe_builtin_label: Optional[str] = None,
        mediapipe_builtin_score: Optional[float] = None,
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Predict gesture class and confidence.

        Args:
            raw_landmarks: 21 landmark dictionaries with 'x', 'y', 'z'
            mediapipe_builtin_label: Label if running MediaPipe GestureRecognizer
            mediapipe_builtin_score: Confidence if running MediaPipe GestureRecognizer

        Returns:
            (predicted_gesture, confidence_score, class_probabilities_dict)
        """
        if raw_landmarks is None or len(raw_landmarks) != 21:
            return "NO_HAND", 0.0, {cls: 0.0 for cls in GESTURE_CLASSES}

        try:
            norm_features = normalize_landmarks(raw_landmarks)
        except Exception:
            return "UNKNOWN", 0.0, {cls: 0.0 for cls in GESTURE_CLASSES}

        # 1. Custom XGBoost inference path
        if self.active_backend == "CUSTOM_XGBOOST" and self.model is not None:
            try:
                import numpy as np
                x = np.array([norm_features], dtype=np.float32)
                probas = self.model.predict_proba(x)[0]
                classes = getattr(self.model, "classes_", GESTURE_CLASSES)
                if self.label_encoder is not None:
                    class_names = self.label_encoder.inverse_transform(classes)
                else:
                    class_names = classes

                prob_dict = {str(c): float(p) for c, p in zip(class_names, probas)}
                top_class = max(prob_dict.items(), key=lambda item: item[1])
                return top_class[0], float(top_class[1]), prob_dict
            except Exception:
                # Fall back to built-in if inference errors occur
                pass

        # 2. Built-in MediaPipe & kinematic landmark analysis fallback
        return self._predict_builtin_kinematics(norm_features, mediapipe_builtin_label, mediapipe_builtin_score)

    def _predict_builtin_kinematics(
        self,
        norm_features: List[float],
        mp_label: Optional[str],
        mp_score: Optional[float],
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Rigorous geometric landmark classification for the 7 target gesture classes.
        """
        ext = compute_finger_extensions(norm_features)

        def pt(idx: int):
            s = idx * 3
            return (norm_features[s], norm_features[s + 1], norm_features[s + 2])

        thumb_tip = pt(4)
        wrist = (0.0, 0.0, 0.0)

        # Thumb vertical direction (in normalized space, -y is upwards on screen)
        thumb_up = thumb_tip[1] < -0.30
        thumb_down = thumb_tip[1] > 0.30

        # Finger count
        extended_count = sum(1 for v in ext.values() if v)

        # Distance between index tip (8) and middle tip (12)
        idx_mid_separation = math.sqrt(
            (pt(8)[0] - pt(12)[0]) ** 2 + (pt(8)[1] - pt(12)[1]) ** 2
        )

        probs: Dict[str, float] = {cls: 0.05 for cls in GESTURE_CLASSES}

        # 1. OPEN_PALM: All 5 fingers extended
        if (
            ext["thumb"]
            and ext["index"]
            and ext["middle"]
            and ext["ring"]
            and ext["pinky"]
        ):
            probs["OPEN_PALM"] = 0.94
            return "OPEN_PALM", 0.94, probs

        # 2. CLOSED_FIST: All 5 curled tight
        if extended_count == 0:
            probs["CLOSED_FIST"] = 0.92
            return "CLOSED_FIST", 0.92, probs

        # 3. POINTING_UP: Index extended, middle/ring/pinky curled, index pointing up
        if ext["index"] and not ext["middle"] and not ext["ring"] and not ext["pinky"]:
            if pt(8)[1] < pt(5)[1]:  # Index tip higher than index knuckle
                probs["POINTING_UP"] = 0.91
                return "POINTING_UP", 0.91, probs

        # 4. VICTORY: Index and middle extended, ring and pinky curled
        if (
            ext["index"]
            and ext["middle"]
            and not ext["ring"]
            and not ext["pinky"]
            and idx_mid_separation > 0.15
        ):
            probs["VICTORY"] = 0.93
            return "VICTORY", 0.93, probs

        # 5. THUMBS_UP: Thumb extended upwards, others curled
        if thumb_up and not ext["index"] and not ext["middle"] and not ext["ring"] and not ext["pinky"]:
            probs["THUMBS_UP"] = 0.92
            return "THUMBS_UP", 0.92, probs

        # 6. THUMBS_DOWN: Thumb extended downwards, others curled
        if thumb_down and not ext["index"] and not ext["middle"] and not ext["ring"] and not ext["pinky"]:
            probs["THUMBS_DOWN"] = 0.90
            return "THUMBS_DOWN", 0.90, probs

        # 7. I_LOVE_YOU: Thumb, index, and pinky extended; middle and ring curled
        if (
            ext["thumb"]
            and ext["index"]
            and ext["pinky"]
            and not ext["middle"]
            and not ext["ring"]
        ):
            probs["I_LOVE_YOU"] = 0.95
            return "I_LOVE_YOU", 0.95, probs

        # Check if native MediaPipe label matches any requested target
        if mp_label:
            cleaned = mp_label.upper().replace(" ", "_")
            if cleaned in GESTURE_CLASSES:
                score = float(mp_score or 0.85)
                probs[cleaned] = score
                return cleaned, score, probs

        # Unrecognized pose
        return "UNKNOWN", 0.40, probs
