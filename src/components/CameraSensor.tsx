import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GestureClass,
  KioskAction,
  ControllerTelemetry,
  Landmark3D,
} from '../types';
import { GestureControllerTS } from '../gestureController';
import {
  normalizeLandmarks3D,
  classifyKinematicGesture,
} from '../landmarkNormalizer';
import { GESTURE_DEFINITIONS } from '../campusData';
import {
  Camera,
  CameraOff,
  Sliders,
  AlertTriangle,
  Lock,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CameraSensorProps {
  controller: GestureControllerTS;
  onActionTriggered: (action: KioskAction, gesture: GestureClass) => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
  onTelemetryUpdate: (telemetry: ControllerTelemetry) => void;
}

// MediaPipe 21 Hand skeleton connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17], // Palm base
];

export const CameraSensor: React.FC<CameraSensorProps> = ({
  controller,
  onActionTriggered,
  cameraActive,
  onToggleCamera,
  onTelemetryUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<ControllerTelemetry>(() =>
    controller.getTelemetry('NO_HAND', 0, null, performance.now() / 1000)
  );

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
    controller.confidenceThreshold
  );
  const [stabilityFrames, setStabilityFrames] = useState<number>(
    controller.requiredStableFrames
  );
  const [stabilityDurationSec, setStabilityDurationSec] = useState<number>(
    controller.stabilityDurationSec
  );

  // MediaPipe Vision Tasks reference
  const recognizerRef = useRef<any>(null);
  const [mediapipeLoaded, setMediapipeLoaded] = useState<boolean>(false);

  // Load MediaPipe Tasks Vision GestureRecognizer in browser
  useEffect(() => {
    let isMounted = true;
    async function initMediaPipe() {
      try {
        const { FilesetResolver, GestureRecognizer } = await import(
          '@mediapipe/tasks-vision'
        );
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (!isMounted) return;

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (isMounted) {
          recognizerRef.current = recognizer;
          setMediapipeLoaded(true);
        }
      } catch (err) {
        console.warn('MediaPipe Wasm CDN notice (operating on browser landmark fallback engine):', err);
        if (isMounted) {
          setMediapipeLoaded(false);
        }
      }
    }

    initMediaPipe();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleThresholdChange = (val: number) => {
    setConfidenceThreshold(val);
    controller.setConfidenceThreshold(val);
  };

  const handleStabilityFramesChange = (val: number) => {
    setStabilityFrames(val);
    controller.setStabilityRequirements(stabilityDurationSec, val);
  };

  const handleStabilityDurationChange = (val: number) => {
    setStabilityDurationSec(val);
    controller.setStabilityRequirements(val, stabilityFrames);
  };

  // Start / Stop Camera Stream
  useEffect(() => {
    if (!cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      return;
    }

    let isSubscribed = true;
    setCameraError(null);

    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
          };
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        console.error('Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera access denied by browser permission. You can still use the 8 manual buttons or the simulator below.'
            : `Webcam unavailable (${err.message || 'Device in use'}). Manual navigation remains fully operational.`
        );
      }
    }

    startWebcam();

    return () => {
      isSubscribed = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [cameraActive]);

  // Main Computer Vision Loop
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  const processVideoFrame = useCallback(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState < 2 || !ctx) {
      animFrameId.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const now = performance.now();
    frameCountRef.current += 1;
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    let detectedGesture: GestureClass = 'NO_HAND';
    let detectedConfidence = 0.0;
    let landmarksToDraw: Landmark3D[] | null = null;

    if (recognizerRef.current && video.currentTime > 0) {
      try {
        const results = recognizerRef.current.recognizeForVideo(video, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          const rawLm = results.landmarks[0] as Landmark3D[];
          landmarksToDraw = rawLm;

          // 1. Geometric kinematic normalizer (supports POINTING_DOWN + 7 canonical poses)
          try {
            const normFeatures = normalizeLandmarks3D(rawLm);
            const kinematic = classifyKinematicGesture(normFeatures);

            if (kinematic.gesture !== 'UNKNOWN') {
              detectedGesture = kinematic.gesture;
              detectedConfidence = kinematic.confidence;
            } else {
              // 2. MediaPipe built-in fallback for other poses
              const mpGestures = results.gestures && results.gestures[0];
              if (mpGestures && mpGestures.length > 0) {
                const mpLabel = mpGestures[0].categoryName;
                let cleaned = mpLabel.toUpperCase().replace(/\s+/g, '_');
                if (cleaned === 'THUMB_UP') cleaned = 'THUMBS_UP';
                if (cleaned === 'THUMB_DOWN') cleaned = 'THUMBS_DOWN';
                if (cleaned === 'ILOVEYOU') cleaned = 'I_LOVE_YOU';

                const targetGesture = cleaned as GestureClass;
                if (GESTURE_DEFINITIONS[targetGesture]) {
                  detectedGesture = targetGesture;
                  detectedConfidence = mpGestures[0].score;
                } else {
                  detectedGesture = 'UNKNOWN';
                  detectedConfidence = 0.45;
                }
              } else {
                detectedGesture = 'UNKNOWN';
                detectedConfidence = 0.40;
              }
            }
          } catch {
            detectedGesture = 'UNKNOWN';
            detectedConfidence = 0.40;
          }
        } else {
          detectedGesture = 'NO_HAND';
          detectedConfidence = 0.0;
        }
      } catch (e) {
        detectedGesture = 'NO_HAND';
      }
    }

    // Draw hand skeleton on canvas
    if (landmarksToDraw && landmarksToDraw.length === 21) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      // Skeleton lines in crisp black
      ctx.strokeStyle = '#17151B';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const p1 = landmarksToDraw[startIdx];
        const p2 = landmarksToDraw[endIdx];
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }

      // Landmarks: electric lime with black ring
      for (let i = 0; i < landmarksToDraw.length; i++) {
        const p = landmarksToDraw[i];
        const px = p.x * width;
        const py = p.y * height;

        ctx.beginPath();
        ctx.arc(px, py, i === 0 ? 8 : 5.5, 0, 2 * Math.PI);
        ctx.fillStyle = i === 0 ? '#FF7048' : [4, 8, 12, 16, 20].includes(i) ? '#D8FF4F' : '#FFFFFF';
        ctx.strokeStyle = '#17151B';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    // Process frame through one-shot controller
    const { action, telemetry: nextTelemetry } = controller.processFrame(
      detectedGesture,
      detectedConfidence,
      now / 1000.0
    );

    setTelemetry(nextTelemetry);
    onTelemetryUpdate(nextTelemetry);

    if (action) {
      onActionTriggered(action, detectedGesture);
    }

    animFrameId.current = requestAnimationFrame(processVideoFrame);
  }, [
    cameraActive,
    controller,
    onActionTriggered,
    onTelemetryUpdate,
  ]);

  useEffect(() => {
    if (cameraActive) {
      animFrameId.current = requestAnimationFrame(processVideoFrame);
    }
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [cameraActive, processVideoFrame]);

  // Simulator helper for manual frame triggering
  const sendSimulatedPose = (pose: GestureClass, conf: number, holdFrames: number = 1) => {
    let triggered: KioskAction | null = null;
    let t = performance.now() / 1000.0;

    for (let i = 0; i < holdFrames; i++) {
      const res = controller.processFrame(pose, conf, t + i * 0.05);
      if (res.action) triggered = res.action;
      setTelemetry(res.telemetry);
      onTelemetryUpdate(res.telemetry);
    }

    if (triggered) {
      onActionTriggered(triggered, pose);
    }
  };

  const gestureDef = GESTURE_DEFINITIONS[telemetry.gesture] || GESTURE_DEFINITIONS.UNKNOWN;

  return (
    <div className="bg-white border-2 border-[#17151B] rounded-lg overflow-hidden ink-shadow flex flex-col">
      {/* Top Header of Sensor Panel */}
      <div className="px-4 py-2.5 bg-[#FFF7E8] border-b-2 border-[#17151B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full border border-[#17151B] ${
              cameraActive
                ? telemetry.gesture !== 'NO_HAND'
                  ? 'bg-[#D8FF4F]'
                  : 'bg-[#B8A0FF]'
                : 'bg-[#655E68]'
            }`}
          />
          <h2 className="text-xs font-black text-[#17151B] tracking-wider uppercase">
            Gesture Sensor
          </h2>
          {cameraActive && (
            <span className="text-[10px] font-mono text-[#17151B] px-1.5 py-0.5 rounded bg-white border border-[#17151B]">
              {fps} FPS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded border border-[#17151B] text-xs transition-colors flex items-center gap-1 ${
              showSettings ? 'bg-[#D8FF4F] font-bold' : 'bg-white hover:bg-[#E9E0FF]'
            }`}
            title="Adjust Decision Layer Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Tuning</span>
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={onToggleCamera}
            className={`px-3 py-1 rounded text-xs font-bold transition-all border border-[#17151B] ${
              cameraActive
                ? 'bg-[#FF7048] text-[#17151B] hover:bg-[#ff5a2c]'
                : 'bg-[#D8FF4F] text-[#17151B] hover:bg-[#cbf53a]'
            }`}
          >
            {cameraActive ? 'Stop' : 'Start Camera'}
          </button>
        </div>
      </div>

      {/* Settings Drawer (Collapsible) */}
      {showSettings && (
        <div className="p-3 bg-[#FFF7E8] border-b-2 border-[#17151B] text-xs space-y-2.5">
          <div className="flex items-center justify-between font-bold text-[#17151B]">
            <span>Decision Layer Thresholds</span>
            <button
              onClick={() => {
                handleThresholdChange(0.80);
                handleStabilityFramesChange(7);
                handleStabilityDurationChange(0.35);
                controller.reset();
              }}
              className="text-[10px] text-[#17151B] underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <div className="flex justify-between text-[#17151B] mb-0.5 font-mono">
                <span>Confidence:</span>
                <strong>{confidenceThreshold.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.02"
                value={confidenceThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full accent-[#17151B] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#17151B] mb-0.5 font-mono">
                <span>Duration:</span>
                <strong>{stabilityDurationSec.toFixed(2)}s</strong>
              </div>
              <input
                type="range"
                min="0.15"
                max="1.00"
                step="0.05"
                value={stabilityDurationSec}
                onChange={(e) => handleStabilityDurationChange(parseFloat(e.target.value))}
                className="w-full accent-[#17151B] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#17151B] mb-0.5 font-mono">
                <span>Frames:</span>
                <strong>{stabilityFrames}</strong>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={stabilityFrames}
                onChange={(e) => handleStabilityFramesChange(parseInt(e.target.value))}
                className="w-full accent-[#17151B] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport & Overlay Canvas */}
      <div className="relative aspect-[4/3] bg-[#17151B] flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* In-Frame HUD Overlays */}
            <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
              {/* Detected Gesture Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFF7E8] border-2 border-[#17151B] text-[#17151B] text-xs font-black ink-shadow-sm">
                <span>{gestureDef.icon}</span>
                <span className="font-mono">{telemetry.gesture}</span>
              </div>

              {/* Confidence Score */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#17151B] text-[11px] font-mono font-bold text-[#17151B]">
                <span>Score:</span>
                <span className={telemetry.confidence >= confidenceThreshold ? 'text-[#17151B] bg-[#D8FF4F] px-1 rounded' : 'text-[#FF7048]'}>
                  {(telemetry.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-[#655E68] text-[10px]">
                  (min {(confidenceThreshold * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Top-Right Model Tag */}
            <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E9E0FF] border border-[#17151B] text-[#17151B]">
                <Layers className="w-3 h-3 text-[#17151B]" />
                {mediapipeLoaded ? 'MediaPipe + Kinematics' : 'Geometric Kinematics'}
              </span>
            </div>
          </>
        ) : (
          <div className="p-6 text-center space-y-3 z-10 max-w-sm text-white">
            <div className="w-12 h-12 rounded-lg bg-white border-2 border-[#17151B] mx-auto flex items-center justify-center text-[#17151B] ink-shadow">
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm">Webcam Paused</h3>
              <p className="text-xs text-slate-300 mt-1">
                Click "Start Camera" above, or use the manual fallback buttons below.
              </p>
            </div>
            <button
              onClick={onToggleCamera}
              className="px-4 py-1.5 rounded bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-extrabold text-xs ink-shadow transition-transform active:translate-y-0.5 cursor-pointer"
            >
              Start Camera Sensor
            </button>
          </div>
        )}

        {/* Temporal Stability Progress Bar (Bottom of Frame) */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-[#655E68]/50 z-20">
          <div
            className={`h-full transition-all duration-75 ${
              telemetry.state === 'LOCKED_HOLD' || telemetry.state === 'LOCKED'
                ? 'bg-[#FF7048]'
                : telemetry.state === 'EXECUTED' || telemetry.state === 'CONFIRMED'
                ? 'bg-[#D8FF4F]'
                : 'bg-[#B8A0FF]'
            }`}
            style={{ width: `${telemetry.stabilityPct}%` }}
          />
        </div>
      </div>

      {/* Lock Feedback Banner (Outside main tracking frame to avoid covering face/hand) */}
      {(telemetry.state === 'LOCKED_HOLD' || telemetry.state === 'LOCKED') && (
        <div className="bg-[#FF7048] border-b-2 border-[#17151B] p-2 text-[#17151B] text-xs flex items-center gap-2 font-bold animate-pulse">
          <Lock className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>One-Shot Locked: Action executed. Return hand to neutral to re-arm.</span>
        </div>
      )}

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-2.5 bg-[#FF7048]/20 border-b-2 border-[#17151B] text-[#17151B] text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF7048] shrink-0 mt-0.5 stroke-[2.5]" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Diagnostic & Telemetry Status */}
      <div className="p-3 bg-[#FFF7E8] border-b-2 border-[#17151B] space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#17151B]">State Machine:</span>
          <span className="font-mono font-extrabold px-1.5 py-0.5 rounded bg-white border border-[#17151B] text-[#17151B]">
            {telemetry.state}
          </span>
        </div>
        <p className="text-[11px] text-[#655E68] font-mono leading-tight">
          {telemetry.rejectionDetail || 'Monitoring camera feed for hand gestures...'}
        </p>
      </div>

      {/* Interactive Simulator / Faculty Testing Strip */}
      <div className="p-3 bg-white text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#17151B] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#B8A0FF]" />
            Gesture Simulator & Testing
          </span>
          <button
            onClick={() => controller.reset()}
            className="text-[10px] text-[#17151B] underline flex items-center gap-0.5 cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Reset FSM
          </button>
        </div>

        <p className="text-[11px] text-[#655E68]">
          Click to simulate holding pose for <strong className="text-[#17151B]">{stabilityFrames} frames</strong>:
        </p>

        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              'OPEN_PALM',
              'POINTING_UP',
              'POINTING_DOWN',
              'VICTORY',
              'THUMBS_UP',
              'CLOSED_FIST',
              'THUMBS_DOWN',
              'I_LOVE_YOU',
            ] as GestureClass[]
          ).map((g) => {
            const def = GESTURE_DEFINITIONS[g];
            return (
              <button
                key={g}
                onClick={() => sendSimulatedPose(g, 0.94, stabilityFrames)}
                className="p-1.5 rounded border border-[#17151B] bg-[#FFF7E8] hover:bg-[#D8FF4F] text-left transition-colors cursor-pointer text-[#17151B]"
                title={`Trigger ${g} (${def.action})`}
              >
                <div className="flex items-center gap-1 font-extrabold text-[11px]">
                  <span>{def.icon}</span>
                  <span className="truncate">{g.replace('_', ' ')}</span>
                </div>
                <div className="text-[9px] text-[#655E68] font-mono truncate">
                  ➔ {def.action}
                </div>
              </button>
            );
          })}
        </div>

        {/* Release to Neutral Button */}
        <button
          onClick={() => sendSimulatedPose('NO_HAND', 0.0, 3)}
          className="w-full mt-1 p-1.5 rounded border border-[#17151B] bg-[#E9E0FF] hover:bg-[#B8A0FF] font-black text-xs text-[#17151B] text-center cursor-pointer transition-colors"
          title="Release hand to neutral (re-arms controller)"
        >
          🚫 Release Hand to Neutral (Re-Arm Controller)
        </button>
      </div>
    </div>
  );
};
