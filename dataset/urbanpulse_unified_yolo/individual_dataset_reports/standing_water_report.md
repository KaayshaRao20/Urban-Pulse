# Standing water dataset – individual preprocessing report

- Valid annotated source images available: **1,000**
- Images retained for final compact dataset: **1,000**
- Selection: All 1,000 images listed in the supplied manifest retained; only water class kept and wet-surface boxes excluded.
- Converted/resized to maximum 416 px, JPEG quality 80.
- Valid annotations remapped to the common UrbanPulse class IDs.
- Exact duplicate check across final processed images found no duplicates.

- `standing_water`: 1000 images; 9974 bounding boxes

The source provides `water` and `wet surface`. Only `water` annotations were retained. This is not verified as a dedicated flooding or drain-overflow class.