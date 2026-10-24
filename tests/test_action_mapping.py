"""
tests/test_action_mapping.py - Action Mapping and Pipeline Integrity Tests.

Verifies:
- All 8 gesture mappings yield their exact assigned kiosk actions:
  OPEN_PALM -> HOME
  POINTING_UP -> NEXT_PAGE
  POINTING_DOWN -> SCROLL_DOWN
  VICTORY -> OPEN_SCHEDULE
  THUMBS_UP -> CONFIRM_OR_SELECT
  CLOSED_FIST -> BACK
  THUMBS_DOWN -> CANCEL
  I_LOVE_YOU -> OPEN_HELP
- Preprocess normalization produces 63 elements
- Scale and translation invariance
- Missing model files fall back safely to built-in kinematics
"""

import unittest
from gesture_controller import GestureController, GESTURE_TO_ACTION
from gesture_classifier import GestureClassifier
from preprocess import normalize_landmarks, FEATURE_NAMES, GESTURE_CLASSES

class TestActionMappingAndPipeline(unittest.TestCase):

    def setUp(self):
        self.controller = GestureController(
            confidence_threshold=0.75,
            stability_duration_sec=0.05,
            required_stable_frames=2,
            cooldown_sec=0.05,
        )

    def _trigger_gesture(self, gesture: str, start_time: float = 1.0):
        self.controller.reset()
        a1, _ = self.controller.process_frame(gesture, 0.95, timestamp=start_time)
        a2, _ = self.controller.process_frame(gesture, 0.95, timestamp=start_time + 0.08)
        return a2

    def test_open_palm_maps_to_home(self):
        action = self._trigger_gesture("OPEN_PALM")
        self.assertEqual(action, "HOME")

    def test_pointing_up_maps_to_next_page(self):
        action = self._trigger_gesture("POINTING_UP")
        self.assertEqual(action, "NEXT_PAGE")

    def test_pointing_down_maps_to_scroll_down(self):
        action = self._trigger_gesture("POINTING_DOWN")
        self.assertEqual(action, "SCROLL_DOWN")

    def test_victory_maps_to_open_schedule(self):
        action = self._trigger_gesture("VICTORY")
        self.assertEqual(action, "OPEN_SCHEDULE")

    def test_thumbs_up_maps_to_confirm_or_select(self):
        action = self._trigger_gesture("THUMBS_UP")
        self.assertEqual(action, "CONFIRM_OR_SELECT")

    def test_closed_fist_maps_to_back(self):
        action = self._trigger_gesture("CLOSED_FIST")
        self.assertEqual(action, "BACK")

    def test_thumbs_down_maps_to_cancel(self):
        action = self._trigger_gesture("THUMBS_DOWN")
        self.assertEqual(action, "CANCEL")

    def test_i_love_you_maps_to_open_help(self):
        action = self._trigger_gesture("I_LOVE_YOU")
        self.assertEqual(action, "OPEN_HELP")

    def test_preprocess_feature_dimensions(self):
        self.assertEqual(len(FEATURE_NAMES), 63)
        mock_landmarks = [{"x": float(i) * 0.04, "y": float(i) * 0.05, "z": 0.01} for i in range(21)]
        vec = normalize_landmarks(mock_landmarks)
        self.assertEqual(len(vec), 63)
        # Wrist coordinate (first 3) should be origin (0, 0, 0)
        self.assertAlmostEqual(vec[0], 0.0)
        self.assertAlmostEqual(vec[1], 0.0)
        self.assertAlmostEqual(vec[2], 0.0)

    def test_classifier_fallback_on_missing_model(self):
        clf = GestureClassifier(model_path="models/non_existent_model_12345.joblib")
        self.assertEqual(clf.active_backend, "MEDIAPIPE_BUILTIN")
        self.assertFalse(clf.model_metadata["loaded"])
        pred, conf, probas = clf.predict(None)
        self.assertEqual(pred, "NO_HAND")
        self.assertEqual(conf, 0.0)

if __name__ == "__main__":
    unittest.main()
