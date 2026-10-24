# GestureGo Model Directory

This directory stores trained machine learning models, weights, and evaluation artifacts for GestureGo.

## Model Artifacts:
- `gesture_xgboost.joblib`: Serialized bundle containing:
  - `model`: Trained XGBoost / HistGradientBoosting multiclass classifier
  - `label_encoder`: Scikit-Learn LabelEncoder mapping class names to integer indices
  - `metadata`: Training parameters, feature names, test accuracy, macro F1-score, and confusion matrix
- `evaluation_metrics.json`: JSON summary of the most recent evaluation run for dashboard visualization.

## Training a Model:
Ensure `data/gesture_landmarks.csv` has samples for all target classes, then run:
```bash
python3 train_model.py --data data/gesture_landmarks.csv --output models/gesture_xgboost.joblib
```

## Fallback Behavior:
If `gesture_xgboost.joblib` is absent or unreadable, `gesture_classifier.py` automatically and transparently falls back to `MEDIAPIPE_BUILTIN` geometric kinematics. The system will clearly display the active backend in the UI.
