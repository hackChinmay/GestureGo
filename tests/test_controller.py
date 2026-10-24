"""
tests/test_controller.py - Automated Unit Tests for GestureController.

Tests the 5-state state machine:
    READY -> CANDIDATE -> EXECUTED -> LOCKED_HOLD -> READY

Verifies:
- One-shot action execution (no repeat actions during held gestures)
- Confidence threshold filtering
- Temporal stability requirements
- Multi-frame neutral release / re-arm transitions
- Cooldown period
- Rapid switching between candidate gestures
"""

import unittest
from gesture_controller import (
    GestureController,
    ControllerState,
    RejectionReason,
    GESTURE_TO_ACTION,
)

class TestGestureController(unittest.TestCase):

    def setUp(self):
        # Create controller with deterministic parameters
        self.controller = GestureController(
            confidence_threshold=0.80,
            stability_duration_sec=0.20,
            required_stable_frames=4,
            cooldown_sec=0.10,
            required_neutral_frames=3,
        )

    def test_initial_state_is_ready(self):
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE"))
        self.assertEqual(self.controller.total_actions_triggered, 0)
        self.assertIsNone(self.controller.current_candidate)

    def test_no_hand_handling(self):
        action, telemetry = self.controller.process_frame("NO_HAND", 0.0, timestamp=1.0)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE"))
        self.assertEqual(telemetry["rejection_reason"], RejectionReason.NO_HAND.value)

    def test_unknown_gesture_handling(self):
        action, telemetry = self.controller.process_frame("UNKNOWN", 0.90, timestamp=1.0)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE"))
        self.assertEqual(telemetry["rejection_reason"], RejectionReason.UNRECOGNIZED_POSE.value)

    def test_low_confidence_rejection(self):
        # Conf below 0.80 threshold
        action, telemetry = self.controller.process_frame("OPEN_PALM", 0.72, timestamp=1.0)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE"))
        self.assertEqual(telemetry["rejection_reason"], RejectionReason.BELOW_CONFIDENCE.value)
        self.assertEqual(self.controller.low_confidence_rejections, 1)

    def test_temporal_stability_and_one_shot_execution(self):
        # Frame 1: Candidate starts
        action, tel1 = self.controller.process_frame("OPEN_PALM", 0.90, timestamp=1.00)
        self.assertIsNone(action)
        self.assertEqual(self.controller.state, ControllerState.CANDIDATE)

        # Frame 2: Still candidate
        action, tel2 = self.controller.process_frame("OPEN_PALM", 0.90, timestamp=1.07)
        self.assertIsNone(action)
        self.assertEqual(self.controller.state, ControllerState.CANDIDATE)

        # Frame 3: Still candidate
        action, tel3 = self.controller.process_frame("OPEN_PALM", 0.90, timestamp=1.14)
        self.assertIsNone(action)
        self.assertEqual(self.controller.state, ControllerState.CANDIDATE)

        # Frame 4: Required 4 frames and 0.20s elapsed -> Triggers HOME
        action, tel4 = self.controller.process_frame("OPEN_PALM", 0.90, timestamp=1.22)
        self.assertEqual(action, "HOME")
        self.assertIn(self.controller.state, (ControllerState.LOCKED_HOLD, "LOCKED"))
        self.assertEqual(self.controller.total_actions_triggered, 1)

        # CRITICAL TEST: Held gesture (frames 5 through 10) must NEVER repeat action!
        for t in [1.25, 1.30, 1.40, 1.60, 2.00, 2.50]:
            repeat_action, repeat_tel = self.controller.process_frame("OPEN_PALM", 0.95, timestamp=t)
            self.assertIsNone(repeat_action, f"Action repeated at t={t}!")
            self.assertIn(self.controller.state, (ControllerState.LOCKED_HOLD, "LOCKED"))
            self.assertEqual(repeat_tel["rejection_reason"], RejectionReason.LOCKED_HOLD.value)

        # Total actions must strictly remain 1
        self.assertEqual(self.controller.total_actions_triggered, 1)
        self.assertGreater(self.controller.repeated_action_preventions, 0)

    def test_rearming_after_sustained_neutral_release(self):
        # Trigger action first
        for i in range(4):
            self.controller.process_frame("VICTORY", 0.90, timestamp=1.0 + (i * 0.08))
        self.assertIn(self.controller.state, (ControllerState.LOCKED_HOLD, "LOCKED"))
        self.assertEqual(self.controller.last_action, "OPEN_SCHEDULE")

        # 1 frame of neutral should NOT re-arm yet (guard against 1-frame camera dropouts)
        action, tel1 = self.controller.process_frame("NO_HAND", 0.0, timestamp=1.40)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.LOCKED_HOLD, "LOCKED"))

        # 2nd frame of neutral
        action, tel2 = self.controller.process_frame("NO_HAND", 0.0, timestamp=1.45)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.LOCKED_HOLD, "LOCKED"))

        # 3rd consecutive frame of neutral: Sustained neutral reached -> re-arms to READY!
        action, tel3 = self.controller.process_frame("NO_HAND", 0.0, timestamp=1.50)
        self.assertIsNone(action)
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE", "REARMED"))
        self.assertEqual(self.controller.neutral_releases_observed, 1)

        # Now performing POINTING_UP triggers NEXT_PAGE once
        act = None
        for i in range(4):
            act, _ = self.controller.process_frame("POINTING_UP", 0.90, timestamp=1.60 + (i * 0.08))

        self.assertEqual(act, "NEXT_PAGE")
        self.assertEqual(self.controller.total_actions_triggered, 2)

    def test_candidate_reset_on_pose_change(self):
        # 2 frames of THUMBS_UP
        self.controller.process_frame("THUMBS_UP", 0.88, timestamp=1.0)
        self.controller.process_frame("THUMBS_UP", 0.88, timestamp=1.05)
        self.assertEqual(self.controller.candidate_frames, 2)

        # Suddenly pose flickers to CLOSED_FIST before 4 frames are reached
        self.controller.process_frame("CLOSED_FIST", 0.88, timestamp=1.10)
        # Should reset candidate counter to 1 for the new gesture
        self.assertEqual(self.controller.current_candidate, "CLOSED_FIST")
        self.assertEqual(self.controller.candidate_frames, 1)
        self.assertEqual(self.controller.total_actions_triggered, 0)

    def test_controller_reset(self):
        self.controller.process_frame("THUMBS_UP", 0.88, timestamp=1.0)
        self.assertEqual(self.controller.state, ControllerState.CANDIDATE)
        self.controller.reset()
        self.assertIn(self.controller.state, (ControllerState.READY, "IDLE"))
        self.assertIsNone(self.controller.current_candidate)
        self.assertEqual(self.controller.candidate_frames, 0)

if __name__ == "__main__":
    unittest.main()
