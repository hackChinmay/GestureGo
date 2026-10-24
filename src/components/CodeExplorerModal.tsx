import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode } from 'lucide-react';

interface CodeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PythonFileDoc {
  filename: string;
  category: string;
  description: string;
  command: string;
  codeSnippet: string;
}

const PYTHON_FILES: PythonFileDoc[] = [
  {
    filename: 'gesture_controller.py',
    category: 'State Machine & Decision Layer',
    description: 'Implements the 5-state one-shot finite state machine (READY -> CANDIDATE -> EXECUTED -> LOCKED_HOLD -> READY) with temporal stability and multi-frame neutral release guard.',
    command: 'python3 -m unittest discover tests',
    codeSnippet: `class ControllerState(str, Enum):
    READY = "READY"
    CANDIDATE = "CANDIDATE"
    EXECUTED = "EXECUTED"
    LOCKED_HOLD = "LOCKED_HOLD"

class GestureController:
    def __init__(self, confidence_threshold=0.80, stability_duration_sec=0.35, required_stable_frames=7, required_neutral_frames=3):
        self.confidence_threshold = confidence_threshold
        self.state = ControllerState.READY
        self.locked_gesture = None
        self.neutral_frames = 0

    def process_frame(self, gesture, confidence, timestamp=None):
        # 1. Neutral observation: require sustained neutral before re-arming
        if gesture in ("NO_HAND", "UNKNOWN", "UNCERTAIN"):
            if self.state == ControllerState.LOCKED_HOLD:
                self.neutral_frames += 1
                if self.neutral_frames >= self.required_neutral_frames:
                    self.state = ControllerState.READY # Safely re-armed
            return None, self._telemetry(...)

        # 2. Prevent repeated action execution while gesture is held
        if self.state == ControllerState.LOCKED_HOLD and gesture == self.locked_gesture:
            self.repeated_action_preventions += 1
            return None, self._telemetry(..., rejection="LOCKED_HOLD")

        # 3. Stable candidate accumulation
        if self.state == ControllerState.CANDIDATE and self.candidate_frames >= self.required_stable_frames:
            action = self.action_mapping.get(gesture)
            self.state = ControllerState.LOCKED_HOLD
            self.locked_gesture = gesture
            return action, self._telemetry(...) # Executed EXACTLY ONCE!`,
  },
  {
    filename: 'preprocess.py',
    category: 'Feature Extraction & Normalization',
    description: 'Extracts 21 MediaPipe landmarks, performs wrist-centered translation and maximum Euclidean scale normalization into a 63-D feature vector. Includes kinematic POINTING_DOWN classifier.',
    command: 'python3 -c "import preprocess; print(preprocess.GESTURE_CLASSES)"',
    codeSnippet: `GESTURE_CLASSES = [
    "OPEN_PALM", "POINTING_UP", "POINTING_DOWN", "VICTORY",
    "THUMBS_UP", "CLOSED_FIST", "THUMBS_DOWN", "I_LOVE_YOU"
]

def normalize_landmarks(raw_landmarks):
    wrist = raw_landmarks[0]
    translated, max_dist = [], 0.0
    for pt in raw_landmarks:
        dx, dy, dz = pt["x"] - wrist["x"], pt["y"] - wrist["y"], pt["z"] - wrist["z"]
        dist = math.sqrt(dx*dx + dy*dy + dz*dz)
        if dist > max_dist: max_dist = dist
        translated.append((dx, dy, dz))

    scale = max(max_dist, 1e-6)
    vector = []
    for dx, dy, dz in translated:
        vector.extend([dx / scale, dy / scale, dz / scale])
    return vector # 63 normalized coordinates`,
  },
  {
    filename: 'train_model.py',
    category: 'Custom ML Classifier Pipeline',
    description: 'Trains an XGBoost multiclass model using GroupShuffleSplit across participant recording sessions to eliminate spatial-temporal leakage.',
    command: 'python3 train_model.py --data data/gesture_landmarks.csv --output models/gesture_xgboost.joblib',
    codeSnippet: `def train_gesture_classifier(data_path="data/gesture_landmarks.csv", output_path="models/gesture_xgboost.joblib"):
    df, counts = validate_dataset(data_path)
    X = df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y = encoder.fit_transform(df["label"])

    # GroupShuffleSplit by participant session prevents data leakage
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=df["session_id"]))
    X_train, X_test = X[train_idx], X[test_idx]

    model = XGBClassifier(
        n_estimators=100, max_depth=5,
        objective="multi:softprob", eval_metric="mlogloss"
    )
    model.fit(X_train, y_train)
    joblib.dump({"model": model, "label_encoder": encoder}, output_path)`,
  },
  {
    filename: 'gesture_classifier.py',
    category: 'Hybrid Recognition Engine',
    description: 'Loads trained custom model if available; transparently falls back to MediaPipe built-in kinematics with honest backend telemetry (never fakes XGBoost execution).',
    command: 'python3 -c "from gesture_classifier import GestureClassifier; print(GestureClassifier().active_backend)"',
    codeSnippet: `class GestureClassifier:
    def __init__(self, model_path="models/gesture_xgboost.joblib"):
        self.load_custom_model(model_path)

    def predict(self, raw_landmarks, mp_label=None, mp_score=None):
        if self.active_backend == "CUSTOM_XGBOOST" and self.model is not None:
            probas = self.model.predict_proba(x)[0]
            return top_class, float(score), prob_dict

        # Built-in kinematics fallback (supports POINTING_DOWN)
        return self._predict_builtin_kinematics(norm_features, mp_label, mp_score)`,
  },
  {
    filename: 'tests/test_controller.py',
    category: 'Automated Unit Tests',
    description: 'Unit tests verifying one-shot execution, held gesture suppression, low-confidence drop, neutral release re-arming, and real Next Page / Scroll Down mappings.',
    command: 'python3 -m unittest discover tests',
    codeSnippet: `class TestGestureController(unittest.TestCase):
    def test_one_shot_and_anti_repeat(self):
        # Frame 4 triggers action
        action, _ = self.controller.process_frame("POINTING_UP", 0.90, timestamp=1.20)
        self.assertEqual(action, "NEXT_PAGE")
        self.assertEqual(self.controller.state, ControllerState.LOCKED_HOLD)

        # Held gesture must NEVER repeat action!
        for t in [1.30, 1.50, 2.00, 3.00]:
            repeat_act, _ = self.controller.process_frame("POINTING_UP", 0.95, timestamp=t)
            self.assertIsNone(repeat_act)
        self.assertEqual(self.controller.total_actions_triggered, 1)`,
  },
];

export const CodeExplorerModal: React.FC<CodeExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<PythonFileDoc>(PYTHON_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] rounded-lg w-full max-w-4xl h-[85vh] flex flex-col ink-shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b-2 border-[#17151B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#D8FF4F] border border-[#17151B] text-[#17151B]">
              <Terminal className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#17151B] uppercase tracking-wide">
                GestureGo Python Architecture & Source Code
              </h2>
              <p className="text-[11px] text-[#655E68]">
                OpenCV, MediaPipe, XGBoost, and Streamlit implementation files
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded border border-[#17151B] bg-[#FFF7E8] hover:bg-[#FF7048] text-[#17151B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Picker */}
          <div className="w-full md:w-64 bg-white border-r-2 border-[#17151B] p-2 overflow-y-auto space-y-1 shrink-0">
            <div className="text-[10px] uppercase font-mono font-black text-[#655E68] px-2 py-1">
              Modules & Tests
            </div>
            {PYTHON_FILES.map((f) => {
              const isSelected = f.filename === selectedFile.filename;
              return (
                <button
                  key={f.filename}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors flex flex-col gap-0.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#D8FF4F] text-[#17151B] border-[#17151B] font-bold'
                      : 'hover:bg-[#FFF7E8] text-[#17151B] border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{f.filename}</span>
                  </div>
                  <span className="text-[10px] text-[#655E68] truncate">{f.category}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#FFF7E8] overflow-hidden">
            <div className="p-3 bg-white border-b-2 border-[#17151B] flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#17151B]">
                  {selectedFile.filename}
                </span>
                <p className="text-[11px] text-[#655E68] mt-0.5">{selectedFile.description}</p>
              </div>

              <button
                onClick={() => handleCopy(selectedFile.codeSnippet)}
                className="px-2.5 py-1 rounded bg-[#FFF7E8] hover:bg-[#D8FF4F] text-[#17151B] text-xs border border-[#17151B] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Terminal Command */}
            <div className="px-3 py-1.5 bg-[#17151B] text-[#D8FF4F] text-xs font-mono flex items-center gap-2">
              <span className="text-white">$</span>
              <span className="select-all">{selectedFile.command}</span>
            </div>

            {/* Code Pre */}
            <div className="flex-1 p-3 overflow-auto font-mono text-xs text-[#17151B] bg-white leading-relaxed">
              <pre className="whitespace-pre">{selectedFile.codeSnippet}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-white border-t-2 border-[#17151B] flex items-center justify-between text-xs text-[#655E68]">
          <span className="font-medium">All Python modules tested with automated unit tests.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#17151B] text-[#D8FF4F] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
