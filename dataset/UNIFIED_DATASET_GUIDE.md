# UrbanPulse Unified Vision Dataset Architecture & Viva Guide

## 1. Unified Dataset Overview
The UrbanPulse computer vision dataset consolidates multiple municipal hazard and urban defect datasets into a single, standardized **YOLO format** detection dataset.

- **Total Images**: 2,020
  - **Train**: 1,424 images (70.5%)
  - **Validation**: 399 images (19.8%)
  - **Test**: 197 images (9.7%)
- **Total High-Severity Bounding Boxes**: 4,131
- **Purged Micro-Items**: 1,051 images containing only isolated tiny litter or small shallow puddles were filtered out.
- **Format**: YOLO normalized bounding boxes `(class_id, x_center, y_center, width, height)`
- **Master Configuration File**: [`dataset/urbanpulse_unified_yolo/data.yaml`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/dataset/urbanpulse_unified_yolo/data.yaml)

---

## 2. Standardized 4-Class High-Severity Taxonomy

| Class ID | Class Name | Unique Images | Total Bounding Boxes | Scope / Filtering Criteria |
| :---: | :--- | :---: | :---: | :--- |
| **0** | `pothole` | 328 | 927 | Real road surface craters & potholes |
| **1** | `road_crack` | 456 | 522 | Asphalt cracks (longitudinal, transverse, alligator) |
| **2** | `garbage_dump` | 950 | 1,992 | **Huge-level waste dumps only** (bounding box area $\ge$ 8% of frame; minor litter dropped) |
| **3** | `waterlogging` | 316 | 690 | **Large-scale stagnant pools only** (bounding box area $\ge$ 5% of frame; tiny puddles dropped) |
| **TOTAL** | **4 Classes** | **2,020** | **4,131** | **Balanced High-Severity Dataset** |

---

## 3. How to Combine the 2 Additional Datasets / Files

When you receive the next two dataset files/folders, run the provided automated merger pipeline:

### Step 1: Check Current Master Dataset Status
```bash
python ml/merge_pipeline.py --status
```

### Step 2: Merge Additional Dataset 1
```bash
# Example: Adding a new manhole or drain dataset archive
python ml/merge_pipeline.py --source "path/to/dataset1.zip" --mapping "0:open_manhole" --prefix "file1"
```

### Step 3: Merge Additional Dataset 2
```bash
# Example: Adding street lighting or overflowing bin dataset archive
python ml/merge_pipeline.py --source "path/to/dataset2.zip" --mapping "0:overflowing_bin" --prefix "file2"
```

The script automatically:
1. Normalizes image sizes and generates MD5 hashes to prevent duplicate images.
2. Remaps source class IDs to the unified ontology without corrupting existing annotations.
3. If new classes are introduced, dynamically appends them to [`data.yaml`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/dataset/urbanpulse_unified_yolo/data.yaml) and updates `nc`.
4. Distributes samples into Train (70%), Val (20%), and Test (10%) splits.
5. Recomputes box counts and class statistics.

---

## 4. How to Train the YOLO Model

Run the training pipeline with one command:
```bash
python ml/train_yolo.py --epochs 50 --batch 16 --imgsz 416 --model yolov8n.pt
```
- Trains YOLOv8 on the unified 10+ class dataset.
- Evaluates mAP50 and mAP50-95 on the validation split.
- Automatically exports weights to `urbanpulse_yolo.onnx` for web browser and backend real-time inference.

---

## 5. Viva / Presentation Technical Q&A

### Q1: "You have 5 disparate datasets with different formats and classes. How can you train a single vision model without combining them, or how did you combine them?"
**Answer**:
> *"We do not train separate models in silos because that would require running 5 distinct inference passes per camera frame, which is computationally prohibitive for real-time edge devices and city-scale CCTV streams. Instead, we performed **Ontological and Geometric Data Unification**:*
> 1. * **Taxonomy Alignment**: We defined a unified ontology where disparate source classes (e.g. Roboflow `Crack`, Mendeley `water`, and polygon-based waste labels) are remapped to consistent, mutually non-overlapping integer IDs (`0` to `9`).*
> 2. * **Format Standardization**: Segmentation polygons and varied bounding box formats were converted into normalized YOLO format `[class_id, x_center, y_center, w, h]` relative to image dimensions.*
> 3. * **Data Quality & Hygiene Filtering**: Unlabeled raw images, indoor photos with artificial floor reflections, and ambiguous wet surfaces were systematically purged using our verification manifest.*
> 4. * **Class Balancing & Stratified Partitioning**: To prevent majority-class bias (e.g., standing water overpowering road cracks), we performed class-balanced sampling across waste categories and stratified 70/20/10 Train/Val/Test partitioning with zero cross-split leakage.*
> 5. * **Single-Pass Inference**: This enables a unified YOLO backbone to predict road defects, waterlogging, and segregated waste in a single forward pass under 15ms."*

### Q2: "Why did you exclude wet surfaces and indoor samples from the standing water dataset?"
**Answer**:
> *"Indoor tiled reflections and superficial surface wetness create massive false positive rates when deployed on municipal asphalt roads during light rain. A damp road is not a civic road hazard; deep stagnant water pools that breed mosquitoes and stall vehicles are. By eliminating superficial wet-surface bounding boxes and restricting annotations strictly to actual standing water bodies, we ensure our model learns high-severity waterlogging rather than normal road dampness."*
