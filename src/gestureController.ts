import {
  GestureClass,
  KioskAction,
  ControllerState,
  RejectionReason,
  ControllerTelemetry,
} from './types';
import { GESTURE_TO_ACTION } from './campusData';

export class GestureControllerTS {
  confidenceThreshold: number;
  stabilityDurationSec: number;
  requiredStableFrames: number;
  cooldownSec: number;
  actionMapping: Record<string, KioskAction>;

  state: ControllerState = 'IDLE';
  currentCandidate: GestureClass | null = null;
  candidateFrames: number = 0;
  candidateStartTime: number = 0;
  lockedGesture: GestureClass | null = null;
  lastAction: KioskAction | null = null;
  lastActionTimestamp: number = 0;
  lastRejectionReason: RejectionReason = 'NONE';
  lastRejectionDetail: string = '';

  // Counters
  totalFrames: number = 0;
  totalActions: number = 0;
  repeatedPreventions: number = 0;
  lowConfidenceRejections: number = 0;
  unstableRejections: number = 0;
  neutralReleases: number = 0;

  constructor(
    confidenceThreshold = 0.8,
    stabilityDurationSec = 0.4,
    requiredStableFrames = 8,
    cooldownSec = 0.35,
    actionMapping: Record<string, KioskAction> = GESTURE_TO_ACTION
  ) {
    this.confidenceThreshold = confidenceThreshold;
    this.stabilityDurationSec = stabilityDurationSec;
    this.requiredStableFrames = requiredStableFrames;
    this.cooldownSec = cooldownSec;
    this.actionMapping = { ...actionMapping };
  }

  setConfidenceThreshold(thresh: number) {
    this.confidenceThreshold = Math.max(0, Math.min(1, thresh));
  }

  setStabilityRequirements(durationSec: number, frames: number) {
    this.stabilityDurationSec = Math.max(0.05, durationSec);
    this.requiredStableFrames = Math.max(1, Math.floor(frames));
  }

  reset() {
    this.state = 'IDLE';
    this.currentCandidate = null;
    this.candidateFrames = 0;
    this.candidateStartTime = 0;
    this.lockedGesture = null;
    this.lastRejectionReason = 'NONE';
    this.lastRejectionDetail = '';
  }

  processFrame(
    gesture: GestureClass,
    confidence: number,
    customTimestamp?: number
  ): { action: KioskAction | null; telemetry: ControllerTelemetry } {
    const now = customTimestamp ?? performance.now() / 1000.0;
    this.totalFrames += 1;
    let actionTriggered: KioskAction | null = null;
    this.lastRejectionReason = 'NONE';
    this.lastRejectionDetail = '';

    // Case 1: No hand detected
    if (gesture === 'NO_HAND') {
      this.lastRejectionReason = 'NO_HAND';
      this.lastRejectionDetail = 'No hand detected in camera frame';
      this.handleNeutralObservation();
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Case 2: Unknown gesture pose
    if (gesture === 'UNKNOWN') {
      this.lastRejectionReason = 'UNRECOGNIZED_POSE';
      this.lastRejectionDetail = 'Hand visible but pose not recognized in target set';
      this.handleNeutralObservation();
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Case 3: Confidence below threshold
    if (confidence < this.confidenceThreshold) {
      this.lowConfidenceRejections += 1;
      this.lastRejectionReason = 'BELOW_CONFIDENCE';
      this.lastRejectionDetail = `Confidence ${confidence.toFixed(2)} is below threshold ${this.confidenceThreshold.toFixed(2)}`;
      if (this.state === 'CANDIDATE') {
        this.state = 'IDLE';
        this.currentCandidate = null;
        this.candidateFrames = 0;
      }
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Case 4: Held gesture in LOCKED state (prevent repeated triggers)
    if (this.state === 'LOCKED') {
      if (gesture === this.lockedGesture) {
        this.repeatedPreventions += 1;
        this.lastRejectionReason = 'LOCKED_HOLD';
        this.lastRejectionDetail = `Gesture '${gesture}' is held in LOCKED state. Release hand to neutral to re-arm.`;
        return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
      } else {
        // User transitioned to a different high-confidence gesture while locked
        this.state = 'CANDIDATE';
        this.currentCandidate = gesture;
        this.candidateFrames = 1;
        this.candidateStartTime = now;
        this.lockedGesture = null;
        this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
        this.lastRejectionDetail = `Switching candidate to '${gesture}' (frame 1/${this.requiredStableFrames})`;
        return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
      }
    }

    // Case 5: Cooldown check for newly transitioning gestures
    const timeSinceLastAction = now - this.lastActionTimestamp;
    if (this.lastActionTimestamp > 0 && timeSinceLastAction < this.cooldownSec) {
      this.lastRejectionReason = 'COOLDOWN_ACTIVE';
      this.lastRejectionDetail = `Cooling down (${(this.cooldownSec - timeSinceLastAction).toFixed(2)}s remaining)`;
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Case 6: State Machine Dispatch
    if (this.state === 'IDLE' || this.state === 'REARMED') {
      this.state = 'CANDIDATE';
      this.currentCandidate = gesture;
      this.candidateFrames = 1;
      this.candidateStartTime = now;
      this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
      this.lastRejectionDetail = `Candidate '${gesture}' initiated (1/${this.requiredStableFrames} frames)`;
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    } else if (this.state === 'CANDIDATE') {
      if (gesture === this.currentCandidate) {
        this.candidateFrames += 1;
        const elapsed = now - this.candidateStartTime;

        if (
          this.candidateFrames >= this.requiredStableFrames &&
          elapsed >= this.stabilityDurationSec
        ) {
          // Trigger action EXACTLY ONCE!
          const mapped = this.actionMapping[gesture];
          if (mapped) {
            actionTriggered = mapped;
            this.totalActions += 1;
            this.lastAction = mapped;
            this.lastActionTimestamp = now;

            // Immediately lock repeated execution!
            this.state = 'LOCKED';
            this.lockedGesture = gesture;
            this.currentCandidate = null;
            this.candidateFrames = 0;
          } else {
            this.state = 'IDLE';
            this.currentCandidate = null;
            this.candidateFrames = 0;
          }
        } else {
          this.unstableRejections += 1;
          this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
          this.lastRejectionDetail = `Holding '${gesture}': frame ${this.candidateFrames}/${this.requiredStableFrames}, ${elapsed.toFixed(2)}s/${this.stabilityDurationSec.toFixed(2)}s required`;
        }
      } else {
        // Flickered to different gesture
        this.currentCandidate = gesture;
        this.candidateFrames = 1;
        this.candidateStartTime = now;
        this.unstableRejections += 1;
        this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
        this.lastRejectionDetail = `Gesture changed to '${gesture}', resetting stability counter`;
      }
    }

    return {
      action: actionTriggered,
      telemetry: this.getTelemetry(gesture, confidence, actionTriggered, now),
    };
  }

  private handleNeutralObservation() {
    if (this.state === 'LOCKED') {
      this.state = 'REARMED';
      this.lockedGesture = null;
      this.currentCandidate = null;
      this.candidateFrames = 0;
      this.neutralReleases += 1;
    } else if (this.state === 'CANDIDATE') {
      this.state = 'IDLE';
      this.currentCandidate = null;
      this.candidateFrames = 0;
    }
  }

  getTelemetry(
    gesture: GestureClass,
    confidence: number,
    action: KioskAction | null,
    now: number
  ): ControllerTelemetry {
    let stabilityPct = 0;
    if (this.state === 'CANDIDATE' && this.requiredStableFrames > 0) {
      const frameRatio = Math.min(1.0, this.candidateFrames / this.requiredStableFrames);
      const timeRatio =
        this.stabilityDurationSec > 0
          ? Math.min(1.0, (now - this.candidateStartTime) / this.stabilityDurationSec)
          : 1.0;
      stabilityPct = Math.round(Math.min(frameRatio, timeRatio) * 100);
    } else if (this.state === 'LOCKED') {
      stabilityPct = 100;
    }

    return {
      state: this.state,
      gesture,
      confidence: Math.round(confidence * 100) / 100,
      action,
      lastAction: this.lastAction,
      lockedGesture: this.lockedGesture,
      stabilityPct,
      candidateFrames: this.candidateFrames,
      rejectionReason: this.lastRejectionReason,
      rejectionDetail: this.lastRejectionDetail,
      counters: {
        totalFrames: this.totalFrames,
        totalActions: this.totalActions,
        repeatedPreventions: this.repeatedPreventions,
        lowConfidenceRejections: this.lowConfidenceRejections,
        unstableRejections: this.unstableRejections,
        neutralReleases: this.neutralReleases,
      },
    };
  }
}
