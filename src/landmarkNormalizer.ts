import { Landmark3D, GestureClass } from './types';

export function normalizeLandmarks3D(raw: Landmark3D[]): number[] {
  if (!raw || raw.length !== 21) {
    throw new Error(`Expected 21 landmarks, received ${raw?.length ?? 0}`);
  }

  const wrist = raw[0];
  let maxDist = 0;
  const translated: [number, number, number][] = [];

  for (let i = 0; i < 21; i++) {
    const dx = raw[i].x - wrist.x;
    const dy = raw[i].y - wrist.y;
    const dz = raw[i].z - wrist.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) maxDist = dist;
    translated.push([dx, dy, dz]);
  }

  const scale = maxDist > 1e-6 ? maxDist : 1.0;
  const features: number[] = [];

  for (let i = 0; i < 21; i++) {
    features.push(translated[i][0] / scale);
    features.push(translated[i][1] / scale);
    features.push(translated[i][2] / scale);
  }

  return features;
}

export interface FingerExtensionState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export function detectFingerExtensions(normFeatures: number[]): FingerExtensionState {
  function pt(idx: number): [number, number, number] {
    const s = idx * 3;
    return [normFeatures[s], normFeatures[s + 1], normFeatures[s + 2]];
  }

  function dist(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }

  const wrist: [number, number, number] = [0, 0, 0];

  // A finger is extended when tip is significantly further from wrist than PIP joint
  const thumbExt = dist(pt(4), pt(17)) > dist(pt(2), pt(17)) && dist(pt(4), wrist) > 0.45;
  const indexExt = dist(pt(8), wrist) > dist(pt(6), wrist) * 1.15;
  const middleExt = dist(pt(12), wrist) > dist(pt(10), wrist) * 1.15;
  const ringExt = dist(pt(16), wrist) > dist(pt(14), wrist) * 1.15;
  const pinkyExt = dist(pt(20), wrist) > dist(pt(18), wrist) * 1.15;

  return {
    thumb: thumbExt,
    index: indexExt,
    middle: middleExt,
    ring: ringExt,
    pinky: pinkyExt,
  };
}

export function classifyKinematicGesture(normFeatures: number[]): {
  gesture: GestureClass;
  confidence: number;
  probabilities: Record<string, number>;
} {
  const ext = detectFingerExtensions(normFeatures);

  function pt(idx: number): [number, number, number] {
    const s = idx * 3;
    return [normFeatures[s], normFeatures[s + 1], normFeatures[s + 2]];
  }

  const thumbTip = pt(4);
  const thumbIp = pt(3);
  const thumbMcp = pt(2);
  const indexTip = pt(8);
  const indexPip = pt(6);
  const indexMcp = pt(5);
  const middleTip = pt(12);

  // In normalized space, negative Y is UPWARDS on screen, positive Y is DOWNWARDS
  const thumbPointingUp =
    (thumbTip[1] < thumbIp[1] && thumbTip[1] < thumbMcp[1]) || thumbTip[1] < -0.20;
  const thumbPointingDown =
    (thumbTip[1] > thumbIp[1] && thumbTip[1] > thumbMcp[1]) || thumbTip[1] > 0.20;


  const countExtended = Object.values(ext).filter(Boolean).length;
  const indexMiddleDistance = Math.sqrt(
    (indexTip[0] - middleTip[0]) ** 2 + (indexTip[1] - middleTip[1]) ** 2
  );

  const probas: Record<string, number> = {
    OPEN_PALM: 0.05,
    POINTING_UP: 0.05,
    POINTING_DOWN: 0.05,
    VICTORY: 0.05,
    THUMBS_UP: 0.05,
    CLOSED_FIST: 0.05,
    THUMBS_DOWN: 0.05,
    I_LOVE_YOU: 0.05,
  };

  // 1. OPEN_PALM: All 5 fingers extended
  if (ext.thumb && ext.index && ext.middle && ext.ring && ext.pinky) {
    probas.OPEN_PALM = 0.95;
    return { gesture: 'OPEN_PALM', confidence: 0.95, probabilities: probas };
  }

  // 2. CLOSED_FIST: All curled
  if (countExtended === 0) {
    probas.CLOSED_FIST = 0.93;
    return { gesture: 'CLOSED_FIST', confidence: 0.93, probabilities: probas };
  }

  // 3. POINTING_UP: Index extended up, others curled, index tip higher than knuckle
  if (ext.index && !ext.middle && !ext.ring && !ext.pinky && indexTip[1] < indexMcp[1]) {
    probas.POINTING_UP = 0.92;
    return { gesture: 'POINTING_UP', confidence: 0.92, probabilities: probas };
  }

  // 4. POINTING_DOWN: Index extended pointing downwards, others curled, index tip lower than knuckle & PIP
  if (
    !ext.middle &&
    !ext.ring &&
    !ext.pinky &&
    (indexTip[1] > indexMcp[1] + 0.12 || (ext.index && indexTip[1] > indexPip[1]))
  ) {
    probas.POINTING_DOWN = 0.93;
    return { gesture: 'POINTING_DOWN', confidence: 0.93, probabilities: probas };
  }

  // 5. VICTORY: Index and Middle extended in V shape, ring & pinky curled
  if (ext.index && ext.middle && !ext.ring && !ext.pinky && indexMiddleDistance > 0.14) {
    probas.VICTORY = 0.94;
    return { gesture: 'VICTORY', confidence: 0.94, probabilities: probas };
  }

  // 6. THUMBS_UP: Thumb extended UP, other 4 fingers curled
  if (thumbPointingUp && !ext.index && !ext.middle && !ext.ring && !ext.pinky) {
    probas.THUMBS_UP = 0.93;
    return { gesture: 'THUMBS_UP', confidence: 0.93, probabilities: probas };
  }

  // 7. THUMBS_DOWN: Thumb extended DOWN, other 4 fingers curled
  if (thumbPointingDown && !ext.index && !ext.middle && !ext.ring && !ext.pinky) {
    probas.THUMBS_DOWN = 0.91;
    return { gesture: 'THUMBS_DOWN', confidence: 0.91, probabilities: probas };
  }

  // 8. I_LOVE_YOU: Thumb, Index, and Pinky extended; Middle and Ring curled
  if (ext.thumb && ext.index && ext.pinky && !ext.middle && !ext.ring) {
    probas.I_LOVE_YOU = 0.96;
    return { gesture: 'I_LOVE_YOU', confidence: 0.96, probabilities: probas };
  }

  // Unrecognized pose
  return { gesture: 'UNKNOWN', confidence: 0.38, probabilities: probas };
}
