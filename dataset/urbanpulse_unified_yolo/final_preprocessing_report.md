# UrbanPulse Final Dataset – Preprocessing Report

## Final dataset
- Total images: **3,071**
- Training: **2,149**
- Validation: **614**
- Testing: **308**
- Classes with valid annotations: **10**
- Maximum image dimension: **416 px**
- JPEG quality: **80**
- Random seed: **42**
- Format: YOLO bounding-box detection
- Storage strategy: all valid road images, all 1,000 selected water images, and a class-balanced 1,000-image subset from the waste dataset.

## Class statistics
- `pothole`: 328 images; 927 boxes\n- `road_crack`: 456 images; 522 boxes\n- `surface_erosion`: 391 images; 397 boxes\n- `biodegradable_waste`: 222 images; 4715 boxes\n- `cardboard`: 217 images; 715 boxes\n- `glass`: 229 images; 633 boxes\n- `metal`: 230 images; 788 boxes\n- `paper`: 214 images; 581 boxes\n- `plastic`: 219 images; 634 boxes\n- `standing_water`: 1000 images; 9974 boxes\n
## Classes not covered by the uploaded labelled data
- `overflowing_garbage`: no specifically labelled street-overflow dataset was included.
- `overflowing_drain`: no labelled drain-overflow dataset was included.
- `flooding`: not separately annotated as a distinct class.
- Wet/dry/mixed waste piles: not reliably labelled as pile-level segregation classes.
- Longitudinal/transverse/alligator cracks: not separately annotated; only generic `road_crack` is available.

## Excluded uploaded items
- `RoadDamageDetector-master.zip`: code and documentation, not image/label training data.
- `all_image_urls.csv`: TACO image URLs only; actual paired images and annotation files were not supplied.
- `manifest.csv`: used to identify the 1,000 selected water images.
- `removal_log.csv`: retained as an audit reference, not training data.

## Annotation and quality notes
- Trash dataset polygon annotations were converted to enclosing bounding boxes for object detection.
- Wet-surface annotations were excluded from the water dataset.
- Exact duplicates were checked; none were found in the final set.
- Near-duplicate removal was not applied automatically to avoid discarding distinct scenes.
- Image-label pair checks passed for all final splits.
- Licence of the trash archive and water dataset needs confirmation before redistribution. Road dataset metadata states CC BY 4.0.

This is a compact initial training dataset, not a complete model dataset for overflowing garbage or drain overflow. Those classes need real annotated images before they can be trained.
