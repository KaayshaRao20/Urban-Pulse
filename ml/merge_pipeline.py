#!/usr/bin/env python3
"""
UrbanPulse Unified Dataset Merger Pipeline
==========================================
Combines multiple civic vision datasets (potholes, road damage, waste segregation,
waterlogging / standing water, and future civic hazard datasets) into a single,
standardized YOLO-format master dataset ready for training.

Usage:
  1. Inspect status of unified dataset:
     python ml/merge_pipeline.py --status

  2. Merge an additional dataset (folder or zip archive):
     python ml/merge_pipeline.py --source "path/to/dataset.zip" --mapping "source_class:target_class,..."

  3. Validate all annotations and regenerate class_statistics.csv:
     python ml/merge_pipeline.py --validate
"""

import os
import sys
import json
import shutil
import hashlib
import zipfile
import argparse
from pathlib import Path
from collections import defaultdict

# Base directory for the unified dataset
DEFAULT_MASTER_DIR = Path(__file__).resolve().parent.parent / "dataset" / "urbanpulse_unified_yolo"

def compute_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def load_data_yaml(master_dir):
    yaml_path = master_dir / "data.yaml"
    if not yaml_path.exists():
        raise FileNotFoundError(f"data.yaml not found at {yaml_path}")
    
    classes = {}
    with open(yaml_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        in_names = False
        for line in lines:
            line_str = line.strip()
            if line_str.startswith("names:"):
                in_names = True
                continue
            if in_names:
                if ":" in line_str and not line_str.startswith("#"):
                    parts = line_str.split(":", 1)
                    try:
                        cid = int(parts[0].strip())
                        cname = parts[1].strip().strip("'").strip('"')
                        classes[cid] = cname
                    except ValueError:
                        pass
                elif line_str and not line_str.startswith(" "):
                    in_names = False
    return classes

def save_data_yaml(master_dir, classes):
    yaml_path = master_dir / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write("# UrbanPulse Unified YOLO Dataset Configuration\n")
        f.write("path: .\n")
        f.write("train: images/train\n")
        f.write("val: images/val\n")
        f.write("test: images/test\n\n")
        f.write(f"nc: {len(classes)}\n")
        f.write("names:\n")
        for cid in sorted(classes.keys()):
            f.write(f"  {cid}: {classes[cid]}\n")

def get_stats(master_dir):
    classes = load_data_yaml(master_dir)
    stats = {
        "classes": classes,
        "splits": {},
        "class_boxes": defaultdict(int),
        "class_images": defaultdict(set)
    }
    
    for split in ["train", "val", "test"]:
        img_dir = master_dir / "images" / split
        lbl_dir = master_dir / "labels" / split
        img_count = len(list(img_dir.glob("*.*"))) if img_dir.exists() else 0
        lbl_count = len(list(lbl_dir.glob("*.txt"))) if lbl_dir.exists() else 0
        stats["splits"][split] = {"images": img_count, "labels": lbl_count}
        
        if lbl_dir.exists():
            for lbl_file in lbl_dir.glob("*.txt"):
                with open(lbl_file, "r", encoding="utf-8") as lf:
                    for line in lf:
                        parts = line.strip().split()
                        if parts:
                            try:
                                cid = int(parts[0])
                                stats["class_boxes"][cid] += 1
                                stats["class_images"][cid].add(lbl_file.stem)
                            except ValueError:
                                pass
    return stats

def print_status(master_dir):
    print("=" * 70)
    print(" URBANPULSE UNIFIED VISION DATASET STATUS")
    print(f" Directory: {master_dir}")
    print("=" * 70)
    
    if not master_dir.exists():
        print(f"Directory {master_dir} does not exist!")
        return

    stats = get_stats(master_dir)
    total_imgs = sum(s["images"] for s in stats["splits"].values())
    total_lbls = sum(s["labels"] for s in stats["splits"].values())
    
    print(f"\n[Splits Summary]")
    for split, counts in stats["splits"].items():
        print(f"  {split.capitalize():<6} -> {counts['images']:>5} images, {counts['labels']:>5} annotation files")
    print(f"  TOTAL  -> {total_imgs:>5} images, {total_lbls:>5} annotations")
    
    print(f"\n[Unified Class Taxonomy & Box Statistics]")
    print(f"  {'ID':<4} {'Class Name':<24} {'Unique Images':<15} {'Total Boxes':<12}")
    print("  " + "-" * 58)
    total_boxes = 0
    for cid in sorted(stats["classes"].keys()):
        cname = stats["classes"][cid]
        n_imgs = len(stats["class_images"][cid])
        n_boxes = stats["class_boxes"][cid]
        total_boxes += n_boxes
        print(f"  {cid:<4} {cname:<24} {n_imgs:>13} {n_boxes:>12}")
    print("  " + "-" * 58)
    print(f"  {'TOTAL':<28} {total_imgs:>13} {total_boxes:>12}\n")

def merge_new_dataset(source_path, mapping_dict=None, master_dir=DEFAULT_MASTER_DIR, prefix=None):
    """
    Ingests an external dataset folder or zip archive and merges it into the master dataset.
    """
    master_dir = Path(master_dir)
    source_path = Path(source_path)
    
    if not source_path.exists():
        raise FileNotFoundError(f"Source dataset path does not exist: {source_path}")
        
    print(f"\n>> Ingesting source dataset: {source_path.name}")
    temp_dir = master_dir.parent / "_temp_ingest"
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract if archive
    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        print("  Extracting zip archive...")
        with zipfile.ZipFile(source_path, "r") as z:
            z.extractall(temp_dir)
        work_dir = temp_dir
    else:
        work_dir = source_path

    # Auto-detect structure
    classes = load_data_yaml(master_dir)
    reverse_classes = {v.lower(): k for k, v in classes.items()}
    
    # Find all images and corresponding txt files
    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    found_pairs = []
    
    for root, _, files in os.walk(work_dir):
        for f in files:
            p = Path(root) / f
            if p.suffix.lower() in image_exts:
                # search for corresponding .txt label
                txt_candidates = [
                    p.with_suffix(".txt"),
                    Path(root).parent / "labels" / f"{p.stem}.txt",
                    Path(str(p).replace("images", "labels")).with_suffix(".txt")
                ]
                lbl_path = None
                for candidate in txt_candidates:
                    if candidate.exists():
                        lbl_path = candidate
                        break
                found_pairs.append((p, lbl_path))
                
    print(f"  Found {len(found_pairs)} source images ({sum(1 for _, l in found_pairs if l)} annotated).")
    
    if not found_pairs:
        print("  [Warning] No images found to ingest.")
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        return
        
    # Check mapping
    # mapping_dict: {"source_class_index_or_name": "target_class_name"}
    # If a target class doesn't exist in master, add it
    if mapping_dict:
        for src, tgt in mapping_dict.items():
            tgt_clean = tgt.strip().lower()
            if tgt_clean not in reverse_classes:
                new_id = len(classes)
                classes[new_id] = tgt_clean
                reverse_classes[tgt_clean] = new_id
                print(f"  [Registered New Class] ID {new_id}: '{tgt_clean}'")
        save_data_yaml(master_dir, classes)

    # Distribute into train (70%), val (20%), test (10%)
    import random
    random.seed(42)
    random.shuffle(found_pairs)
    
    prefix = prefix or source_path.stem[:8].lower()
    added_counts = {"train": 0, "val": 0, "test": 0}
    
    for idx, (img_p, lbl_p) in enumerate(found_pairs):
        # Determine split
        r = (idx % 10)
        split = "test" if r == 9 else ("val" if r >= 7 else "train")
        
        target_stem = f"{prefix}_{img_p.stem}"
        dest_img = master_dir / "images" / split / f"{target_stem}{img_p.suffix.lower()}"
        dest_lbl = master_dir / "labels" / split / f"{target_stem}.txt"
        
        shutil.copy2(img_p, dest_img)
        
        if lbl_p and lbl_p.exists():
            # Remap labels
            new_lines = []
            with open(lbl_p, "r", encoding="utf-8") as lf:
                for line in lf:
                    parts = line.strip().split()
                    if not parts:
                        continue
                    src_cls = parts[0]
                    # Map to target class ID
                    if mapping_dict and src_cls in mapping_dict:
                        target_name = mapping_dict[src_cls].strip().lower()
                        target_id = reverse_classes[target_name]
                    elif src_cls.isdigit() and int(src_cls) in classes:
                        target_id = int(src_cls)
                    else:
                        continue
                    new_lines.append(f"{target_id} " + " ".join(parts[1:]) + "\n")
            
            with open(dest_lbl, "w", encoding="utf-8") as dlf:
                dlf.writelines(new_lines)
        else:
            # Empty label file for background / negative sample
            dest_lbl.touch()
            
        added_counts[split] += 1

    if temp_dir.exists():
        shutil.rmtree(temp_dir)
        
    print(f"\n>> Successfully merged {len(found_pairs)} images into master dataset:")
    print(f"   Train: +{added_counts['train']} | Val: +{added_counts['val']} | Test: +{added_counts['test']}")
    print_status(master_dir)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="UrbanPulse Unified Dataset Merger Pipeline")
    parser.add_argument("--status", action="store_true", help="Print current unified dataset stats")
    parser.add_argument("--source", type=str, help="Path to new dataset archive (.zip) or directory to merge")
    parser.add_argument("--mapping", type=str, help="Comma-separated class mappings, e.g., '0:pothole,1:open_manhole'")
    parser.add_argument("--prefix", type=str, help="Filename prefix for added images to avoid collisions")
    
    args = parser.parse_args()
    
    if args.source:
        mapping = {}
        if args.mapping:
            for pair in args.mapping.split(","):
                if ":" in pair:
                    k, v = pair.split(":", 1)
                    mapping[k.strip()] = v.strip()
        merge_new_dataset(args.source, mapping_dict=mapping, prefix=args.prefix)
    else:
        print_status(DEFAULT_MASTER_DIR)
