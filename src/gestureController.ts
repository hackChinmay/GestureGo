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
  requiredNeutralFrames: number;
  actionMapping: Record<string, KioskAction>;

  // Canonical state machine: READY -> CANDIDATE -> EXECUTED -> LOCKED_HOLD -> READY
  state: ControllerState = 'READY';
  currentCandidate: GestureClass | null = null;
  candidateFrames: number = 0;
  candidateStartTime: number = 0;
  lockedGesture: GestureClass | null = null;
  lastAction: KioskAction | null = null;
  lastActionTimestamp: number = 0;
  lastRejectionReason: RejectionReason = 'NONE';
  lastRejectionDetail: string = '';

  // Neutral release counter: prevents re-arming from 1-2 momentary frame dropouts
  neutralObservationCount: number = 0;
  neutralStartTime: number = 0;

  // Diagnostics and counters
  totalFrames: number = 0;
  totalActions: number = 0;
  repeatedPreventions: number = 0;
  lowConfidenceRejections: number = 0;
  unstableRejections: number = 0;
  neutralReleases: number = 0;

  constructor(
    confidenceThreshold = 0.80,
    stabilityDurationSec = 0.35,
    requiredStableFrames = 7,
    cooldownSec = 0.30,
    requiredNeutralFrames = 3,
    actionMapping: Record<string, KioskAction> = GESTURE_TO_ACTION
  ) {
    this.confidenceThreshold = confidenceThreshold;
    this.stabilityDurationSec = stabilityDurationSec;
    this.requiredStableFrames = requiredStableFrames;
    this.cooldownSec = cooldownSec;
    this.requiredNeutralFrames = requiredNeutralFrames;
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
    this.state = 'READY';
    this.currentCandidate = null;
    this.candidateFrames = 0;
    this.candidateStartTime = 0;
    this.lockedGesture = null;
    this.neutralObservationCount = 0;
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

    // Condition A: Hand is neutral (NO_HAND)
    if (gesture === 'NO_HAND') {
      this.lastRejectionReason = 'NO_HAND';
      this.lastRejectionDetail = 'No hand detected in viewport';
      this._observeNeutral(now);
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Condition B: Hand pose is UNKNOWN or UNCERTAIN
    if (gesture === 'UNKNOWN' || gesture === 'UNCERTAIN') {
      this.lastRejectionReason = 'UNRECOGNIZED_POSE';
      this.lastRejectionDetail = 'Hand visible but pose not recognized in target gesture classes';
      this._observeNeutral(now);
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Valid hand pose seen -> reset neutral observation counter
    this.neutralObservationCount = 0;

    // Condition C: Confidence below configured threshold
    if (confidence < this.confidenceThreshold) {
      this.lowConfidenceRejections += 1;
      this.lastRejectionReason = 'BELOW_CONFIDENCE';
      this.lastRejectionDetail = `Confidence ${confidence.toFixed(2)} is below threshold ${this.confidenceThreshold.toFixed(2)}`;

      // Invalidate in-progress candidate if confidence drops
      if (this.state === 'CANDIDATE') {
        this.state = 'READY';
        this.currentCandidate = null;
        this.candidateFrames = 0;
      }
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Condition D: One-Shot LOCKED_HOLD state
    // Holding the gesture must NEVER trigger repeated actions!
    if (this.state === 'LOCKED_HOLD' || this.state === 'LOCKED') {
      if (gesture === this.lockedGesture) {
        this.repeatedPreventions += 1;
        this.lastRejectionReason = 'LOCKED_HOLD';
        this.lastRejectionDetail = `Gesture '${gesture}' is held in LOCKED state. Release hand to neutral to re-arm.`;
        return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
      } else {
        // User switched to a different high-confidence gesture while locked
        // Start candidate evaluation for the new gesture
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

    // Condition E: Cooldown period check
    const timeSinceLastAction = now - this.lastActionTimestamp;
    if (this.lastActionTimestamp > 0 && timeSinceLastAction < this.cooldownSec) {
      this.lastRejectionReason = 'COOLDOWN_ACTIVE';
      this.lastRejectionDetail = `Cooling down (${(this.cooldownSec - timeSinceLastAction).toFixed(2)}s remaining)`;
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    }

    // Condition F: State Machine Candidate Accumulation
    if (this.state === 'READY' || this.state === 'IDLE' || this.state === 'REARMED') {
      this.state = 'CANDIDATE';
      this.currentCandidate = gesture;
      this.candidateFrames = 1;
      this.candidateStartTime = now;
      this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
      this.lastRejectionDetail = `Candidate '${gesture}' initiated (frame 1/${this.requiredStableFrames})`;
      return { action: null, telemetry: this.getTelemetry(gesture, confidence, null, now) };
    } else if (this.state === 'CANDIDATE') {
      if (gesture === this.currentCandidate) {
        this.candidateFrames += 1;
        const elapsed = now - this.candidateStartTime;

        // Check if temporal stability and frame threshold are met
        if (
          this.candidateFrames >= this.requiredStableFrames &&
          elapsed >= this.stabilityDurationSec
        ) {
          // EXECUTE ACTION EXACTLY ONCE!
          const mapped = this.actionMapping[gesture];
          if (mapped) {
            actionTriggered = mapped;
            this.totalActions += 1;
            this.lastAction = mapped;
            this.lastActionTimestamp = now;

            // Transition to LOCKED_HOLD immediately to prevent duplicate actions
            this.state = 'LOCKED_HOLD';
            this.lockedGesture = gesture;
            this.currentCandidate = null;
            this.candidateFrames = 0;
          } else {
            this.state = 'READY';
            this.currentCandidate = null;
            this.candidateFrames = 0;
          }
        } else {
          this.unstableRejections += 1;
          this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
          this.lastRejectionDetail = `Holding '${gesture}': frame ${this.candidateFrames}/${this.requiredStableFrames}, ${elapsed.toFixed(2)}s/${this.stabilityDurationSec.toFixed(2)}s required`;
        }
      } else {
        // Hand pose changed during candidate accumulation: reset candidate
        this.currentCandidate = gesture;
        this.candidateFrames = 1;
        this.candidateStartTime = now;
        this.unstableRejections += 1;
        this.lastRejectionReason = 'TEMPORAL_INSTABILITY';
        this.lastRejectionDetail = `Gesture changed to '${gesture}', resetting candidate counter`;
      }
    }

    return {
      action: actionTriggered,
      telemetry: this.getTelemetry(gesture, confidence, actionTriggered, now),
    };
  }

  /**
   * Observe neutral hand state (NO_HAND or UNKNOWN).
   * Requires sustained neutral observation before re-arming to prevent false re-arm from 1-frame glitches.
   */
  private _observeNeutral(now: number) {
    if (this.state === 'LOCKED_HOLD' || this.state === 'LOCKED') {
      this.neutralObservationCount += 1;
      if (this.neutralObservationCount >= this.requiredNeutralFrames) {
        // Sustained neutral observed -> safely re-arm
        this.state = 'READY';
        this.lockedGesture = null;
        this.currentCandidate = null;
        this.candidateFrames = 0;
        this.neutralObservationCount = 0;
        this.neutralReleases += 1;
      }
    } else if (this.state === 'CANDIDATE') {
      this.state = 'READY';
      this.currentCandidate = null;
      this.candidateFrames = 0;
      this.neutralObservationCount = 0;
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
    } else if (this.state === 'LOCKED_HOLD' || this.state === 'LOCKED') {
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
