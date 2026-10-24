"""
evaluate_model.py - Formal Model Evaluation and Latency Benchmarking.

Evaluates trained model weights against a labelled test split or fresh evaluation dataset.
Produces honest, reproducible metrics:
- Accuracy
- Macro F1-score
- Confusion matrix
- Mean and Median inference latency (ms per frame)
"""

import os
import sys
import time
import json
import argparse
from typing import Dict, Any, Optional
from preprocess import FEATURE_NAMES, GESTURE_CLASSES

def evaluate_model(
    model_path: str = "models/gesture_xgboost.joblib",
    test_csv_path: str = "data/gesture_landmarks.csv",
) -> Dict[str, Any]:
    """Evaluates the model on test data with latency profiling."""
    if not os.path.exists(model_path):
        print(f"[Evaluation] Status: Not evaluated yet.")
        print(f"Model file '{model_path}' does not exist. Train the model first via: python3 train_model.py")
        return {"status": "not_evaluated", "reason": "model_missing"}

    if not os.path.exists(test_csv_path):
        print(f"[Evaluation] Status: Not evaluated yet.")
        print(f"Evaluation dataset '{test_csv_path}' not found.")
        return {"status": "not_evaluated", "reason": "data_missing"}

    try:
        import joblib
        import numpy as np
        import pandas as pd
        from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report
    except ImportError as e:
        print(f"[Error] Required libraries missing: {e}")
        return {"status": "error", "error": str(e)}

    # Load bundle
    bundle = joblib.load(model_path)
    model = bundle["model"] if isinstance(bundle, dict) and "model" in bundle else bundle
    encoder = bundle.get("label_encoder") if isinstance(bundle, dict) else None

    # Load dataset
    df = pd.read_csv(test_csv_path)
    X = df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y_raw = df["label"].to_numpy()

    if encoder is not None:
        y_true = encoder.transform(y_raw)
        classes = list(encoder.classes_)
    else:
        y_true = y_raw
        classes = getattr(model, "classes_", GESTURE_CLASSES)

    # Benchmark latency across samples
    latencies_ms = []
    y_pred = []

    for i in range(len(X)):
        sample = X[i : i + 1]
        t0 = time.perf_counter()
        pred = model.predict(sample)[0]
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)
        y_pred.append(pred)

    y_pred = np.array(y_pred)
    acc = float(accuracy_score(y_true, y_pred))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro"))
    cm = confusion_matrix(y_true, y_pred).tolist()
    mean_latency = float(np.mean(latencies_ms))
    median_latency = float(np.median(latencies_ms))

    results = {
        "status": "evaluated",
        "model_path": model_path,
        "dataset_path": test_csv_path,
        "total_test_samples": len(X),
        "classes": [str(c) for c in classes],
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "mean_latency_ms": round(mean_latency, 3),
        "median_latency_ms": round(median_latency, 3),
        "confusion_matrix": cm,
    }

    print("=" * 60)
    print(" GestureGo Model Evaluation Report")
    print("=" * 60)
    print(f"Total Test Samples: {len(X)}")
    print(f"Accuracy:           {acc * 100:.2f}%")
    print(f"Macro F1-Score:     {macro_f1 * 100:.2f}%")
    print(f"Mean Latency:       {mean_latency:.3f} ms / frame")
    print(f"Median Latency:     {median_latency:.3f} ms / frame")
    print("\nConfusion Matrix:")
    for row, cls in zip(cm, classes):
        print(f"  {cls:<14}: {row}")

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate GestureGo Model")
    parser.add_argument("--model", type=str, default="models/gesture_xgboost.joblib")
    parser.add_argument("--test-data", type=str, default="data/gesture_landmarks.csv")
    args = parser.parse_args()

    evaluate_model(model_path=args.model, test_csv_path=args.test_data)
