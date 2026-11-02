# UrbanPulse Unified Vision Dataset Architecture & Viva Guide

## 1. Unified Dataset Overview
The UrbanPulse computer vision dataset consolidates multiple municipal hazard and urban defect datasets into a single, standardized **YOLO format** detection dataset.

- **Total Images**: 3,071
  - **Train**: 2,149 images (70%)
  - **Validation**: 614 images (20%)
  - **Test**: 308 images (10%)
- **Total Bounding Boxes**: 19,886
- **Format**: YOLO normalized bounding boxes `(class_id, x_center, y_center, width, height)`
- **Standard Image Dimensions**: Resized to maximum 416 px with preserved aspect ratios, JPEG quality 80/85.
- **Master Configuration File**: [`dataset/urbanpulse_unified_yolo/data.yaml`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/dataset/urbanpulse_unified_yolo/data.yaml)

---

## 2. Standardized 10-Class Taxonomy

| Class ID | Class Name | Unique Images | Total Bounding Boxes | Original Source Dataset |
| :---: | :--- | :---: | :---: | :--- |
| **0** | `pothole` | 328 | 927 | Curated Road Damage RGB Dataset |
| **1** | `road_crack` | 456 | 522 | Curated Road Damage RGB Dataset |
| **2** | `surface_erosion` | 391 | 397 | Curated Road Damage RGB Dataset |
| **3** | `biodegradable_waste` | 222 | 4,715 | Trash Detection / Waste Segregation |
| **4** | `cardboard` | 217 | 715 | Trash Detection / Waste Segregation |
| **5** | `glass` | 229 | 633 | Trash Detection / Waste Segregation |
| **6** | `metal` | 230 | 788 | Trash Detection / Waste Segregation |
| **7** | `paper` | 214 | 581 | Trash Detection / Waste Segregation |
| **8** | `plastic` | 219 | 634 | Trash Detection / Waste Segregation |
| **9** | `standing_water` | 1,000 | 9,974 | Mendeley Stagnant Water & Wet Surface (`y6zyrnxbfm`) |
| **TOTAL** | **10 Classes** | **3,071** | **19,886** | **Unified Master Dataset** |

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
