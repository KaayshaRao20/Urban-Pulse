"""
Test script for verifying YOLOv8CivicDetector and MultiFrameVideoValidator across
diverse civic defect videos:
1. Pothole video
2. Huge Garbage Dump video
3. Waterlogging / Stagnant Water video
4. Existing citizen uploaded videos
5. Negative/Control test (irrelevant indoor footage)
"""
import os
import sys
import cv2
import numpy as np

# Add project root and backend to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, "backend"))
sys.path.insert(0, os.path.join(root_dir, "backend", "app"))

from app.vision_detector import YOLOv8CivicDetector, MultiFrameVideoValidator

def make_video_from_images(image_paths, output_video_path, fps=10, duration_sec=3):
    total_frames = fps * duration_sec
    images = [cv2.imread(p) for p in image_paths if os.path.isfile(p)]
    if not images:
        raise ValueError(f"No valid images found for {image_paths}")
    
    # Standardize image size
    target_w, target_h = 640, 480
    resized_images = [cv2.resize(img, (target_w, target_h)) for img in images]
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (target_w, target_h))
    
    for i in range(total_frames):
        # Smoothly cycle or jitter slightly between images to simulate real camera motion
        base_img = resized_images[(i // (total_frames // len(resized_images))) % len(resized_images)].copy()
        # Add slight pan/crop jitter
        dx = int(np.sin(i * 0.2) * 5)
        dy = int(np.cos(i * 0.2) * 5)
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        jittered = cv2.warpAffine(base_img, M, (target_w, target_h), borderMode=cv2.BORDER_REFLECT)
        out.write(jittered)
        
    out.release()
    print(f"[OK] Generated {output_video_path} ({total_frames} frames, {duration_sec}s)")

def main():
    print("=" * 70)
    print("URBANPULSE MULTI-CATEGORY YOLOv8 VIDEO VERIFICATION TEST")
    print("=" * 70)

    # 1. Initialize Detector & Multi-Frame Validator
    detector = YOLOv8CivicDetector()
    print(f"Loaded weights from: {detector.weights_path}")
    print(f"YOLO Model ready: {detector.model is not None}")
    if detector.model:
        print(f"Model Class Names: {detector.model.names}")
    
    validator = MultiFrameVideoValidator(detector=detector)
    
    test_video_dir = os.path.join(root_dir, "ml", "test_videos")
    os.makedirs(test_video_dir, exist_ok=True)
    
    # 2. Collect sample images for video creation
    dataset_test_dir = os.path.join(root_dir, "dataset", "urbanpulse_unified_yolo", "images", "test")
    all_test_imgs = os.listdir(dataset_test_dir) if os.path.isdir(dataset_test_dir) else []
    
    pothole_imgs = [os.path.join(dataset_test_dir, f) for f in all_test_imgs if "road_damage" in f][:6]
    garbage_imgs = [os.path.join(dataset_test_dir, f) for f in all_test_imgs if "trash_materials" in f][:6]
    water_imgs = [os.path.join(dataset_test_dir, f) for f in all_test_imgs if "standing_water" in f][:6]
    
    test_cases = []
    
    # Generate Pothole video
    if pothole_imgs:
        pothole_vid = os.path.join(test_video_dir, "test_pothole_road.mp4")
        make_video_from_images(pothole_imgs, pothole_vid, duration_sec=3)
        test_cases.append(("Pothole Road Video", pothole_vid, "pothole"))
        
    # Generate Garbage Dump video
    if garbage_imgs:
        garbage_vid = os.path.join(test_video_dir, "test_garbage_dump.mp4")
        make_video_from_images(garbage_imgs, garbage_vid, duration_sec=3)
        test_cases.append(("Large Garbage Dump Video", garbage_vid, "garbage"))
        
    # Generate Waterlogging video
    if water_imgs:
        water_vid = os.path.join(test_video_dir, "test_waterlogging.mp4")
        make_video_from_images(water_imgs, water_vid, duration_sec=3)
        test_cases.append(("Stagnant Waterlogging Video", water_vid, "waterlogging"))
        
    # Generate Irrelevant Negative video (synthetic plain gray wall)
    blank_vid = os.path.join(test_video_dir, "test_negative_blank.mp4")
    target_w, target_h = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(blank_vid, fourcc, 10, (target_w, target_h))
    for i in range(30):
        # Indoor uniform blank wall with subtle gradient
        frame = np.full((target_h, target_w, 3), 180 + (i % 5), dtype=np.uint8)
        out.write(frame)
    out.release()
    test_cases.append(("Negative Control (Blank Wall Video)", blank_vid, "pothole"))
    
    # Include Existing Citizen Grievance MP4s
    existing_dir = os.path.join(root_dir, "backend", "uploads", "grievances")
    if os.path.isdir(existing_dir):
        for f in os.listdir(existing_dir):
            if f.endswith(".mp4"):
                test_cases.append((f"Uploaded Citizen Video ({f[:8]}...)", os.path.join(existing_dir, f), "pothole"))

    # 3. Execute Multi-Frame Validation on each video
    print("\n" + "=" * 70)
    print("RUNNING MULTI-FRAME INFERENCE PIPELINE")
    print("=" * 70)
    
    results_summary = []
    
    for label, video_path, category in test_cases:
        print(f"\n--- Testing: {label} ---")
        print(f"Path: {video_path}")
        print(f"Category: {category}")
        
        res = validator.validate_video_file(video_path, category=category, sample_count=6)
        
        is_valid = res.get("is_valid")
        verdict = res.get("verdict")
        confidence = res.get("confidence", 0.0)
        frames_analyzed = res.get("frames_analyzed", 0)
        frames_defect = res.get("frames_with_defect", 0)
        box = res.get("primary_box")
        reason = res.get("reason", "")
        engine = res.get("detector", "unknown")
        
        print(f"Verdict: {verdict.upper()} (is_valid={is_valid})")
        print(f"Confidence: {confidence * 100:.1f}%")
        print(f"Sampling: {frames_defect}/{frames_analyzed} frames with detected defect")
        print(f"Detector Engine: {engine}")
        if box:
            print(f"Primary Bounding Box: {box.get('label')} at x={box.get('x')}%, y={box.get('y')}%, w={box.get('width')}%, h={box.get('height')}%")
        print(f"Reason: {reason}")
        
        results_summary.append({
            "label": label,
            "category": category,
            "verdict": verdict,
            "is_valid": is_valid,
            "confidence": confidence,
            "box": box.get("label") if box else "None",
            "defect_ratio": f"{frames_defect}/{frames_analyzed}"
        })
        
    print("\n" + "=" * 70)
    print("SUMMARY MATRIX OF ALL VIDEO DETECTIONS")
    print("=" * 70)
    print(f"{'Video Test Case':<36} | {'Cat':<12} | {'Verdict':<10} | {'Conf':<6} | {'Box Detected':<22}")
    print("-" * 95)
    for r in results_summary:
        print(f"{r['label']:<36} | {r['category']:<12} | {r['verdict']:<10} | {r['confidence']*100:>5.1f}% | {str(r['box']):<22}")
    print("=" * 70)

if __name__ == "__main__":
    main()
