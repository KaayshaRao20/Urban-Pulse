# Trash detection dataset – individual preprocessing report

- Valid annotated source images available: **5,046**
- Images retained for final compact dataset: **1,000**
- Selection: A storage-conscious, class-balanced subset of 1,000 images selected from 5,046 valid annotated images.
- Converted/resized to maximum 416 px, JPEG quality 80.
- Valid annotations remapped to the common UrbanPulse class IDs.
- Exact duplicate check across final processed images found no duplicates.

- `biodegradable_waste`: 222 images; 4715 bounding boxes
- `cardboard`: 217 images; 715 bounding boxes
- `glass`: 229 images; 633 bounding boxes
- `metal`: 230 images; 788 bounding boxes
- `paper`: 214 images; 581 bounding boxes
- `plastic`: 219 images; 634 bounding boxes

The source provides six waste-material classes. These do not mean wet/dry/mixed waste or overflowing street garbage.

Source annotations are YOLO polygon-style labels; valid polygons were converted to enclosing bounding boxes.