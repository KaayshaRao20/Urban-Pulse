#!/usr/bin/env python3
"""
UrbanPulse YOLO Training & Export Pipeline
=========================================
Trains a YOLOv8 object detector on the unified 10-class UrbanPulse dataset
(Potholes, Road Cracks, Waste Segregation, and Standing Water) and exports
the weights to ONNX format for live web and edge inferencing.

Usage:
  python ml/train_yolo.py --epochs 50 --batch 16 --model yolov8n.pt
"""

import os
import sys
import argparse
from pathlib import Path

def train(data_yaml, model_name="yolov8n.pt", epochs=50, batch_size=16, img_size=416, device="cpu"):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] 'ultralytics' is not installed.")
        print("To install run: pip install ultralytics torch torchvision")
        sys.exit(1)

    print("=" * 65)
    print(" URBANPULSE VISION MODEL TRAINING PIPELINE")
    print(f" Dataset config : {data_yaml}")
    print(f" Base model     : {model_name}")
    print(f" Epochs         : {epochs}")
    print(f" Batch size     : {batch_size}")
    print(f" Image size     : {img_size}")
    print("=" * 65)

    model = YOLO(model_name)
    
    # Train model
    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        project="UrbanPulse_Models",
        name="urbanpulse_yolo_run",
        exist_ok=True,
        save=True,
        plots=True
    )
    
    print("\n>> Training complete! Running validation...")
    val_results = model.val()
    
    # Export to ONNX for production frontend/backend inference
    print("\n>> Exporting model to ONNX format...")
    onnx_path = model.export(format="onnx", imgsz=img_size, dynamic=True)
    print(f">> ONNX model saved at: {onnx_path}")
    print("=" * 65)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train UrbanPulse YOLO model")
    parser.add_argument("--data", type=str, default=str(Path(__file__).resolve().parent.parent / "dataset" / "urbanpulse_unified_yolo" / "data.yaml"))
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model (yolov8n.pt, yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=416)
    parser.add_argument("--device", type=str, default="cpu")
    
    args = parser.parse_args()
    train(args.data, args.model, args.epochs, args.batch, args.imgsz, args.device)
