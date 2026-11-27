import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Maximize2, ShieldCheck, Video, Image, RotateCcw, AlertTriangle } from 'lucide-react';
import { renderDemoFrame, normalizeCategory } from '../services/demoRoadVideoService';

export const CATEGORY_DEFECT_PHOTOS = {
  pothole: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
  road: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=800&auto=format&fit=crop&q=80",
  garbage: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80",
  waste: "https://images.unsplash.com/photo-1528323273322-d81458248d40?w=800&auto=format&fit=crop&q=80",
  drainage: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop&q=80",
  flood: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
  water: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop&q=80",
  light: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80",
  electrical: "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80",
  traffic: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80",
  hazard: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80"
};

export const getCategoryDefectPhoto = (category) => {
  const c = (category || '').toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_DEFECT_PHOTOS)) {
    if (c.includes(key)) return url;
  }
  return CATEGORY_DEFECT_PHOTOS.pothole;
};

export default function DefectEvidencePlayer({
  category = 'Pothole / Road Damage',
  imageUrl = null,
  isVideo = true,
  videoDuration = '0:26',
  ticketNumber = 'UP-2026-3841',
  location = 'Hosur Road near Electronic City Toll Gate',
  onInspectFullscreen = null
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeMode, setActiveMode] = useState(isVideo ? 'video' : 'photo'); // 'video' | 'photo'
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedKeyframe, setSelectedKeyframe] = useState(null);
  const [showAiBBox, setShowAiBBox] = useState(true);

  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const frameIndexRef = useRef(0);

  // Parse total duration in seconds (e.g., "0:26" -> 26)
  const totalDurationSec = useMemo(() => {
    if (!videoDuration) return 26;
    const parts = videoDuration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) || 26;
    }
    return 26;
  }, [videoDuration]);

  // AI Bounding Box & Metadata based on category
  const aiDetectionData = useMemo(() => {
    const c = (category || '').toLowerCase();
    if (c.includes('garbage') || c.includes('waste')) {
      return {
        label: 'SOLID WASTE CLUTTER',
        confidence: '89.5%',
        color: '#F59E0B',
        box: { top: '35%', left: '26%', width: '48%', height: '52%' },
        code: 'SWM-CLR-09'
      };
    }
    if (c.includes('drainage') || c.includes('water') || c.includes('flood')) {
      return {
        label: 'WATERLOGGING / SEEPAGE',
        confidence: '92.4%',
        color: '#0284C7',
        box: { top: '30%', left: '20%', width: '60%', height: '56%' },
        code: 'HYD-STORM-04'
      };
    }
    if (c.includes('light') || c.includes('electrical')) {
      return {
        label: 'STREETLIGHT FIXTURE OUTAGE',
        confidence: '88.1%',
        color: '#8B5CF6',
        box: { top: '15%', left: '38%', width: '24%', height: '70%' },
        code: 'ELE-LUM-12'
      };
    }
    if (c.includes('traffic')) {
      return {
        label: 'ROADWAY TRAFFIC HAZARD',
        confidence: '91.0%',
        color: '#DC2626',
        box: { top: '25%', left: '25%', width: '50%', height: '55%' },
        code: 'TRAF-OBS-01'
      };
    }
    return {
      label: 'ROAD CAVITY / POTHOLE',
      confidence: '94.2%',
      color: '#EF4444',
      box: { top: '28%', left: '24%', width: '52%', height: '52%' },
      code: 'PAV-CAV-88'
    };
  }, [category]);

  // Safe High-Res photo URL
  const resolvedPhotoUrl = useMemo(() => {
    if (imageUrl && imageUrl.startsWith('http')) return imageUrl;
    return getCategoryDefectPhoto(category);
  }, [imageUrl, category]);

  // Canvas render animation loop
  useEffect(() => {
    if (activeMode !== 'video') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const renderLoop = () => {
      if (!isSubscribed) return;
      if (isPlaying) {
        renderDemoFrame(ctx, canvas.width, canvas.height, category, frameIndexRef.current);
        frameIndexRef.current = (frameIndexRef.current + 1) % 900;
        setCurrentTime((prev) => {
          const next = prev + 0.033;
          return next >= totalDurationSec ? 0 : next;
        });
      }
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [activeMode, isPlaying, category, totalDurationSec]);

  const togglePlay = () => setIsPlaying(p => !p);

  const formatTime = (secs) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: '#090D16',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid #1E293B',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Media Mode Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: '#0F172A',
        borderBottom: '1px solid #1E293B',
        fontSize: '0.74rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#10B981',
            fontWeight: 800,
            fontSize: '0.7rem',
            background: 'rgba(16, 185, 129, 0.15)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            AI EVIDENCE VERIFIED
          </span>
          <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.68rem' }}>
            {ticketNumber}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveMode('video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '5px',
              border: 'none',
              background: activeMode === 'video' ? '#2563EB' : 'transparent',
              color: activeMode === 'video' ? '#FFFFFF' : '#94A3B8',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Video size={12} />
            <span>Inspection Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('photo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '5px',
              border: 'none',
              background: activeMode === 'photo' ? '#2563EB' : 'transparent',
              color: activeMode === 'photo' ? '#FFFFFF' : '#94A3B8',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Image size={12} />
            <span>HD Photo</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '190px',
        background: '#020617',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {activeMode === 'video' ? (
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <img
            src={resolvedPhotoUrl}
            alt="High-resolution civic defect evidence"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              const fb = getCategoryDefectPhoto(category);
              if (e.target.src !== fb) e.target.src = fb;
            }}
          />
        )}

        {/* Real-time YOLO Bounding Box Overlay */}
        {showAiBBox && (
          <div style={{
            position: 'absolute',
            top: aiDetectionData.box.top,
            left: aiDetectionData.box.left,
            width: aiDetectionData.box.width,
            height: aiDetectionData.box.height,
            border: `2px dashed ${aiDetectionData.color}`,
            borderRadius: '6px',
            boxShadow: `0 0 12px ${aiDetectionData.color}44`,
            pointerEvents: 'none',
            transition: 'all 0.15s ease'
          }}>
            {/* Corner Reticles */}
            <div style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderTop: `3px solid ${aiDetectionData.color}`, borderLeft: `3px solid ${aiDetectionData.color}` }} />
            <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderTop: `3px solid ${aiDetectionData.color}`, borderRight: `3px solid ${aiDetectionData.color}` }} />
            <div style={{ position: 'absolute', bottom: -3, left: -3, width: 8, height: 8, borderBottom: `3px solid ${aiDetectionData.color}`, borderLeft: `3px solid ${aiDetectionData.color}` }} />
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 8, height: 8, borderBottom: `3px solid ${aiDetectionData.color}`, borderRight: `3px solid ${aiDetectionData.color}` }} />

            {/* YOLO Label Tag */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: 0,
              background: aiDetectionData.color,
              color: '#FFFFFF',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
            }}>
              <span>[YOLO-v11] {aiDetectionData.label}</span>
              <span style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 3px', borderRadius: '3px' }}>
                {aiDetectionData.confidence}
              </span>
            </div>
          </div>
        )}

        {/* Live HUD Telemetry Overlay */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '10px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '3px 8px',
          borderRadius: '4px',
          color: '#E2E8F0',
          fontFamily: 'monospace',
          fontSize: '0.64rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none'
        }}>
          <span style={{ color: '#10B981' }}>● REC</span>
          <span>30 FPS</span>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span>{aiDetectionData.code}</span>
        </div>

        {/* Bottom Play Overlay Control */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {activeMode === 'video' && (
            <button
              type="button"
              onClick={togglePlay}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#0F172A',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
            </button>
          )}

          {/* Time Scrubber */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              cursor: 'pointer'
            }}>
              <div style={{
                width: `${(currentTime / totalDurationSec) * 100}%`,
                height: '100%',
                background: '#3B82F6',
                borderRadius: '2px',
                transition: 'width 0.1s linear'
              }} />
            </div>
            <span style={{ color: '#E2E8F0', fontSize: '0.66rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {formatTime(currentTime)} / {videoDuration || '0:26'}
            </span>
          </div>

          {/* BBox Toggle */}
          <button
            type="button"
            onClick={() => setShowAiBBox(b => !b)}
            title="Toggle YOLO Bounding Box"
            style={{
              background: showAiBBox ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${showAiBBox ? '#3B82F6' : 'transparent'}`,
              color: showAiBBox ? '#60A5FA' : '#94A3B8',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.64rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            YOLO HUD
          </button>

          {/* Fullscreen Button */}
          {onInspectFullscreen && (
            <button
              type="button"
              onClick={onInspectFullscreen}
              title="Inspect Fullscreen"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#E2E8F0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Extracted Keyframes Row (Zero Black Boxes) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 10px 8px 10px'
      }}>
        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94A3B8', whiteSpace: 'nowrap' }}>
          Keyframes:
        </div>

        {[
          { id: 1, time: '0.5s', label: 'Inlet Surface' },
          { id: 2, time: '1.2s', label: 'Cavity Core' },
          { id: 3, time: '2.0s', label: 'Lane Margin' }
        ].map((kf, i) => (
          <div
            key={kf.id}
            onClick={() => setSelectedKeyframe(kf)}
            style={{
              position: 'relative',
              width: '52px',
              height: '36px',
              borderRadius: '4px',
              overflow: 'hidden',
              border: selectedKeyframe?.id === kf.id ? '2px solid #3B82F6' : '1px solid #334155',
              cursor: 'pointer',
              background: '#1E293B'
            }}
            title={`Inspect keyframe #${kf.id} (${kf.time})`}
          >
            <img
              src={resolvedPhotoUrl}
              alt={`Frame ${kf.id}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: i === 1 ? 'contrast(1.15) brightness(0.95)' : (i === 2 ? 'hue-rotate(5deg)' : 'none')
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.7)',
              color: '#FFFFFF',
              fontSize: '0.55rem',
              fontFamily: 'monospace',
              textAlign: 'center',
              lineHeight: '12px'
            }}>
              {kf.time}
            </div>
          </div>
        ))}

        <div style={{
          marginLeft: 'auto',
          fontSize: '0.65rem',
          color: '#64748B',
          fontFamily: 'monospace'
        }}>
          GPS: LOCKED (50m)
        </div>
      </div>

      {/* Keyframe Inspector Modal */}
      {selectedKeyframe && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setSelectedKeyframe(null)}>
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '540px',
            width: '100%',
            color: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                🔍 Keyframe Inspector • #{selectedKeyframe.id} ({selectedKeyframe.time})
              </div>
              <button
                type="button"
                onClick={() => setSelectedKeyframe(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ width: '100%', height: '260px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <img
                src={resolvedPhotoUrl}
                alt="Keyframe inspection"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                border: `2px solid ${aiDetectionData.color}`,
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.75)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                [CONFIRMED DEFECT] {aiDetectionData.label} ({aiDetectionData.confidence})
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#94A3B8' }}>
              Geotagged forensic frame captured for BBMP dispatch verification.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
