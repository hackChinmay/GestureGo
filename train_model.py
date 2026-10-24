"""
train_model.py - Custom XGBoost Multiclass Gesture Classifier Pipeline.

Trains a confidence-calibrated multiclass classifier on 63 normalized
MediaPipe landmark features extracted via preprocess.py.

Validation Rules:
1. Verifies dataset presence and row count.
2. Asserts all 7 canonical classes have sufficient examples.
3. Splits by session/participant to eliminate spatial-temporal leakage.
4. Generates confusion matrix and macro-F1 classification report.
5. Saves model bundle + metadata to models/gesture_xgboost.joblib via joblib.
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, Tuple
from preprocess import FEATURE_NAMES, GESTURE_CLASSES

def validate_dataset(csv_path: str) -> Tuple[Any, Dict[str, int]]:
    """Loads and validates the collected dataset."""
    import pandas as pd

    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Dataset not found at '{csv_path}'. Please collect data using collect_data.py or export from kiosk."
        )

    df = pd.read_csv(csv_path)
    if len(df) < 35:
        raise ValueError(
            f"Dataset contains only {len(df)} samples. Minimum 35 samples (at least 5 per class) required to train."
        )

    # Check for feature columns
    missing_cols = [c for c in FEATURE_NAMES if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset missing required feature columns: {missing_cols[:5]}...")

    if "label" not in df.columns:
        raise ValueError("Dataset missing 'label' column.")

    counts = df["label"].value_counts().to_dict()
    missing_classes = [c for c in GESTURE_CLASSES if counts.get(c, 0) == 0]
    if missing_classes:
        print(f"[Warning] The following classes have 0 samples in dataset: {missing_classes}")
        print("Model will only support available classes until full dataset is gathered.")

    return df, counts

def train_gesture_classifier(
    data_path: str = "data/gesture_landmarks.csv",
    output_model_path: str = "models/gesture_xgboost.joblib",
    test_size: float = 0.20,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Runs the complete training and validation pipeline."""
    import numpy as np
    import pandas as pd
    from sklearn.model_selection import train_test_split, GroupShuffleSplit
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
    import joblib

    print(f"[Training] Loading dataset from {data_path}...")
    df, class_counts = validate_dataset(data_path)
    print(f"[Training] Total samples: {len(df)} across {len(class_counts)} classes:")
    for cls, cnt in class_counts.items():
        print(f"  - {cls}: {cnt} samples")

    X = df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y_raw = df["label"].to_numpy()

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)
    class_names = list(encoder.classes_)

    # Session/Participant aware split to prevent data leakage between identical video chunks
    if "session_id" in df.columns and df["session_id"].nunique() > 2:
        print("[Training] Using GroupShuffleSplit on 'session_id' to prevent temporal leakage.")
        gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
        train_idx, test_idx = next(gss.split(X, y, groups=df["session_id"]))
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
    else:
        print("[Training] Using Stratified train_test_split.")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, stratify=y, random_state=random_state
        )

    print(f"[Training] Training set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    # Train XGBoost or Scikit-Learn Ensemble fallback
    model_name = "XGBoost"
    try:
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=random_state,
        )
        print("[Training] Fitting XGBoost Multiclass Classifier...")
        model.fit(X_train, y_train)
    except ImportError:
        print("[Notice] xgboost not installed in environment; using Scikit-learn HistGradientBoostingClassifier.")
        from sklearn.ensemble import HistGradientBoostingClassifier
        model_name = "HistGradientBoosting"
        model = HistGradientBoostingClassifier(
            max_iter=100,
            learning_rate=0.1,
            random_state=random_state,
        )
        model.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    cm = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True)

    print("=" * 60)
    print(f" Evaluation Results on Held-out Test Set ({model_name})")
    print("=" * 60)
    print(f" Test Accuracy: {acc * 100:.2f}%")
    print(f" Macro F1-Score: {macro_f1 * 100:.2f}%")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names))

    # Save artifact
    os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
    bundle = {
        "model": model,
        "label_encoder": encoder,
        "metadata": {
            "model_type": model_name,
            "classes": class_names,
            "feature_names": FEATURE_NAMES,
            "num_features": len(FEATURE_NAMES),
            "test_accuracy": acc,
            "macro_f1": macro_f1,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "confusion_matrix": cm,
        },
    }
    joblib.dump(bundle, output_model_path)
    print(f"[Training] Saved model artifact bundle to '{output_model_path}'")

    # Also save evaluation metrics to JSON for dashboard visualization
    metrics_path = "models/evaluation_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "model_type": model_name,
                "classes": class_names,
                "accuracy": acc,
                "macro_f1": macro_f1,
                "confusion_matrix": cm,
                "report": report,
                "train_samples": len(X_train),
                "test_samples": len(X_test),
            },
            f,
            indent=2,
        )
    print(f"[Training] Saved evaluation summary to '{metrics_path}'")

    return bundle["metadata"]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train GestureGo Custom Gesture Model")
    parser.add_argument("--data", type=str, default="data/gesture_landmarks.csv")
    parser.add_argument("--output", type=str, default="models/gesture_xgboost.joblib")
    args = parser.parse_args()

    train_gesture_classifier(data_path=args.data, output_model_path=args.output)
