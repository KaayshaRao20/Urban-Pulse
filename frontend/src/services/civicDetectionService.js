/**
 * UrbanPulse Modular Civic Issue Detection Service
 * =================================================
 * Provides category-specific computer vision detection and evidence validation.
 *
 * Current Phase: Testing Phase using category-specific mock detection and video
 * quality analysis (luminance, blur, color distribution).
 *
 * Architecture:
 * - Decoupled interface: Can seamlessly transition from mock detection to
 *   real ONNX / YOLOv8 / YOLOv11 browser-in-the-loop or edge inference models.
 * - Supports all issue categories:
 *   - Potholes and broken roads
 *   - Road cracks and surface damage
 *   - Waterlogging and flooding
 *   - Garbage accumulation and waste dumping
 *   - Streetlight failure
 *   - Traffic hazard & other civic hazards
 * - Non-rejection of ambient pedestrians, faces, or vehicles in public footage.
 * - Simulated bounding box tagging (never misrepresenting simulated as real YOLO).
 */

// Category normalization helper
export const normalizeCategory = (category = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('crack') || cat.includes('fissure') || cat.includes('surface damage')) {
    return 'crack';
  }
  if (cat.includes('pothole') || cat.includes('road')) {
    return 'pothole';
  }
  if (cat.includes('garbage') || cat.includes('waste') || cat.includes('dump') || cat.includes('debris')) {
    return 'garbage';
  }
  if (cat.includes('drainage') || cat.includes('flood') || cat.includes('waterlog') || cat.includes('stagnant')) {
    return 'waterlogging';
  }
  if (cat.includes('water') || cat.includes('leak') || cat.includes('pipe') || cat.includes('burst')) {
    return 'water_leakage';
  }
  if (cat.includes('streetlight') || cat.includes('light') || cat.includes('lamp') || cat.includes('pole')) {
    return 'streetlight';
  }
  if (cat.includes('traffic') || cat.includes('signal') || cat.includes('hazard') || cat.includes('tree')) {
    return 'traffic';
  }
  return 'other';
};

// Available test scenarios for interactive testing
export const TEST_SCENARIOS = [
  { id: 'auto', label: 'Auto (Live Video Analysis)' },
  { id: 'defect_detected', label: 'Simulate: Relevant Defect Detected' },
  { id: 'no_defect_visible', label: 'Simulate: No Defect Visible' },
  { id: 'unrelated_footage', label: 'Simulate: Unrelated Footage' },
  { id: 'blurry_footage', label: 'Simulate: Blurry Footage' },
  { id: 'dark_footage', label: 'Simulate: Dark Footage' },
  { id: 'uncertain_review', label: 'Simulate: Uncertain (Officer Review)' }
];

/**
 * Measure optical sharpness / motion blur from canvas image data.
 * Computes high-frequency neighbor variance.
 */
export const computeFrameMetrics = (imgData) => {
  const data = imgData.data;
  const totalPixels = data.length / 4;
  let sumLuminance = 0;
  let blurDiff = 0;
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;

    sumLuminance += y;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;

    // High frequency pixel differential (step of 16 for performance)
    if (i < data.length - 16 && (i % 16 === 0)) {
      blurDiff += Math.abs(data[i] - data[i + 4]);
    }
  }

  const meanLuminance = sumLuminance / totalPixels;
  const sharpness = blurDiff / (totalPixels / 4);
  const colorSpread = (maxR - minR) + (maxG - minG) + (maxB - minB);

  return {
    meanLuminance,
    sharpness,
    colorSpread,
    isDark: meanLuminance < 18,
    isBlurry: sharpness < 2.0 && meanLuminance > 30
  };
};

/**
 * Generate simulated bounding box coordinates specific to category.
 */
export const getSimulatedBoundingBox = (normCat) => {
  switch (normCat) {
    case 'pothole':
      return {
        x: 28,
        y: 42,
        width: 44,
        height: 32,
        label: 'SIMULATED: POTHOLE DEFECT',
        confidence: 0.88,
        simulated: true
      };
    case 'crack':
      return {
        x: 25,
        y: 35,
        width: 50,
        height: 38,
        label: 'SIMULATED: ROAD CRACK DEFECT',
        confidence: 0.86,
        simulated: true
      };
    case 'waterlogging':
    case 'water_leakage':
      return {
        x: 22,
        y: 45,
        width: 56,
        height: 36,
        label: 'SIMULATED: WATERLOGGING / ACCUMULATION',
        confidence: 0.87,
        simulated: true
      };
    case 'garbage':
      return {
        x: 26,
        y: 38,
        width: 48,
        height: 42,
        label: 'SIMULATED: GARBAGE ACCUMULATION',
        confidence: 0.89,
        simulated: true
      };
    case 'streetlight':
      return {
        x: 42,
        y: 18,
        width: 20,
        height: 64,
        label: 'SIMULATED: DARK STREETLIGHT INFRASTRUCTURE',
        confidence: 0.84,
        simulated: true
      };
    case 'traffic':
      return {
        x: 24,
        y: 32,
        width: 52,
        height: 44,
        label: 'SIMULATED: TRAFFIC HAZARD',
        confidence: 0.85,
        simulated: true
      };
    default:
      return {
        x: 25,
        y: 30,
        width: 50,
        height: 45,
        label: 'SIMULATED: CIVIC HAZARD',
        confidence: 0.83,
        simulated: true
      };
  }
};

/**
 * Real-time per-frame analysis for camera viewfinder HUD.
 * Returns HUD feedback and optional simulated bounding box.
 */
export const detectRealtimeFrame = (videoElement, category, scenario = 'auto') => {
  if (!videoElement || videoElement.readyState < 2) return null;

  const normCat = normalizeCategory(category);

  // If a forced scenario is selected
  if (scenario === 'no_defect_visible') {
    return {
      detected: false,
      box: null,
      feedback: getCategoryScanningFeedback(normCat)
    };
  }

  if (scenario === 'unrelated_footage') {
    return {
      detected: false,
      box: null,
      feedback: 'Video view does not match the selected issue category'
    };
  }

  if (scenario === 'blurry_footage') {
    return {
      detected: false,
      box: null,
      feedback: '⚠️ Camera moving too quickly / footage out of focus'
    };
  }

  if (scenario === 'dark_footage') {
    return {
      detected: false,
      box: null,
      feedback: '⚠️ Scene lighting is too dark — move to illuminated area'
    };
  }

  if (scenario === 'uncertain_review') {
    return {
      detected: true,
      box: getSimulatedBoundingBox(normCat),
      feedback: 'Borderline detection — queued for municipal manual review'
    };
  }

  // Auto mode or forced defect_detected mode:
  // When camera is streaming, show simulated bounding box for the selected category
  const box = getSimulatedBoundingBox(normCat);
  const feedbackMsg = getCategoryDetectedFeedback(normCat, box.confidence);

  return {
    detected: true,
    box,
    feedback: feedbackMsg
  };
};

const getCategoryScanningFeedback = (normCat) => {
  switch (normCat) {
    case 'pothole':
    case 'crack':
      return 'Scanning road surface for structural cavities or cracks...';
    case 'waterlogging':
    case 'water_leakage':
      return 'Scanning road area for waterlogging or standing water...';
    case 'garbage':
      return 'Scanning ground for solid waste or uncollected garbage...';
    case 'streetlight':
      return 'Scanning for non-illuminating streetlight fixtures...';
    case 'traffic':
      return 'Scanning corridor for traffic obstructions or road hazards...';
    default:
      return 'Scanning visual frame for civic infrastructure issue...';
  }
};

const getCategoryDetectedFeedback = (normCat, confidence) => {
  const pct = Math.round(confidence * 100);
  switch (normCat) {
    case 'pothole':
      return `Road damage defect outlined (${pct}% simulated confidence)`;
    case 'crack':
      return `Road surface crack outlined (${pct}% simulated confidence)`;
    case 'waterlogging':
    case 'water_leakage':
      return `Waterlogging accumulation outlined (${pct}% simulated confidence)`;
    case 'garbage':
      return `Garbage accumulation outlined (${pct}% simulated confidence)`;
    case 'streetlight':
      return `Dark streetlight infrastructure outlined (${pct}% simulated confidence)`;
    case 'traffic':
      return `Traffic hazard outlined (${pct}% simulated confidence)`;
    default:
      return `Civic issue outlined (${pct}% simulated confidence)`;
  }
};

/**
 * Comprehensive video validation for recorded video blob / file.
 * Returns structured result compliant with all category requirements.
 */
export const validateVideoEvidence = async (fileOrBlob, category, durationSec = 0, scenario = 'auto') => {
  const normCat = normalizeCategory(category);

  // 1. Duration & payload checks
  if (!fileOrBlob || fileOrBlob.size < 18000) {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'Recording is too short.',
      reason: 'Recording is too short. Video stream payload is truncated.',
      guidance: 'Please record for at least 2 to 5 seconds of steady footage.',
      action: 'record_again'
    };
  }

  if (durationSec > 0 && durationSec < 1.5) {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'Recording is too short.',
      reason: 'Recording is too short. Please record for at least 2 to 5 seconds.',
      guidance: 'Hold the record button and capture at least 3 seconds of steady footage showing the defect.',
      action: 'record_again'
    };
  }

  // 2. Scenario-based simulation evaluation
  if (scenario === 'no_defect_visible') {
    return buildNoDefectResult(normCat, category);
  }

  if (scenario === 'unrelated_footage') {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'The video does not appear to show the selected civic issue.',
      reason: 'The video does not appear to show the selected civic issue. Please record the reported issue again.',
      guidance: `Point your camera at the physical ${category.toLowerCase()} and record a focused video.`,
      action: 'record_again'
    };
  }

  if (scenario === 'blurry_footage') {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'The footage is too blurry or out of focus to verify.',
      reason: 'The footage is too blurry or out of focus to verify. Please hold the device steady and re-record.',
      guidance: 'Hold the device steady with both hands and avoid rapid camera movements while recording.',
      action: 'record_again'
    };
  }

  if (scenario === 'dark_footage') {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'Footage is too dark to verify.',
      reason: 'Footage is too dark to verify. Please record in adequate lighting or enable camera flash.',
      guidance: 'Record during daylight hours or use auxiliary lighting to illuminate the issue.',
      action: 'record_again'
    };
  }

  if (scenario === 'uncertain_review') {
    const box = getSimulatedBoundingBox(normCat);
    return {
      valid: true,
      is_valid: true,
      verdict: 'needs_review',
      confidence: 0.54,
      primary_box: box,
      box,
      simulated: true,
      reason: 'Detection is uncertain. You can submit for municipal officer review or record again for faster automated verification.',
      guidance: 'You may submit this report for physical officer inspection, or record again closer to the defect for instant AI approval.',
      action: 'optional_record_again',
      features: [
        `Video recorded (${durationSec.toFixed(1)}s)`,
        'Officer physical inspection queued',
        'Simulated Vision Check: Inconclusive'
      ]
    };
  }

  // 3. Auto mode: Sample canvas video frames to check genuine optical quality (blur/dark)
  // If auto, evaluate actual video canvas pixels
  let autoQuality = { isDark: false, isBlurry: false };
  try {
    autoQuality = await sampleVideoFramesQuality(fileOrBlob, durationSec);
  } catch (err) {
    console.warn('Canvas frame quality check notice:', err);
  }

  if (autoQuality.isDark && normCat !== 'streetlight') {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'Footage is too dark to verify.',
      reason: 'Footage is too dark to verify. Please record in adequate lighting or enable camera flash.',
      guidance: 'Record during daylight hours or ensure adequate illumination of the civic issue.',
      action: 'record_again'
    };
  }

  if (autoQuality.isBlurry) {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'The footage is too blurry or out of focus to verify.',
      reason: 'The footage is too blurry or out of focus to verify. Please hold the device steady and re-record.',
      guidance: 'Hold your device steady and ensure the lens is clean and focused on the defect.',
      action: 'record_again'
    };
  }

  // Streetlight failure daytime check in auto mode
  if (normCat === 'streetlight' && !autoQuality.isDark && autoQuality.meanLuminance > 60) {
    return {
      valid: false,
      is_valid: false,
      verdict: 'rejected',
      error: 'Daytime footage cannot establish streetlight failure.',
      reason: 'Daytime footage cannot establish streetlight failure. Streetlight failure cannot be determined during daytime hours.',
      guidance: 'Please record during evening or night hours when streetlights are active.',
      action: 'record_again'
    };
  }

  // 4. Default / auto successful detection with category-specific reason and simulated bounding box
  const box = getSimulatedBoundingBox(normCat);
  const successReason = getCategorySuccessReason(normCat);

  return {
    valid: true,
    is_valid: true,
    verdict: 'verified',
    confidence: box.confidence,
    primary_box: box,
    box,
    simulated: true,
    category,
    reason: successReason,
    guidance: 'Defect confirmed! You can proceed to submit your geotagged report.',
    features: [
      `Category: ${category}`,
      `Simulated Confidence: ${Math.round(box.confidence * 100)}%`,
      'Visual defect evidence confirmed',
      'Testing Phase: Simulated Detection Model'
    ]
  };
};

const buildNoDefectResult = (normCat, category) => {
  switch (normCat) {
    case 'pothole':
    case 'crack':
      return {
        valid: false,
        is_valid: false,
        verdict: 'rejected',
        error: 'No pothole or road damage detected.',
        reason: 'No pothole or road damage detected. Please record the affected road surface more clearly.',
        guidance: 'Point the camera directly at the damaged road pavement, hold steady, and re-record.',
        action: 'record_again'
      };
    case 'waterlogging':
    case 'water_leakage':
      return {
        valid: false,
        is_valid: false,
        verdict: 'rejected',
        error: 'No visible waterlogging detected.',
        reason: 'No visible waterlogging detected. Capture the flooded area and surrounding road.',
        guidance: 'Frame the standing puddle, flooded road stretch, or leaking pipe clearly.',
        action: 'record_again'
      };
    case 'garbage':
      return {
        valid: false,
        is_valid: false,
        verdict: 'rejected',
        error: 'No visible garbage accumulation detected.',
        reason: 'No visible garbage accumulation detected. Record the waste accumulation clearly.',
        guidance: 'Focus directly on the waste pile, uncollected garbage, or overflowing bin.',
        action: 'record_again'
      };
    case 'streetlight':
      return {
        valid: false,
        is_valid: false,
        verdict: 'rejected',
        error: 'Streetlight appears operational or non-defective.',
        reason: 'No streetlight defect detected. Please record the unlit streetlight fixture at night.',
        guidance: 'Ensure the non-working luminaire or dark pole is centered in the frame.',
        action: 'record_again'
      };
    default:
      return {
        valid: false,
        is_valid: false,
        verdict: 'rejected',
        error: `No visual evidence of '${category}' was found.`,
        reason: `The video does not appear to show the selected civic issue. Please record the reported issue again.`,
        guidance: `Point the camera directly at the civic problem and record again.`,
        action: 'record_again'
      };
  }
};

const getCategorySuccessReason = (normCat) => {
  switch (normCat) {
    case 'pothole':
      return 'Road damage detected. You can submit this report.';
    case 'crack':
      return 'Road surface crack damage detected. You can submit this report.';
    case 'waterlogging':
    case 'water_leakage':
      return 'Visible waterlogging / drainage issue detected. You can submit this report.';
    case 'garbage':
      return 'Garbage accumulation detected. You can submit this report.';
    case 'streetlight':
      return 'Non-operational streetlight infrastructure detected in low-light conditions. You can submit this report.';
    case 'traffic':
      return 'Civic traffic hazard visual evidence detected. You can submit this report.';
    default:
      return 'Civic defect visual evidence detected. You can submit this report.';
  }
};

/**
 * Samples a few frames from video blob to measure average luminance and sharpness.
 */
const sampleVideoFramesQuality = async (fileOrBlob, durationSec = 0) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(fileOrBlob);
    video.src = url;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({ meanLuminance: 80, sharpness: 10, isDark: false, isBlurry: false });
    }, 2500);

    video.onloadedmetadata = async () => {
      try {
        const safeDuration = Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : Math.max(1.5, durationSec);

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          return resolve({ meanLuminance: 80, sharpness: 10, isDark: false, isBlurry: false });
        }

        const timestamps = [safeDuration * 0.3, safeDuration * 0.6];
        let totalLuminance = 0;
        let totalSharpness = 0;
        let samples = 0;

        for (const t of timestamps) {
          await new Promise((seekResolve) => {
            let done = false;
            const onSeeked = () => {
              if (done) return;
              done = true;
              video.removeEventListener('seeked', onSeeked);
              try {
                ctx.drawImage(video, 0, 0, 160, 120);
                const imgData = ctx.getImageData(0, 0, 160, 120);
                const m = computeFrameMetrics(imgData);
                totalLuminance += m.meanLuminance;
                totalSharpness += m.sharpness;
                samples++;
              } catch {
                // Ignore cross-origin error if any
              }
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = Math.max(0.1, Math.min(t, safeDuration - 0.1));
            setTimeout(() => {
              if (!done) {
                done = true;
                video.removeEventListener('seeked', onSeeked);
                seekResolve();
              }
            }, 500);
          });
        }

        clearTimeout(timeout);
        URL.revokeObjectURL(url);

        const avgLuminance = samples > 0 ? (totalLuminance / samples) : 80;
        const avgSharpness = samples > 0 ? (totalSharpness / samples) : 10;

        resolve({
          meanLuminance: avgLuminance,
          sharpness: avgSharpness,
          isDark: avgLuminance < 18,
          isBlurry: avgSharpness < 1.8 && avgLuminance > 30
        });
      } catch {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({ meanLuminance: 80, sharpness: 10, isDark: false, isBlurry: false });
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({ meanLuminance: 80, sharpness: 10, isDark: false, isBlurry: false });
    };
  });
};
