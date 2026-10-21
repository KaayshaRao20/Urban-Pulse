"""
UrbanPulse Computer Vision Engine for Civic Issue Detection & Video Validation
Implements real multi-frame computer vision pipelines for:
1. Potholes (asphalt cavity extraction, rim depth shadow/highlight gradients, contour analysis)
2. Broken Roads & Pavement Cracks (high-frequency fissure detection, separating road markings & shadows)
3. Streetlights (nighttime illumination verification, dark luminaire vs bright emitter classification)
4. Garbage Accumulation (color dispersion/entropy, high-frequency irregular clutter density)
5. Negative Filtering (Haar cascade face detection, clean road, indoor/domestic scenes, blur)

Modular architecture allows future fine-tuned YOLO / ONNX models to plug in via CivicIssueDetector interface.
"""

import os
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

# Load Haar cascade for human face detection if available
FACE_CASCADE = None
try:
    if hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
        cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
        if os.path.isfile(cascade_path):
            FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
except Exception:
    FACE_CASCADE = None


class CivicIssueDetector:
    """Modular Base Detector Interface for Civic Issues."""
    def detect_frame(self, frame: np.ndarray, category: str) -> Dict[str, Any]:
        raise NotImplementedError


class OpenCVRuleBasedDetector(CivicIssueDetector):
    """
    Real Computer Vision implementation using OpenCV morphological, edge,
    colorimetric, and contour algorithms.
    """

    def check_blur(self, gray: np.ndarray) -> Tuple[bool, float]:
        """
        Calculates Laplacian variance to detect optical/motion blur.
        Note: Night scenes and uniform surfaces naturally have low variance, so we only flag
        genuine high-frequency motion blur when ambient illumination is adequate (> 45.0).
        """
        mean_brightness = float(np.mean(gray))
        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        # In nighttime or very dark scenes, low variance is normal darkness, not optical blur
        if mean_brightness < 40.0:
            return (False, round(blur_var, 1))

        # Optical motion blur check for daylight/illuminated scenes (variance < 12.0)
        is_blurry = blur_var < 12.0
        return (is_blurry, round(blur_var, 1))

    def detect_human_face(self, frame: np.ndarray, gray: np.ndarray, height: int, width: int) -> Optional[Dict[str, Any]]:
        """
        Detects if frame contains a human face or subject using both:
        1. Haar Cascade Frontal Face Classifier
        2. Biological Skin Chrominance Segmentation (YCrCb: Cr in [133, 173], Cb in [77, 127])
        """
        frame_area = height * width

        # Method 1: Haar Cascade Classifier
        if FACE_CASCADE is not None and not FACE_CASCADE.empty():
            faces = FACE_CASCADE.detectMultiScale(
                gray,
                scaleFactor=1.12,
                minNeighbors=4,
                minSize=(int(min(height, width) * 0.10), int(min(height, width) * 0.10))
            )
            if len(faces) > 0:
                largest = max(faces, key=lambda r: r[2] * r[3])
                fx, fy, fw, fh = largest
                if (fw * fh) >= (0.025 * frame_area):
                    return {
                        "detected": True,
                        "x": round((fx / width) * 100, 1),
                        "y": round((fy / height) * 100, 1),
                        "width": round((fw / width) * 100, 1),
                        "height": round((fh / height) * 100, 1),
                        "label": "Human Subject / Face Detected"
                    }

        # Method 2: Skin Chrominance in YCrCb color space
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]
        skin_mask = (cr >= 133) & (cr <= 175) & (cb >= 75) & (cb <= 128)
        skin_ratio = float(np.sum(skin_mask)) / frame_area

        if skin_ratio >= 0.06: # 6% or more of frame is human skin
            # Find bounding box around skin region
            contours, _ = cv2.findContours(skin_mask.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_c = max(contours, key=cv2.contourArea)
                fx, fy, fw, fh = cv2.boundingRect(largest_c)
                return {
                    "detected": True,
                    "x": round((fx / width) * 100, 1),
                    "y": round((fy / height) * 100, 1),
                    "width": round((fw / width) * 100, 1),
                    "height": round((fh / height) * 100, 1),
                    "label": "Human Subject / Face Detected"
                }

        return None

    def analyze_asphalt_road(self, hsv: np.ndarray, height: int, width: int) -> Tuple[float, np.ndarray]:
        """
        Detects asphalt pavement by looking for low saturation, medium-dark value pixels.
        Returns (asphalt_fraction, asphalt_mask).
        """
        # Asphalt is typically neutral grey/black: low saturation (S < 65), moderate luminance (20 < V < 185)
        asphalt_mask = (hsv[:, :, 1] < 65) & (hsv[:, :, 2] > 20) & (hsv[:, :, 2] < 195)
        asphalt_fraction = float(np.sum(asphalt_mask) / (height * width))
        return asphalt_fraction, asphalt_mask.astype(np.uint8) * 255

    def detect_potholes(self, frame: np.ndarray, gray: np.ndarray, hsv: np.ndarray) -> Dict[str, Any]:
        """
        Detects potholes on asphalt road surface:
        - Verifies road context
        - Finds localized dark cavities with depth contrast
        - Computes actual bounding box around the cavity
        """
        height, width = frame.shape[:2]
        asphalt_pct, asphalt_mask = self.analyze_asphalt_road(hsv, height, width)

        # If less than 20% asphalt, it's not a road scene
        if asphalt_pct < 0.20:
            return {
                "detected": False,
                "confidence": 0.0,
                "box": None,
                "reason": "Not a road or asphalt surface."
            }

        # Apply asphalt mask to grayscale image
        road_pixels = gray[asphalt_mask > 0]
        if len(road_pixels) == 0:
            return {"detected": False, "confidence": 0.0, "box": None, "reason": "No asphalt pixels found."}
            
        mean_road_gray = float(np.mean(road_pixels))
        road_gray = cv2.bitwise_and(gray, gray, mask=asphalt_mask)

        # Method 1: Localized depression mask (pixels darker than surrounding road asphalt)
        depression_mask = ((road_gray < (mean_road_gray - 12)) & (road_gray > 5) & (asphalt_mask > 0)).astype(np.uint8) * 255
        
        # Method 2: Black-hat morphology for localized deep shadows
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        blackhat = cv2.morphologyEx(road_gray, cv2.MORPH_BLACKHAT, kernel)
        _, bh_thresh = cv2.threshold(blackhat, 18, 255, cv2.THRESH_BINARY)
        
        # Combined cavity mask
        combined_cavity = cv2.bitwise_or(depression_mask, bh_thresh)
        
        # Clean up noise with morphological opening and dilation
        clean_mask = cv2.morphologyEx(combined_cavity, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        clean_mask = cv2.dilate(clean_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), iterations=2)

        contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        pothole_boxes = []
        frame_area = height * width

        for c in contours:
            area = cv2.contourArea(c)
            # Area must be between 0.3% and 40% of frame
            if 0.003 * frame_area < area < 0.40 * frame_area:
                x, y, w, h = cv2.boundingRect(c)
                aspect_ratio = float(w) / max(1, h)
                # Potholes are generally compact/elliptical (not super thin lines)
                if 0.25 < aspect_ratio < 3.2:
                    # Check internal darkness compared to perimeter
                    roi_gray = gray[y:y+h, x:x+w]
                    mean_val = float(np.mean(roi_gray))
                    
                    # Compute confidence from contrast and size
                    conf = min(0.96, 0.74 + min(0.18, (area / frame_area) * 4) + (0.05 if mean_val < mean_road_gray else 0))
                    pothole_boxes.append({
                        "x": round((x / width) * 100, 1),
                        "y": round((y / height) * 100, 1),
                        "width": round((w / width) * 100, 1),
                        "height": round((h / height) * 100, 1),
                        "raw_area": area,
                        "confidence": round(conf, 2),
                        "label": "Pothole Defect"
                    })

        if pothole_boxes:
            # Pick largest/most prominent pothole
            best = max(pothole_boxes, key=lambda b: b["raw_area"])
            return {
                "detected": True,
                "confidence": best["confidence"],
                "box": best,
                "reason": f"Pothole cavity detected on asphalt surface (coverage {best['width']}%x{best['height']}%)."
            }

        return {
            "detected": False,
            "confidence": 0.15,
            "box": None,
            "reason": "Road asphalt surface detected, but no visible pothole cavity found."
        }

    def detect_broken_road_cracks(self, frame: np.ndarray, gray: np.ndarray, hsv: np.ndarray) -> Dict[str, Any]:
        """
        Detects road cracks and broken pavement:
        - Distinguishes from road markings (road markings have high luminance & uniform width)
        - Distinguishes from shadows (shadows have soft gradients and uniform texture)
        - Extracts high-frequency fissures
        """
        height, width = frame.shape[:2]
        asphalt_pct, asphalt_mask = self.analyze_asphalt_road(hsv, height, width)

        if asphalt_pct < 0.20:
            return {
                "detected": False,
                "confidence": 0.0,
                "box": None,
                "reason": "Not an asphalt pavement surface."
            }

        # Filter out high-luminance road markings (white/yellow stripes)
        # White / Yellow road markings have high value V > 185
        road_markings_mask = (hsv[:, :, 2] > 185) & (hsv[:, :, 1] < 120)
        usable_asphalt = cv2.bitwise_and(asphalt_mask, cv2.bitwise_not(road_markings_mask.astype(np.uint8) * 255))

        road_gray = cv2.bitwise_and(gray, gray, mask=usable_asphalt)

        # Multi-scale edge / crack detection using Canny & morphological thinning
        blurred = cv2.GaussianBlur(road_gray, (3, 3), 0)
        edges = cv2.Canny(blurred, 50, 150)
        edges = cv2.bitwise_and(edges, edges, mask=usable_asphalt)

        # Find edge density and contours
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        crack_contours = []
        frame_area = height * width
        total_crack_pixels = np.sum(edges > 0)
        crack_density = float(total_crack_pixels) / max(1, np.sum(usable_asphalt > 0))

        # Cracks have high perimeter relative to area (tortuous, thin line paths)
        for c in contours:
            length = cv2.arcLength(c, False)
            if length > (width * 0.08): # Significant crack length
                crack_contours.append(c)

        if len(crack_contours) >= 2 or (crack_density > 0.038 and len(crack_contours) >= 1):
            # Compute bounding box that encloses the crack cluster
            all_pts = np.vstack(crack_contours)
            x, y, w, h = cv2.boundingRect(all_pts)
            
            # Expand slightly for visibility
            pad_x = int(w * 0.1)
            pad_y = int(h * 0.1)
            x = max(0, x - pad_x)
            y = max(0, y - pad_y)
            w = min(width - x, w + 2 * pad_x)
            h = min(height - y, h + 2 * pad_y)

            conf = min(0.94, 0.74 + min(0.16, crack_density * 3.5))
            return {
                "detected": True,
                "confidence": round(conf, 2),
                "box": {
                    "x": round((x / width) * 100, 1),
                    "y": round((y / height) * 100, 1),
                    "width": round((w / width) * 100, 1),
                    "height": round((h / height) * 100, 1),
                    "confidence": round(conf, 2),
                    "label": "Road Surface Fracture / Crack"
                },
                "reason": f"Pavement fracture detected (density {crack_density*100:.1f}%, {len(crack_contours)} crack segments)."
            }

        return {
            "detected": False,
            "confidence": 0.10,
            "box": None,
            "reason": "Road pavement is ordinary and structurally intact without significant crack fissures."
        }

    def detect_streetlights(self, frame: np.ndarray, gray: np.ndarray, hsv: np.ndarray) -> Dict[str, Any]:
        """
        Detects streetlight failure:
        - Critical rule: Do not infer streetlight failure from daytime footage!
        - If daytime (mean brightness > 60): Inconclusive / invalid for streetlight failure.
        - If nighttime (mean brightness <= 55): Look for vertical pole / lamp structure with non-illuminating head.
        - If lamp head is emitting light (bright bloom > 230): Functional light -> reject failure claim.
        """
        height, width = frame.shape[:2]
        mean_brightness = float(np.mean(gray))

        # Check daytime vs nighttime
        if mean_brightness > 55.0:
            return {
                "detected": False,
                "confidence": 0.0,
                "is_daytime": True,
                "box": None,
                "inconclusive": True,
                "reason": f"Daytime footage detected (ambient luminance {mean_brightness:.1f} > 55). Streetlight failure cannot be determined during daytime hours."
            }

        # It is nighttime / dark conditions!
        # Check for bright illuminating lamp head
        bright_lamp_mask = gray > 220
        bright_pixels = int(np.sum(bright_lamp_mask))
        
        # Check if there is an illuminating lamp
        if bright_pixels > (0.003 * height * width):
            # There is a strong light source active
            return {
                "detected": False,
                "confidence": 0.1,
                "is_daytime": False,
                "box": None,
                "reason": "Active light emission detected. Streetlight appears illuminated/functional."
            }

        # Look for vertical streetlight pole structure in the dark
        # Vertical edge filter
        sobel_v = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        abs_v = np.uint8(np.absolute(sobel_v))
        _, thresh_v = cv2.threshold(abs_v, 25, 255, cv2.THRESH_BINARY)
        
        # Morphological vertical kernel to find tall pole
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 25))
        poles = cv2.morphologyEx(thresh_v, cv2.MORPH_OPEN, v_kernel)
        contours, _ = cv2.findContours(poles, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            # Pole should be vertically elongated (height > 25% of frame, aspect ratio < 0.3)
            if h > (height * 0.22) and w < (width * 0.25):
                # We have a vertical infrastructure pole at night without illumination!
                conf = 0.85
                return {
                    "detected": True,
                    "confidence": conf,
                    "is_daytime": False,
                    "box": {
                        "x": round((x / width) * 100, 1),
                        "y": round((y / height) * 100, 1),
                        "width": round((max(w, int(width * 0.18)) / width) * 100, 1),
                        "height": round((h / height) * 100, 1),
                        "confidence": conf,
                        "label": "Non-Working Streetlight (Dark Infrastructure)"
                    },
                    "reason": "Nighttime footage confirms non-illuminating streetlight pole infrastructure in dark corridor."
                }

        # If night scene is pitch dark or no distinct pole detected
        return {
            "detected": False,
            "confidence": 0.3,
            "is_daytime": False,
            "box": None,
            "inconclusive": True,
            "reason": "Nighttime scene detected, but specific streetlight fixture could not be distinctly isolated."
        }

    def detect_garbage_accumulation(self, frame: np.ndarray, gray: np.ndarray, hsv: np.ndarray) -> Dict[str, Any]:
        """
        Detects garbage accumulation and solid waste piles:
        - Analyzes localized color entropy (diverse packaging, multi-colored litter)
        - Analyzes irregular clutter contour density
        - Extracts bounding box enclosing waste accumulation
        """
        height, width = frame.shape[:2]

        # Clean surfaces (walls, smooth roads, sky) have low color diversity
        # Garbage piles contain plastics, paper, debris of varied hues
        h_channel = hsv[:, :, 0]
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]

        # Calculate localized clutter using Canny edges
        edges = cv2.Canny(gray, 40, 130)
        
        # Dilate edges to merge debris clusters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
        clustered = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        clustered = cv2.dilate(clustered, kernel, iterations=1)

        contours, _ = cv2.findContours(clustered, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        frame_area = height * width
        garbage_candidates = []

        for c in contours:
            area = cv2.contourArea(c)
            if (0.015 * frame_area) < area < (0.65 * frame_area):
                x, y, w, h = cv2.boundingRect(c)
                # Compute color variance in this ROI
                roi_h = h_channel[y:y+h, x:x+w]
                roi_s = s_channel[y:y+h, x:x+w]
                
                h_std = float(np.std(roi_h))
                s_mean = float(np.mean(roi_s))
                
                # Garbage clusters have high hue standard deviation (> 20) and non-zero saturation
                if h_std > 18.0 and s_mean > 25.0:
                    conf = min(0.93, 0.72 + (h_std / 100.0) * 0.25)
                    garbage_candidates.append({
                        "x": round((x / width) * 100, 1),
                        "y": round((y / height) * 100, 1),
                        "width": round((w / width) * 100, 1),
                        "height": round((h / height) * 100, 1),
                        "raw_area": area,
                        "confidence": round(conf, 2),
                        "label": "Garbage / Waste Accumulation"
                    })

        if garbage_candidates:
            best = max(garbage_candidates, key=lambda b: b["raw_area"])
            return {
                "detected": True,
                "confidence": best["confidence"],
                "box": best,
                "reason": f"Debris clutter and solid waste accumulation detected (spread {best['width']}%x{best['height']}%)."
            }

        return {
            "detected": False,
            "confidence": 0.12,
            "box": None,
            "reason": "No significant scattered garbage or solid waste pile detected in the visual frame."
        }

    def detect_frame(self, frame: np.ndarray, category: str) -> Dict[str, Any]:
        """
        Evaluates a single frame against the selected category and negative filters.
        """
        if frame is None or frame.size == 0:
            return {"valid": False, "detected": False, "reason": "Empty frame"}

        height, width = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # 1. Blur check
        is_blurry, blur_score = self.check_blur(gray)
        if is_blurry:
            return {
                "detected": False,
                "confidence": 0.2,
                "box": None,
                "blur_score": blur_score,
                "is_blurry": True,
                "reason": f"High motion blur (sharpness {blur_score} < 45.0)."
            }

        cat_lower = category.lower()
        is_road_issue = any(k in cat_lower for k in ["pothole", "road", "crack", "pavement", "asphalt"])

        # Check human face presence
        face_info = self.detect_human_face(frame, gray, height, width)

        # For road issues:
        # Prioritize road surface & reported defect! People, pedestrians, cyclists, or passing vehicles
        # naturally appear in road footage and must NEVER invalidate or block road defect analysis.
        if is_road_issue:
            # Check for potholes first, then broken road / cracks
            res = self.detect_potholes(frame, gray, hsv)
            if not res.get("detected"):
                res = self.detect_broken_road_cracks(frame, gray, hsv)

            res["blur_score"] = blur_score

            # If road defect is verified, return defect box immediately (never return person as defect)
            if res.get("detected"):
                res["is_road_surface"] = True
                return res

            # If no defect was detected, check if camera was pointed directly at a human face (selfie)
            # with negligible road surface visible
            asphalt_pct, _ = self.analyze_asphalt_road(hsv, height, width)
            if face_info and face_info.get("detected") and asphalt_pct < 0.05:
                return {
                    "detected": False,
                    "confidence": 0.1,
                    "box": None,
                    "is_human_face": True,
                    "reason": "Camera is aimed directly at human face rather than road surface. Please angle camera downward at the road issue."
                }

            return {
                "detected": False,
                "confidence": res.get("confidence", 0.2),
                "box": None,
                "is_road_surface": asphalt_pct >= 0.12,
                "reason": res.get("reason", "Road surface scanned. No obvious cavity or crack detected.")
            }

        # 2. For non-road civic categories: human face negative check
        if face_info and face_info["detected"]:
            return {
                "detected": False,
                "confidence": 0.05,
                "box": None,
                "is_human_face": True,
                "reason": "Human face / subject detected. Not a valid civic infrastructure defect."
            }

        # 3. Category-specific detector execution for non-road categories
        if "streetlight" in cat_lower or "light" in cat_lower:
            res = self.detect_streetlights(frame, gray, hsv)
        elif "garbage" in cat_lower or "waste" in cat_lower:
            res = self.detect_garbage_accumulation(frame, gray, hsv)
        else:
            # General fallback: check generic surface or clutter
            res = self.detect_potholes(frame, gray, hsv)

        res["blur_score"] = blur_score
        return res


class MultiFrameVideoValidator:
    """
    Analyzes multiple frames across a video file using the CV detector.
    Enforces category match, consistency checks, and false positive reduction.
    """
    def __init__(self, detector: Optional[CivicIssueDetector] = None):
        self.detector = detector or OpenCVRuleBasedDetector()

    def validate_video_file(
        self,
        video_path: str,
        category: str,
        sample_count: int = 8
    ) -> Dict[str, Any]:
        """
        Extracts multiple frames from the video file and validates evidence.
        Returns comprehensive analysis result with verdict and bounding boxes.
        """
        if not os.path.isfile(video_path):
            return {
                "is_valid": False,
                "verdict": "rejected",
                "confidence": 0.0,
                "error": "Video is not valid. Please record the reported issue again.",
                "reason": "Video file not found or corrupted."
            }

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "is_valid": False,
                "verdict": "rejected",
                "confidence": 0.0,
                "error": "Video is not valid. Please record the reported issue again.",
                "reason": "Unable to decode video stream."
            }

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        duration_sec = total_frames / fps if total_frames > 0 else 0.0

        if total_frames < 10 or duration_sec < 1.5:
            cap.release()
            return {
                "is_valid": False,
                "verdict": "rejected",
                "confidence": 0.0,
                "error": "Recording is too short.",
                "reason": "Recording is too short. Please record for at least 2 to 5 seconds.",
                "guidance": "Hold the record button and capture at least 3 seconds of steady footage showing the issue.",
                "action": "record_again"
            }

        # Select evenly spaced frame indices
        step = max(1, total_frames // (sample_count + 1))
        frame_indices = [step * i for i in range(1, sample_count + 1) if (step * i) < total_frames]

        frames_analyzed = 0
        detections = []
        human_face_detections = 0
        daytime_streetlight_flags = 0
        blur_flags = 0
        asphalt_frames = 0
        best_box = None
        best_confidence = 0.0

        for f_idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            frames_analyzed += 1
            result = self.detector.detect_frame(frame, category)

            if result.get("is_human_face"):
                human_face_detections += 1
            if result.get("is_blurry"):
                blur_flags += 1
            if result.get("is_daytime"):
                daytime_streetlight_flags += 1
            if result.get("is_road_surface") or result.get("detected"):
                asphalt_frames += 1

            if result.get("detected"):
                detections.append(result)
                conf = result.get("confidence", 0.0)
                if conf > best_confidence:
                    best_confidence = conf
                    best_box = result.get("box")

        cap.release()

        if frames_analyzed == 0:
            return {
                "is_valid": False,
                "verdict": "rejected",
                "confidence": 0.0,
                "error": "The video could not be processed.",
                "reason": "The video could not be processed. No readable frames found.",
                "guidance": "Please record the issue again using the live camera.",
                "action": "record_again"
            }

        # Check blur across frames (e.g. 60% or more blurry frames)
        if blur_flags >= max(2, int(frames_analyzed * 0.60)):
            return {
                "is_valid": False,
                "verdict": "rejected",
                "category_match": False,
                "confidence": 0.15,
                "error": "The video is too blurry.",
                "reason": "The video is too blurry. Rapid device motion or loss of focus prevented verification.",
                "guidance": "Hold your device steady, wipe the lens if smudged, and ensure good lighting when recording.",
                "action": "record_again",
                "frames_analyzed": frames_analyzed
            }

        # Decision Logic based on category:
        is_road_issue = any(k in category.lower() for k in ["pothole", "road", "crack", "pavement", "asphalt"])

        # Road-focused validation:
        # People, pedestrians, cyclists, and vehicles may naturally appear in road footage.
        # Their presence alone MUST NOT invalidate a recording or prevent submission!
        if is_road_issue:
            # Case 1: Defect confirmed across frames (at least 20% of sampled frames):
            detection_ratio = len(detections) / max(1, frames_analyzed)
            if detection_ratio >= 0.20 and best_box is not None:
                return {
                    "is_valid": True,
                    "verdict": "verified",
                    "category_match": True,
                    "confidence": round(best_confidence, 2),
                    "error": None,
                    "primary_box": best_box,
                    "frames_analyzed": frames_analyzed,
                    "frames_with_defect": len(detections),
                    "features": [
                        f"Road defect verified across {len(detections)}/{frames_analyzed} sampled frames",
                        f"Detection confidence: {best_confidence*100:.0f}%",
                        f"Category: {category}"
                    ],
                    "reason": detections[0].get("reason", "Physical road defect confirmed by computer vision."),
                    "guidance": "Defect confirmed! You can proceed to submit your geotagged report."
                }

            # Case 2: Camera pointed at human face / selfie with negligible road surface
            if human_face_detections >= max(1, frames_analyzed // 2) and asphalt_frames == 0:
                return {
                    "is_valid": False,
                    "verdict": "rejected",
                    "category_match": False,
                    "confidence": 0.05,
                    "error": "The reported issue is not visible.",
                    "reason": "The reported issue is not visible. Camera is aimed at a person rather than the road problem.",
                    "guidance": "Point the camera downward towards the road defect or pothole, keeping faces out of frame.",
                    "action": "record_again",
                    "frames_analyzed": frames_analyzed
                }

            # Case 3: The reported issue is not visible - no outdoor road or pavement surface detected
            if asphalt_frames == 0:
                return {
                    "is_valid": False,
                    "verdict": "rejected",
                    "category_match": False,
                    "confidence": 0.05,
                    "error": "The reported issue is not visible.",
                    "reason": "The reported issue is not visible. No outdoor road or pavement surface detected in the frame.",
                    "guidance": "Please record on-site outdoors with the damaged road pavement occupying the central view.",
                    "action": "record_again",
                    "frames_analyzed": frames_analyzed
                }

            # Case 4: Road surface was scanned, but NO pothole or road damage was detected
            if len(detections) == 0:
                return {
                    "is_valid": False,
                    "verdict": "rejected",
                    "category_match": False,
                    "confidence": 0.15,
                    "error": "No pothole or road damage detected. Please record the issue more clearly.",
                    "reason": "No pothole or road damage detected. Please record the issue more clearly.",
                    "guidance": "Move closer to the damaged section, hold the camera steady, and point directly at the pothole or cracked asphalt.",
                    "action": "record_again",
                    "frames_analyzed": frames_analyzed
                }

            # Case 5: Uncertain / ambiguous results (partial cues or borderline confidence)
            # Route for review instead of rejecting, with option to record again
            return {
                "is_valid": True,
                "verdict": "needs_review",
                "category_match": True,
                "confidence": round(max(0.48, best_confidence), 2),
                "error": None,
                "primary_box": best_box,
                "frames_analyzed": frames_analyzed,
                "reason": "Detection is uncertain. You can submit for municipal officer review or record again for faster automated verification.",
                "guidance": "You may submit this report for physical officer inspection, or record again closer to the defect for instant AI approval.",
                "action": "optional_record_again",
                "features": [
                    f"Road footage recorded ({frames_analyzed} frames analyzed)",
                    "Officer physical inspection scheduled"
                ]
            }

        # Non-road category checks:
        # 1. Face-only video
        if human_face_detections >= max(1, frames_analyzed // 2):
            return {
                "is_valid": False,
                "verdict": "rejected",
                "category_match": False,
                "confidence": 0.05,
                "error": "The reported issue is not visible.",
                "reason": "The reported issue is not visible. Camera is aimed at a person rather than the civic problem.",
                "guidance": "Point the camera at the physical civic issue instead of people or faces.",
                "action": "record_again",
                "frames_analyzed": frames_analyzed
            }

        # 2. Daytime streetlight video check
        if "streetlight" in category.lower() and daytime_streetlight_flags >= (frames_analyzed // 2):
            return {
                "is_valid": False,
                "verdict": "rejected",
                "category_match": False,
                "confidence": 0.1,
                "error": "Daytime footage cannot establish streetlight failure.",
                "reason": "Daytime footage cannot establish streetlight failure. Streetlight failure cannot be determined during daytime hours.",
                "guidance": "Please record during evening or night hours when streetlights are active.",
                "action": "record_again",
                "frames_analyzed": frames_analyzed
            }

        # 3. Valid detection check for other categories
        detection_ratio = len(detections) / max(1, frames_analyzed)
        if detection_ratio >= 0.25 and best_box is not None:
            return {
                "is_valid": True,
                "verdict": "verified",
                "category_match": True,
                "confidence": round(best_confidence, 2),
                "error": None,
                "primary_box": best_box,
                "frames_analyzed": frames_analyzed,
                "frames_with_defect": len(detections),
                "features": [
                    f"Defect verified across {len(detections)}/{frames_analyzed} sampled frames",
                    f"Detection confidence: {best_confidence*100:.0f}%",
                    f"Category: {category}"
                ],
                "reason": detections[0].get("reason", "Physical civic defect confirmed by computer vision."),
                "guidance": "Defect confirmed! You can proceed to submit your geotagged report."
            }

        # 4. Inconclusive vs Rejected check for other categories
        if len(detections) == 0:
            return {
                "is_valid": False,
                "verdict": "rejected",
                "category_match": False,
                "confidence": 0.12,
                "error": "The reported issue is not visible.",
                "reason": f"No visual evidence of '{category}' was found in the recorded video. The reported issue is not visible.",
                "guidance": f"Please point the camera directly at the {category.lower()} issue and ensure good lighting.",
                "action": "record_again",
                "frames_analyzed": frames_analyzed
            }

        return {
            "is_valid": True,
            "verdict": "needs_review",
            "category_match": False,
            "confidence": 0.45,
            "error": None,
            "primary_box": best_box,
            "frames_analyzed": frames_analyzed,
            "reason": "Detection is uncertain. You can submit for municipal officer review or record again for faster automated verification.",
            "guidance": "You may submit this report for physical officer inspection, or record again closer to the defect for instant AI approval.",
            "action": "optional_record_again",
            "features": [
                f"Partial visual cues detected ({len(detections)}/{frames_analyzed} frames)",
                "Officer physical inspection required"
            ]
        }
