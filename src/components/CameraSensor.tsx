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

// Landmark skeleton connections for 21 MediaPipe points
const HAND_CONNECTIONS: [number, number][] = [
  // Palm base
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17], // Palm bottom
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
        console.warn(
          'MediaPipe Wasm CDN init notice (operating on browser landmark fallback engine):',
          err
        );
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

  // Update controller settings when changed
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
            ? 'Camera permission denied. Allow camera access or use the manual controls / interactive simulator below.'
            : `Unable to access webcam (${err.message || 'Device in use'}). Manual navigation remains fully operational.`
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

  // Main Computer Vision Processing Loop
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

    // Set canvas dimensions to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate FPS
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

    // Path 1: Process with MediaPipe GestureRecognizer if loaded
    if (recognizerRef.current && video.currentTime > 0) {
      try {
        const results = recognizerRef.current.recognizeForVideo(video, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          const rawLm = results.landmarks[0] as Landmark3D[];
          landmarksToDraw = rawLm;

          // Check if MediaPipe recognized built-in gesture
          const mpGestures = results.gestures && results.gestures[0];
          let mpLabel = '';
          let mpScore = 0;
          if (mpGestures && mpGestures.length > 0) {
            mpLabel = mpGestures[0].categoryName;
            mpScore = mpGestures[0].score;
          }

          // Use geometric normalizer for consistent 7-class recognition
          try {
            const normFeatures = normalizeLandmarks3D(rawLm);
            const kinematic = classifyKinematicGesture(normFeatures);

            // Merge MediaPipe built-in with kinematic classification
            if (kinematic.gesture !== 'UNKNOWN') {
              detectedGesture = kinematic.gesture;
              detectedConfidence = kinematic.confidence;
            } else if (mpLabel) {
              const cleaned = mpLabel.toUpperCase().replace(/\s+/g, '_') as GestureClass;
              if (GESTURE_DEFINITIONS[cleaned]) {
                detectedGesture = cleaned;
                detectedConfidence = mpScore;
              } else {
                detectedGesture = 'UNKNOWN';
                detectedConfidence = 0.45;
              }
            } else {
              detectedGesture = 'UNKNOWN';
              detectedConfidence = 0.4;
            }
          } catch {
            detectedGesture = 'UNKNOWN';
            detectedConfidence = 0.4;
          }
        } else {
          detectedGesture = 'NO_HAND';
          detectedConfidence = 0.0;
        }
      } catch (e) {
        // Fallback frame handling
        detectedGesture = 'NO_HAND';
      }
    }

    // Draw hand skeleton on canvas overlay
    if (landmarksToDraw && landmarksToDraw.length === 21) {
      ctx.save();
      // Mirror canvas horizontally to match mirrored video
      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      // 1. Draw connections
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 3;
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

      // 2. Draw 21 landmarks
      for (let i = 0; i < landmarksToDraw.length; i++) {
        const p = landmarksToDraw[i];
        const px = p.x * width;
        const py = p.y * height;

        ctx.beginPath();
        ctx.arc(px, py, i === 0 ? 7 : 5, 0, 2 * Math.PI);
        if (i === 0) {
          // Wrist origin
          ctx.fillStyle = '#F59E0B';
          ctx.strokeStyle = '#FFFFFF';
        } else if ([4, 8, 12, 16, 20].includes(i)) {
          // Fingertips
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#0F172A';
        } else {
          ctx.fillStyle = '#14B8A6';
          ctx.strokeStyle = '#0F172A';
        }
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    // Step the controller state machine with this frame's results
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

  // Start processing loop when camera is active
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Header of Sensor Panel */}
      <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              cameraActive
                ? telemetry.gesture !== 'NO_HAND'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
                : 'bg-slate-600'
            }`}
          />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Computer Vision Sensor
          </h2>
          {cameraActive && (
            <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
              {fps} FPS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              showSettings
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Adjust Decision Layer Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Settings</span>
            {showSettings ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={onToggleCamera}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              cameraActive
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-teal-500 text-slate-950 border-teal-400 hover:bg-teal-400'
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop Sensor</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Drawer (Collapsible) */}
      {showSettings && (
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 text-xs space-y-3">
          <div className="flex items-center justify-between font-bold text-slate-300">
            <span>Decision Layer Thresholds</span>
            <button
              onClick={() => {
                handleThresholdChange(0.8);
                handleStabilityFramesChange(8);
                handleStabilityDurationChange(0.4);
                controller.reset();
              }}
              className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Confidence Threshold:</span>
                <span className="font-mono text-teal-400 font-bold">
                  {confidenceThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.02"
                value={confidenceThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Rejects predictions below this score
              </span>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Stability Duration:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {stabilityDurationSec.toFixed(2)}s
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="1.20"
                step="0.05"
                value={stabilityDurationSec}
                onChange={(e) =>
                  handleStabilityDurationChange(parseFloat(e.target.value))
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Minimum steady hold time required
              </span>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Consecutive Frames:</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {stabilityFrames}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={stabilityFrames}
                onChange={(e) => handleStabilityFramesChange(parseInt(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Temporal consistency check
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport & Overlay Canvas */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <>
            {/* Mirrored video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            {/* Landmark overlay canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* In-Frame HUD Overlays */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
              {/* Hand Status Tag */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold backdrop-blur-md shadow border ${
                  telemetry.gesture === 'NO_HAND'
                    ? 'bg-slate-900/80 text-slate-300 border-slate-700'
                    : telemetry.gesture === 'UNKNOWN'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                }`}
              >
                <span>{gestureDef.icon}</span>
                <span className="font-mono">{telemetry.gesture}</span>
              </div>

              {/* Confidence Meter Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono backdrop-blur-md bg-slate-900/80 border border-slate-700 text-slate-200">
                <span>Score:</span>
                <span
                  className={`font-bold ${
                    telemetry.confidence >= confidenceThreshold
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {(telemetry.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-slate-400">
                  (min {(confidenceThreshold * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Active Model Indicator HUD */}
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950/80 border border-slate-800 text-teal-300 backdrop-blur-sm">
                <Layers className="w-3 h-3 text-teal-400" />
                {mediapipeLoaded ? 'MediaPipe Tasks + Kinematics' : 'Geometric Kinematics'}
              </span>
            </div>

            {/* Locked Hold State Warning Banner */}
            {telemetry.state === 'LOCKED' && (
              <div className="absolute inset-x-4 bottom-14 z-20 bg-rose-950/90 border border-rose-500/60 text-rose-200 p-2.5 rounded-xl backdrop-blur-md flex items-center gap-2.5 shadow-lg animate-pulse">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="text-xs">
                  <strong className="block font-bold">One-Shot Locked</strong>
                  <span>Gesture executed. Release hand to neutral to re-arm.</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Camera Paused Placeholder */
          <div className="p-6 text-center space-y-3 z-10 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Webcam Sensor Paused</h3>
              <p className="text-xs text-slate-400 mt-1">
                Click "Start Camera" above to enable touchless gesture recognition, or test
                the state machine using the simulator controls below.
              </p>
            </div>
            <button
              onClick={onToggleCamera}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all inline-flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Sensor Feed</span>
            </button>
          </div>
        )}

        {/* Temporal Stability Progress Bar (Bottom of Frame) */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-slate-800/80 z-20 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              telemetry.state === 'LOCKED'
                ? 'bg-rose-500'
                : telemetry.state === 'CONFIRMED'
                ? 'bg-emerald-400'
                : 'bg-teal-400'
            }`}
            style={{ width: `${telemetry.stabilityPct}%` }}
          />
        </div>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-3 bg-rose-950/40 border-b border-rose-900/60 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Decision Telemetry & Explanations */}
      <div className="p-3 bg-slate-950/60 space-y-2 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Rejection Diagnostics:</span>
          <span
            className={`font-mono font-bold ${
              telemetry.rejectionReason === 'NONE'
                ? 'text-emerald-400'
                : telemetry.rejectionReason === 'LOCKED_HOLD'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {telemetry.rejectionReason}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
          {telemetry.rejectionDetail || 'Monitoring camera viewport for hand entry...'}
        </p>
      </div>

      {/* Interactive Simulator / Faculty Testing Strip */}
      <div className="p-3 bg-slate-900/90 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Interactive Gesture Simulator
          </span>
          <button
            onClick={() => controller.reset()}
            className="text-[10px] text-teal-400 hover:underline flex items-center gap-0.5"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Reset FSM
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Click any gesture to simulate holding it for{' '}
          <strong className="text-slate-200">{stabilityFrames} frames</strong> to test
          one-shot execution:
        </p>

        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              'OPEN_PALM',
              'POINTING_UP',
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
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-teal-500/50 text-left transition-all active:scale-95 group"
                title={`Trigger ${g} (${def.action})`}
              >
                <div className="flex items-center gap-1 font-bold text-[11px] text-slate-200 group-hover:text-teal-300">
                  <span>{def.icon}</span>
                  <span className="truncate">{g.replace('_', ' ')}</span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono truncate">
                  ➔ {def.action}
                </div>
              </button>
            );
          })}

          {/* Release to Neutral Button */}
          <button
            onClick={() => sendSimulatedPose('NO_HAND', 0.0, 1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/50 text-left transition-all active:scale-95 text-cyan-300"
            title="Release hand to neutral (re-arms controller)"
          >
            <div className="flex items-center gap-1 font-bold text-[11px]">
              <span>🚫</span>
              <span>RELEASE</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">Neutral Re-arm</div>
          </button>
        </div>
      </div>
    </div>
  );
};
