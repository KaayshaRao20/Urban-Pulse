/**
 * UrbanPulse Demo Road Video & Synthetic Defect Generator
 * ========================================================
 * Provides clear, daylight-bright road pavement and civic defect video evidence.
 *
 * Supported Demo Scenarios:
 * 1. Pothole / Road Damage:
 *    - Bright daylight concrete/asphalt pavement (natural road grey, mineral aggregate, white/yellow lane lines)
 *    - Distinct, deeply-etched cavity with eroded perimeter, broken rock fragments, and radiating stress fractures
 *
 * 2. Waterlogging / Drainage:
 *    - Daylight road with clear puddle of standing water, sky reflection, and ripples
 *
 * 3. Garbage / Solid Waste:
 *    - Daylight road curb with distinct solid waste & refuse accumulation
 */

import { normalizeCategory } from './civicDetectionService';

/**
 * Draw authentic bright daylight asphalt road texture and lane markings
 */
const drawAsphaltBase = (ctx, width, height, frameIndex, cameraJitterX, cameraJitterY) => {
  ctx.save();
  ctx.translate(cameraJitterX, cameraJitterY);

  // 1. Natural Bright Daylight Asphalt Pavement (Clear light/mid-grey roadway)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#788292');
  baseGrad.addColorStop(0.5, '#687282');
  baseGrad.addColorStop(1, '#5C6676');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(-20, -20, width + 40, height + 40);

  // 2. Concrete/Asphalt coarse aggregate mineral speckles (Light stone granules)
  ctx.fillStyle = 'rgba(235, 240, 248, 0.45)';
  for (let i = 0; i < 500; i++) {
    const rx = ((i * 137.5) % (width + 40)) - 20;
    const ry = ((i * 223.7) % (height + 40)) - 20;
    const rSize = (i % 4 === 0) ? 2 : 1;
    ctx.fillRect(rx, ry, rSize, rSize);
  }

  // 3. Natural mineral stone flecks (medium slate)
  ctx.fillStyle = 'rgba(75, 85, 99, 0.35)';
  for (let i = 0; i < 400; i++) {
    const rx = ((i * 181.1) % (width + 40)) - 20;
    const ry = ((i * 283.3) % (height + 40)) - 20;
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }

  // 4. White Center Broken Lane Divider (Clean daylight road marking)
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 3;
  const dashWidth = 14;
  const dashHeight = 70;
  ctx.fillRect(width * 0.12, height * 0.08, dashWidth, dashHeight);
  ctx.fillRect(width * 0.12, height * 0.62, dashWidth, dashHeight);
  ctx.shadowBlur = 0;

  // 5. Solid Yellow Road Margin Line on right edge
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(width * 0.90, -20, 16, height + 40);

  ctx.restore();
};

/**
 * Draw clear, sharply-visible Pothole Defect
 */
const drawPotholeDefect = (ctx, width, height, frameIndex, jx, jy) => {
  ctx.save();
  ctx.translate(jx, jy);

  const cx = width * 0.50;
  const cy = height * 0.50;
  const rx = width * 0.20; // 128px in 640w
  const ry = height * 0.26; // 93px in 360h

  // 1. Chipped asphalt pavement fracture halo around the rim (distressed grey)
  ctx.fillStyle = '#47515F';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 18, ry + 16, -0.04, 0, Math.PI * 2);
  ctx.fill();

  // 2. Loose aggregate & gravel stones along the rim (bright daylight stone fragments)
  ctx.fillStyle = '#CBD5E1';
  for (let i = 0; i < 32; i++) {
    const angle = i * 0.2 + (i % 3);
    const dist = (i % 2 === 0) ? rx + 8 + (i % 6) : ry + 6 + (i % 5);
    const gx = cx + Math.cos(angle) * (rx + (i % 8));
    const gy = cy + Math.sin(angle) * (ry + (i % 6));
    ctx.fillRect(gx, gy, (i % 3) + 2, (i % 2) + 2);
  }

  // 3. Deep cavity pit: Strong radial gradient from dark rim to deep pitch-black floor
  const pitGrad = ctx.createRadialGradient(cx - 15, cy - 12, 10, cx, cy, rx);
  pitGrad.addColorStop(0, '#020617'); // pitch black core
  pitGrad.addColorStop(0.55, '#0F172A'); // deep depression
  pitGrad.addColorStop(0.85, '#1E293B'); // steep cavity wall
  pitGrad.addColorStop(1, '#334155'); // eroded lip

  ctx.fillStyle = pitGrad;
  ctx.beginPath();
  // Irregular jagged natural pothole perimeter
  const numPoints = 20;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const wobble = Math.sin(angle * 5 + i) * 10 + Math.cos(angle * 3) * 6;
    const px = cx + Math.cos(angle) * (rx + wobble);
    const py = cy + Math.sin(angle) * (ry + wobble * 0.7);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // 4. Broken inner asphalt rocks in cavity
  ctx.fillStyle = '#64748B';
  for (let i = 0; i < 18; i++) {
    const angle = i * 0.55;
    const dist = (i % 4) * 14 + 10;
    const gx = cx + Math.cos(angle) * dist;
    const gy = cy + Math.sin(angle) * (dist * 0.6);
    ctx.fillRect(gx, gy, (i % 3) + 3, (i % 2) + 3);
  }

  // 5. Radiating surface stress fracture cracks
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  // Left crack
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx - 35, cy - 15);
  ctx.lineTo(cx - rx - 60, cy - 5);
  // Right crack
  ctx.moveTo(cx + rx, cy + 6);
  ctx.lineTo(cx + rx + 40, cy + 22);
  ctx.lineTo(cx + rx + 65, cy + 14);
  // Bottom crack
  ctx.moveTo(cx - 10, cy + ry);
  ctx.lineTo(cx + 8, cy + ry + 35);
  ctx.stroke();

  ctx.restore();
};

/**
 * Draw realistic daylight Waterlogging / Road Flooding Defect
 */
const drawWaterloggingDefect = (ctx, width, height, frameIndex, jx, jy) => {
  ctx.save();
  ctx.translate(jx, jy);

  const cx = width * 0.50;
  const cy = height * 0.52;
  const rx = width * 0.28;
  const ry = height * 0.28;

  // Wet dark road perimeter
  ctx.fillStyle = 'rgba(40, 50, 65, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 14, ry + 12, 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Standing water body with daylight sky reflection
  const waterGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  waterGrad.addColorStop(0, '#1E3A8A');
  waterGrad.addColorStop(0.3, '#2563EB');
  waterGrad.addColorStop(0.6, '#38BDF8');
  waterGrad.addColorStop(1, '#1E40AF');

  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Animated wave ripple rings
  const wavePhase = (frameIndex * 0.14) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.60 + Math.sin(wavePhase) * 5, ry * 0.60 + Math.sin(wavePhase) * 3, 0.04, 0, Math.PI * 2);
  ctx.stroke();

  // Specular daylight sheen
  const glareGrad = ctx.createRadialGradient(cx - 25, cy - 15, 2, cx - 25, cy - 15, 45);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glareGrad;
  ctx.beginPath();
  ctx.arc(cx - 25, cy - 15, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/**
 * Draw realistic daylight Garbage / Solid Waste Pile Defect
 */
const drawGarbageDefect = (ctx, width, height, frameIndex, jx, jy) => {
  ctx.save();
  ctx.translate(jx, jy);

  const cx = width * 0.48;
  const cy = height * 0.50;

  // Stained pavement footprint
  ctx.fillStyle = 'rgba(45, 52, 64, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 0.25, height * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dumped refuse items (multi-colored high-chroma clutter)
  const items = [
    { x: -55, y: -25, w: 45, h: 30, color: '#DC2626' }, // red carton
    { x: -22, y: -38, w: 34, h: 26, color: '#2563EB' }, // blue pack
    { x: 15, y: -28, w: 50, h: 34, color: '#F59E0B' },  // yellow wrapper
    { x: -38, y: 12, w: 58, h: 32, color: '#FFFFFF' },  // white bag
    { x: 22, y: 10, w: 40, h: 24, color: '#10B981' },   // green bottle
    { x: -6, y: 2, w: 32, h: 28, color: '#8B5CF6' },   // purple cup
    { x: 48, y: -12, w: 38, h: 26, color: '#F1F5F9' },  // crumpled paper
    { x: -12, y: 28, w: 46, h: 20, color: '#1E293B' }   // dark trash
  ];

  items.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(cx + item.x, cy + item.y, item.w, item.h, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  ctx.restore();
};

/**
 * Render single synthetic defect frame
 */
export const renderDemoFrame = (ctx, width, height, category = 'pothole', frameIndex = 0) => {
  const normCat = normalizeCategory(category);

  // Subtle realistic hand-held camera jitter (drift + shake)
  const jitterX = Math.sin(frameIndex * 0.18) * 2.5 + Math.cos(frameIndex * 0.08) * 1.5;
  const jitterY = Math.cos(frameIndex * 0.15) * 2.0 + Math.sin(frameIndex * 0.05) * 1.0;

  // 1. Bright Daylight Asphalt Road
  drawAsphaltBase(ctx, width, height, frameIndex, jitterX, jitterY);

  // 2. Specific Civic Defect
  if (normCat === 'waterlogging') {
    drawWaterloggingDefect(ctx, width, height, frameIndex, jitterX, jitterY);
  } else if (normCat === 'garbage') {
    drawGarbageDefect(ctx, width, height, frameIndex, jitterX, jitterY);
  } else {
    // Default: Pothole / Road Damage
    drawPotholeDefect(ctx, width, height, frameIndex, jitterX, jitterY);
  }

  // 3. Clear Timestamp & GPS Watermark overlay
  ctx.save();
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`CAM-01 • ${new Date().toISOString().substring(0, 19).replace('T', ' ')} • GPS LOCKED`, 14, height - 12);
  ctx.restore();
};

/**
 * Generates an authentic playable HTML5 video Blob (WebM) of demo road defect footage
 * using Canvas CaptureStream & MediaRecorder (16:9 widescreen 640x360).
 */
export const generateDemoRoadVideo = async (category = 'Pothole / Road Damage', durationSec = 2.5) => {
  const width = 640;
  const height = 360; // 16:9 widescreen to avoid black sidebars
  const fps = 30;
  const totalFrames = Math.round(durationSec * fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const normCat = normalizeCategory(category);

  // Precision 16:9 bounding box coordinates
  const boxConfig = {
    pothole: {
      label: 'POTHOLE DEFECT',
      confidence: 0.94,
      box: { x: 26, y: 16, width: 48, height: 68, label: 'POTHOLE DEFECT', confidence: 0.94 },
      reason: 'Potential road damage detected. Review the evidence before submitting.',
      features: ['Asphalt Road Confirmed', 'Cavity Edge Ratio: 8.4%', 'Depth Gradient Passed']
    },
    waterlogging: {
      label: 'WATERLOGGING / FLOODING',
      confidence: 0.92,
      box: { x: 18, y: 16, width: 64, height: 68, label: 'WATERLOGGING / FLOODING', confidence: 0.92 },
      reason: 'Standing water puddle & drainage obstruction detected on road surface.',
      features: ['Pavement Basin Confirmed', 'Specular Reflection Ratio: 14.2%', 'Road Curb Edge Verified']
    },
    garbage: {
      label: 'GARBAGE ACCUMULATION',
      confidence: 0.93,
      box: { x: 22, y: 18, width: 56, height: 64, label: 'GARBAGE ACCUMULATION', confidence: 0.93 },
      reason: 'Solid waste accumulation & surface refuse cluster detected.',
      features: ['Ground Footprint Confirmed', 'Chromatic Clutter Density: 16.5%', 'Surface Dispersal Verified']
    }
  };

  const selectedConfig = boxConfig[normCat] || boxConfig.pothole;

  // Try native Canvas captureStream + MediaRecorder
  return new Promise((resolve) => {
    let stream = null;
    try {
      if (typeof canvas.captureStream === 'function') {
        stream = canvas.captureStream(fps);
      }
    } catch (e) {
      console.warn('Canvas captureStream notice:', e);
    }

    if (!stream || typeof MediaRecorder === 'undefined') {
      // Direct high-res static frame fallback
      renderDemoFrame(ctx, width, height, category, 0);
      canvas.toBlob((imgBlob) => {
        const file = new File([imgBlob], `demo_${normCat}_evidence.webm`, { type: 'video/webm' });
        resolve({
          blob: imgBlob,
          file,
          validationResult: {
            valid: true,
            is_valid: true,
            verdict: 'verified',
            category,
            confidence: selectedConfig.confidence,
            reason: selectedConfig.reason,
            primary_box: selectedConfig.box,
            features: selectedConfig.features,
            action: 'submit'
          }
        });
      }, 'image/jpeg', 0.95);
      return;
    }

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const videoFile = new File([videoBlob], `demo_${normCat}_evidence_${Date.now()}.webm`, {
        type: videoBlob.type,
        lastModified: Date.now()
      });

      resolve({
        blob: videoBlob,
        file: videoFile,
        validationResult: {
          valid: true,
          is_valid: true,
          verdict: 'verified',
          category,
          confidence: selectedConfig.confidence,
          reason: selectedConfig.reason,
          primary_box: selectedConfig.box,
          features: selectedConfig.features,
          action: 'submit'
        }
      });
    };

    recorder.start(100);

    // Render animation frames
    let currentFrame = 0;
    const interval = setInterval(() => {
      renderDemoFrame(ctx, width, height, category, currentFrame);
      currentFrame++;

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch (err) {
              console.warn('Recorder stop error:', err);
            }
          }
        }, 150);
      }
    }, 1000 / fps);
  });
};

/**
 * Creates an active 30fps MediaStream of live animated road defect footage.
 * Can be hooked directly into `<video srcObject={stream}>` inside the Camera Viewfinder modal!
 */
export const createLiveDemoRoadStream = (category = 'Pothole / Road Damage') => {
  const width = 640;
  const height = 360;
  const fps = 30;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  let stream = null;
  try {
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(fps);
    }
  } catch (err) {
    console.warn('captureStream error:', err);
  }

  let frameIndex = 0;
  let animId = null;

  const renderLoop = () => {
    renderDemoFrame(ctx, width, height, category, frameIndex);
    frameIndex++;
    animId = requestAnimationFrame(renderLoop);
  };

  renderLoop();

  return {
    stream,
    stop: () => {
      if (animId) cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };
};
