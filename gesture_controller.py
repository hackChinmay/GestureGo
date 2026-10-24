"""
gesture_controller.py - Confidence-Aware One-Shot Gesture State Machine.

Implements the 5-state lifecycle for touchless kiosk interaction:
    IDLE -> CANDIDATE -> CONFIRMED -> LOCKED -> REARMED

Guarantees:
- One-shot action execution: holding a gesture never repeats actions.
- Confidence-aware: drops predictions below configurable threshold.
- Temporal stability: gesture must be held consistently for stable_frames.
- Neutral release requirement: user must release/return to neutral before re-arming.
- Explains explicit rejection reason on every frame.
"""

from enum import Enum
import time
from typing import Optional, Dict, Any, Tuple

class ControllerState(str, Enum):
    IDLE = "IDLE"
    CANDIDATE = "CANDIDATE"
    CONFIRMED = "CONFIRMED"
    LOCKED = "LOCKED"
    REARMED = "REARMED"

class RejectionReason(str, Enum):
    NONE = "NONE"
    NO_HAND = "NO_HAND"
    UNRECOGNIZED_POSE = "UNRECOGNIZED_POSE"
    BELOW_CONFIDENCE = "BELOW_CONFIDENCE"
    TEMPORAL_INSTABILITY = "TEMPORAL_INSTABILITY"
    LOCKED_HOLD = "LOCKED_HOLD"
    COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE"

# Canonical Gesture to Action Mapping for GestureGo
GESTURE_TO_ACTION = {
    "OPEN_PALM": "GO_HOME",
    "POINTING_UP": "NEXT_ITEM",
    "VICTORY": "OPEN_SCHEDULE",
    "THUMBS_UP": "CONFIRM",
    "CLOSED_FIST": "GO_BACK",
    "THUMBS_DOWN": "CANCEL",
    "I_LOVE_YOU": "OPEN_HELP",
}

NEUTRAL_GESTURES = {"NO_HAND", "UNKNOWN", "NEUTRAL"}

class GestureController:
    """
    State machine that transforms a stream of raw frame predictions into
    deliberate, single-trigger, confidence-verified kiosk interactions.
    """

    def __init__(
        self,
        confidence_threshold: float = 0.80,
        stability_duration_sec: float = 0.40,
        required_stable_frames: int = 8,
        cooldown_sec: float = 0.35,
        action_mapping: Optional[Dict[str, str]] = None,
    ):
        self.confidence_threshold = float(confidence_threshold)
        self.stability_duration_sec = float(stability_duration_sec)
        self.required_stable_frames = int(required_stable_frames)
        self.cooldown_sec = float(cooldown_sec)
        self.action_mapping = dict(action_mapping or GESTURE_TO_ACTION)

        # State machine variables
        self.state = ControllerState.IDLE
        self.current_candidate: Optional[str] = None
        self.candidate_frames: int = 0
        self.candidate_start_time: float = 0.0
        self.locked_gesture: Optional[str] = None
        self.last_action: Optional[str] = None
        self.last_action_timestamp: float = 0.0
        self.last_rejection_reason = RejectionReason.NONE
        self.last_rejection_detail: str = ""

        # Diagnostics & counters (honest, un-fabricated metrics)
        self.total_frames_processed = 0
        self.total_actions_triggered = 0
        self.repeated_action_preventions = 0
        self.low_confidence_rejections = 0
        self.unstable_rejections = 0
        self.neutral_releases_observed = 0

    def set_confidence_threshold(self, threshold: float) -> None:
        """Update confidence threshold (e.g. via UI slider)."""
        self.confidence_threshold = max(0.0, min(1.0, float(threshold)))

    def set_stability_requirements(self, duration_sec: float, frames: int) -> None:
        """Update stability temporal parameters."""
        self.stability_duration_sec = max(0.05, float(duration_sec))
        self.required_stable_frames = max(1, int(frames))

    def reset(self) -> None:
        """Reset state machine to initial pristine state."""
        self.state = ControllerState.IDLE
        self.current_candidate = None
        self.candidate_frames = 0
        self.candidate_start_time = 0.0
        self.locked_gesture = None
        self.last_rejection_reason = RejectionReason.NONE
        self.last_rejection_detail = ""

    def process_frame(
        self,
        gesture: str,
        confidence: float,
        timestamp: Optional[float] = None,
    ) -> Tuple[Optional[str], Dict[str, Any]]:
        """
        Process a single prediction frame from computer vision.

        Args:
            gesture: The detected gesture name (e.g. 'OPEN_PALM', 'UNKNOWN', 'NO_HAND')
            confidence: The classifier score between 0.0 and 1.0
            timestamp: Optional epoch seconds for testing/deterministic playback

        Returns:
            (action_or_none, telemetry_dict)
        """
        now = time.time() if timestamp is None else float(timestamp)
        self.total_frames_processed += 1
        action_triggered: Optional[str] = None
        self.last_rejection_reason = RejectionReason.NONE
        self.last_rejection_detail = ""

        # Case 1: No hand detected or hand lost
        if gesture in ("NO_HAND", None, ""):
            self.last_rejection_reason = RejectionReason.NO_HAND
            self.last_rejection_detail = "No hand visible in camera frame"
            self._handle_neutral_observation(now)
            return None, self._telemetry(gesture, confidence, action_triggered, now)

        # Case 2: Unknown gesture pose
        if gesture == "UNKNOWN":
            self.last_rejection_reason = RejectionReason.UNRECOGNIZED_POSE
            self.last_rejection_detail = "Hand visible but pose not recognized in target classes"
            self._handle_neutral_observation(now)
            return None, self._telemetry(gesture, confidence, action_triggered, now)

        # Case 3: Gesture is recognized, but confidence is below user-configured threshold
        if confidence < self.confidence_threshold:
            self.low_confidence_rejections += 1
            self.last_rejection_reason = RejectionReason.BELOW_CONFIDENCE
            self.last_rejection_detail = (
                f"Confidence {confidence:.2f} is below threshold {self.confidence_threshold:.2f}"
            )
            # If we were building a candidate, a low confidence frame resets it
            if self.state == ControllerState.CANDIDATE:
                self.state = ControllerState.IDLE
                self.current_candidate = None
                self.candidate_frames = 0
            return None, self._telemetry(gesture, confidence, action_triggered, now)

        # Case 4: Held gesture in LOCKED state (prevent repeated execution immediately)
        if self.state == ControllerState.LOCKED:
            if gesture == self.locked_gesture:
                self.repeated_action_preventions += 1
                self.last_rejection_reason = RejectionReason.LOCKED_HOLD
                self.last_rejection_detail = (
                    f"Gesture '{gesture}' is held in LOCKED state. Release hand to neutral to re-arm."
                )
                return None, self._telemetry(gesture, confidence, action_triggered, now)
            else:
                # User transitioned to a different high-confidence gesture while locked
                self.state = ControllerState.CANDIDATE
                self.current_candidate = gesture
                self.candidate_frames = 1
                self.candidate_start_time = now
                self.locked_gesture = None
                self.last_rejection_reason = RejectionReason.TEMPORAL_INSTABILITY
                self.last_rejection_detail = f"Switching candidate to '{gesture}' (frame 1/{self.required_stable_frames})"
                return None, self._telemetry(gesture, confidence, action_triggered, now)

        # Case 5: Cooldown period check for newly transitioning gestures
        time_since_last_action = now - self.last_action_timestamp
        if self.last_action_timestamp > 0 and time_since_last_action < self.cooldown_sec:
            self.last_rejection_reason = RejectionReason.COOLDOWN_ACTIVE
            self.last_rejection_detail = (
                f"Cooling down ({self.cooldown_sec - time_since_last_action:.2f}s remaining)"
            )
            return None, self._telemetry(gesture, confidence, action_triggered, now)

        # Case 6: State Machine Dispatch for candidate buildup

        elif self.state in (ControllerState.IDLE, ControllerState.REARMED):
            self.state = ControllerState.CANDIDATE
            self.current_candidate = gesture
            self.candidate_frames = 1
            self.candidate_start_time = now
            self.last_rejection_reason = RejectionReason.TEMPORAL_INSTABILITY
            self.last_rejection_detail = f"Candidate '{gesture}' initiated (1/{self.required_stable_frames} frames)"
            return None, self._telemetry(gesture, confidence, action_triggered, now)

        elif self.state == ControllerState.CANDIDATE:
            if gesture == self.current_candidate:
                self.candidate_frames += 1
                elapsed = now - self.candidate_start_time

                # Check if stability conditions are satisfied
                if (
                    self.candidate_frames >= self.required_stable_frames
                    and elapsed >= self.stability_duration_sec
                ):
                    # Trigger action ONCE
                    mapped_action = self.action_mapping.get(gesture)
                    if mapped_action:
                        action_triggered = mapped_action
                        self.total_actions_triggered += 1
                        self.last_action = mapped_action
                        self.last_action_timestamp = now

                        # Immediately lock repeated execution!
                        self.state = ControllerState.LOCKED
                        self.locked_gesture = gesture
                        self.current_candidate = None
                        self.candidate_frames = 0
                    else:
                        self.state = ControllerState.IDLE
                        self.current_candidate = None
                        self.candidate_frames = 0
                else:
                    self.unstable_rejections += 1
                    self.last_rejection_reason = RejectionReason.TEMPORAL_INSTABILITY
                    self.last_rejection_detail = (
                        f"Holding '{gesture}': frame {self.candidate_frames}/{self.required_stable_frames}, "
                        f"{elapsed:.2f}s/{self.stability_duration_sec:.2f}s required"
                    )
            else:
                # Gesture flickered or changed during candidate buildup -> reset candidate
                self.current_candidate = gesture
                self.candidate_frames = 1
                self.candidate_start_time = now
                self.unstable_rejections += 1
                self.last_rejection_reason = RejectionReason.TEMPORAL_INSTABILITY
                self.last_rejection_detail = f"Gesture changed to '{gesture}', resetting stability counter"

        return action_triggered, self._telemetry(gesture, confidence, action_triggered, now)

    def _handle_neutral_observation(self, now: float) -> None:
        """Handle observing a neutral pose (release), re-arming the controller."""
        if self.state == ControllerState.LOCKED:
            self.state = ControllerState.REARMED
            self.locked_gesture = None
            self.current_candidate = None
            self.candidate_frames = 0
            self.neutral_releases_observed += 1
        elif self.state == ControllerState.CANDIDATE:
            self.state = ControllerState.IDLE
            self.current_candidate = None
            self.candidate_frames = 0

    def _telemetry(
        self,
        gesture: str,
        confidence: float,
        action: Optional[str],
        now: float,
    ) -> Dict[str, Any]:
        """Produce structured telemetry for UI and evaluation."""
        stability_pct = 0.0
        if self.state == ControllerState.CANDIDATE and self.required_stable_frames > 0:
            frame_ratio = min(1.0, self.candidate_frames / float(self.required_stable_frames))
            time_ratio = (
                min(1.0, (now - self.candidate_start_time) / float(self.stability_duration_sec))
                if self.stability_duration_sec > 0
                else 1.0
            )
            stability_pct = round(min(frame_ratio, time_ratio) * 100.0, 1)
        elif self.state == ControllerState.LOCKED:
            stability_pct = 100.0

        return {
            "state": self.state.value,
            "gesture": gesture,
            "confidence": round(confidence, 3),
            "action": action,
            "last_action": self.last_action,
            "locked_gesture": self.locked_gesture,
            "stability_pct": stability_pct,
            "candidate_frames": self.candidate_frames,
            "rejection_reason": self.last_rejection_reason.value,
            "rejection_detail": self.last_rejection_detail,
            "counters": {
                "total_frames": self.total_frames_processed,
                "total_actions": self.total_actions_triggered,
                "repeated_preventions": self.repeated_action_preventions,
                "low_confidence_rejections": self.low_confidence_rejections,
                "unstable_rejections": self.unstable_rejections,
                "neutral_releases": self.neutral_releases_observed,
            },
        }
