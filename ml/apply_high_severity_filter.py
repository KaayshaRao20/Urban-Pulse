#!/usr/bin/env python3
"""
UrbanPulse High-Severity 4-Class Dataset Filter
===============================================
Filters and consolidates the unified master dataset into 4 high-severity municipal classes:
  0: pothole
  1: road_crack
  2: garbage_dump (large waste accumulations only; area >= 0.08)
  3: waterlogging (large standing water pools only; area >= 0.05)

Drops minor litter, tiny puddles, and superficial erosion.
Purges unannotated images to maintain a razor-sharp, balanced training set.
"""

import os
import shutil
from pathlib import Path
from collections import defaultdict

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset" / "urbanpulse_unified_yolo"

MIN_WATER_AREA = 0.05   # >= 5% of frame (major pool)
MIN_WASTE_AREA = 0.08   # >= 8% of frame (major dump/pile)

def run_filter():
    print("=" * 70)
    print(" APPLYING HIGH-SEVERITY 4-CLASS FILTER")
    print(f" Dataset dir : {DATASET_DIR}")
    print(f" Water threshold (min area) : {MIN_WATER_AREA}")
    print(f" Waste threshold (min area) : {MIN_WASTE_AREA}")
    print("=" * 70)

    lbl_root = DATASET_DIR / "labels"
    img_root = DATASET_DIR / "images"

    class_boxes = defaultdict(int)
    class_images = defaultdict(set)
    retained_images = defaultdict(int)
    removed_images = defaultdict(int)

    image_exts = [".jpg", ".jpeg", ".png", ".webp"]

    for split in ["train", "val", "test"]:
        split_lbl_dir = lbl_root / split
        split_img_dir = img_root / split
        
        if not split_lbl_dir.exists():
            continue

        lbl_files = list(split_lbl_dir.glob("*.txt"))
        for lf in lbl_files:
            new_lines = []
            stem = lf.stem
            
            with open(lf, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts:
                        continue
                    cid = int(parts[0])
                    cx, cy, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                    area = w * h

                    target_cid = None
                    if cid == 0:  # pothole
                        target_cid = 0
                    elif cid == 1:  # road_crack
                        target_cid = 1
                    elif cid in [3, 4, 5, 6, 7, 8]:  # waste materials -> garbage_dump
                        if area >= MIN_WASTE_AREA:
                            target_cid = 2
                    elif cid == 9:  # standing water -> waterlogging
                        if area >= MIN_WATER_AREA:
                            target_cid = 3

                    if target_cid is not None:
                        new_lines.append(f"{target_cid} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
                        class_boxes[target_cid] += 1
                        class_images[target_cid].add(stem)

            # Find matching image file
            matching_img = None
            for ext in image_exts:
                test_p = split_img_dir / f"{stem}{ext}"
                if test_p.exists():
                    matching_img = test_p
                    break

            if new_lines:
                # Overwrite label with filtered high-severity annotations
                with open(lf, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                retained_images[split] += 1
            else:
                # Image has no high-severity boxes remaining (was only tiny litter or micro puddle)
                # Remove label and image to avoid training on non-hazard false negatives
                lf.unlink()
                if matching_img and matching_img.exists():
                    matching_img.unlink()
                removed_images[split] += 1

    # Write updated 4-class data.yaml
    yaml_path = DATASET_DIR / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write("# UrbanPulse High-Severity 4-Class YOLO Configuration\n")
        f.write("path: .\n")
        f.write("train: images/train\n")
        f.write("val: images/val\n")
        f.write("test: images/test\n\n")
        f.write("nc: 4\n")
        f.write("names:\n")
        f.write("  0: pothole\n")
        f.write("  1: road_crack\n")
        f.write("  2: garbage_dump\n")
        f.write("  3: waterlogging\n")

    # Write updated class_statistics.csv
    csv_path = DATASET_DIR / "class_statistics.csv"
    class_names = {0: "pothole", 1: "road_crack", 2: "garbage_dump", 3: "waterlogging"}
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("class_id,class_name,images_with_class,bounding_boxes\n")
        for cid in range(4):
            f.write(f"{cid},{class_names[cid]},{len(class_images[cid])},{class_boxes[cid]}\n")

    total_retained = sum(retained_images.values())
    total_removed = sum(removed_images.values())
    total_boxes = sum(class_boxes.values())

    print("\n[Filter Results]")
    print(f"  Retained high-severity images : {total_retained}")
    print(f"    - Train : {retained_images['train']}")
    print(f"    - Val   : {retained_images['val']}")
    print(f"    - Test  : {retained_images['test']}")
    print(f"  Purged micro-litter/puddle images : {total_removed}")
    print(f"  Total high-severity bounding boxes : {total_boxes}\n")

    print("[Consolidated 4-Class Taxonomy]")
    print(f"  {'ID':<4} {'Class Name':<20} {'Unique Images':<15} {'Total Boxes':<12}")
    print("  " + "-" * 52)
    for cid in range(4):
        print(f"  {cid:<4} {class_names[cid]:<20} {len(class_images[cid]):>13} {class_boxes[cid]:>12}")
    print("  " + "-" * 52)
    print(f"  {'TOTAL':<24} {total_retained:>13} {total_boxes:>12}\n")
    print(f">> Updated data.yaml and class_statistics.csv successfully!")

if __name__ == "__main__":
    run_filter()
