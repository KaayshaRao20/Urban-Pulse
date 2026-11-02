# Road damage dataset – individual preprocessing report

- Valid annotated source images available: **1,071**
- Images retained for final compact dataset: **1,071**
- Selection: All valid annotated images retained.
- Converted/resized to maximum 416 px, JPEG quality 80.
- Valid annotations remapped to the common UrbanPulse class IDs.
- Exact duplicate check across final processed images found no duplicates.

- `pothole`: 328 images; 927 bounding boxes
- `road_crack`: 456 images; 522 bounding boxes
- `surface_erosion`: 391 images; 397 bounding boxes

The source has one generic `Crack` class. It is retained as `road_crack`, not split into crack orientations.