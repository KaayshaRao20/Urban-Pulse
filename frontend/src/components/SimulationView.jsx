import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';

export default function SimulationView({ timestamp }) {
  // Input parameters state
  const [location, setLocation] = useState('Marathahalli - Outer Ring Road');
  const [dateVal, setDateVal] = useState('2026-09-27');
  const [timeVal, setTimeVal] = useState('14:30');
  const [trafficVol, setTrafficVol] = useState('6,500');
  const [avgSpeed, setAvgSpeed] = useState('18');
  const [crowdDensity, setCrowdDensity] = useState('520');
  const [weatherCondition, setWeatherCondition] = useState('Light Rain');
  const [tempC, setTempC] = useState('24');
  const [roadType, setRoadType] = useState('Urban Arterial');
  const [eventIncident, setEventIncident] = useState('None');
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Simulation output states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({
    status: 'Completed',
    execution_time_seconds: 6,
    predicted_condition: 'High Congestion',
    severity: 'High Severity',
    summary_alert: 'Traffic speed is significantly lower than usual due to high traffic volume, increased crowd density and light rain.',
    metrics: {
      traffic_speed: '18 km/h',
      traffic_speed_sub: '-62% vs baseline',
      crowd_density: '520 /km²',
      crowd_density_sub: '+18% vs baseline',
      weather: 'Light Rain',
      temp: '24°C',
      weather_sub: 'Possible impact on traffic',
      road_condition: 'Slower Flow',
      road_type: 'Urban Arterial',
      road_sub: 'Affected by rain'
    },
    factors: [
      { factor: 'Traffic Volume', pct: 42, color: '#EF4444' },
      { factor: 'Crowd Density', pct: 27, color: '#F97316' },
      { factor: 'Rainfall', pct: 18, color: '#3B82F6' },
      { factor: 'Time of Day', pct: 8, color: '#60A5FA' },
      { factor: 'Road Type', pct: 5, color: '#93C5FD' }
    ],
    explainable_ai: [
      'Traffic volume (6,500 vehicles/hour) is 42% higher than the typical range for this location and time.',
      'Crowd density (520 people/km²) is 18% higher than usual, indicating increased pedestrian activity.',
      'Light rain (24°C) is reducing road capacity and driving cautious behaviour among drivers.',
      'The combination of high traffic volume, elevated crowd density and rain leads to a significant reduction in average speed, resulting in high congestion.'
    ],
    recommendation: 'Consider diverting traffic to alternative routes.\nTraffic speed is significantly lower than usual and crowd density is increased near bus stops. Implement traffic diversion, enhance public transport frequency, and monitor the situation closely.',
    recommended_actions: [
      { text: 'Monitor traffic flow continuously', checked: true },
      { text: 'Consider traffic diversion to parallel routes', checked: true },
      { text: 'Deploy traffic control personnel at key junctions', checked: true },
      { text: 'Inform commuters via public channels', checked: false }
    ]
  });

  const [actions, setActions] = useState(analysisResult.recommended_actions);
  const [isExplainableOpen, setIsExplainableOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(true);

  // Mini map reference
  const miniMapRef = useRef(null);
  const miniMapInst = useRef(null);

  // Initialize Mini Map preview
  useEffect(() => {
    if (!window.L || !miniMapRef.current) return;
    if (miniMapInst.current) return;

    const map = window.L.map(miniMapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false
    }).setView([12.9569, 77.7011], 13);

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const pinIcon = window.L.divIcon({
      html: `<div style="width:20px; height:20px; border-radius:50%; background:#EF4444; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      className: 'mini-pin'
    });
    window.L.marker([12.9569, 77.7011], { icon: pinIcon }).addTo(map);

    miniMapInst.current = map;
  }, []);

  // Update mini map coordinates when location changes
  useEffect(() => {
    if (!miniMapInst.current) return;
    let lat = 12.9569, lng = 77.7011;
    if (location.includes('Whitefield')) { lat = 12.9698; lng = 77.7500; }
    else if (location.includes('Hebbal')) { lat = 13.0358; lng = 77.5970; }
    else if (location.includes('Indiranagar')) { lat = 12.9784; lng = 77.6408; }
    else if (location.includes('Koramangala')) { lat = 12.9352; lng = 77.6245; }
    else if (location.includes('Electronic')) { lat = 12.8452; lng = 77.6602; }
    else if (location.includes('BTM')) { lat = 12.9166; lng = 77.6101; }

    miniMapInst.current.setView([lat, lng], 13);
  }, [location]);

  // Run Scenario Simulation API call
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const numVol = parseFloat(trafficVol.replace(/,/g, '')) || 6500;
    const numSpeed = parseFloat(avgSpeed) || 18;
    const numCrowd = parseFloat(crowdDensity) || 520;
    const numTemp = parseFloat(tempC) || 24;

    try {
      const res = await fetch(`${API_BASE}/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          date: dateVal,
          time: timeVal,
          traffic_volume: numVol,
          traffic_volume_unit: 'vehicles/hour',
          avg_speed: numSpeed,
          avg_speed_unit: 'km/h',
          crowd_density: numCrowd,
          crowd_density_unit: 'people/km²',
          weather_condition: weatherCondition,
          temp_c: numTemp,
          road_type: roadType,
          event_incident: eventIncident
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        if (data.recommended_actions) {
          setActions(data.recommended_actions);
        }
      }
    } catch (e) {
      console.log("Simulation API error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Populate form with current telemetry live data
  const handleUseLiveData = () => {
    setLocation('Marathahalli - Outer Ring Road');
    setTrafficVol('6,500');
    setAvgSpeed('18');
    setCrowdDensity('520');
    setWeatherCondition('Light Rain');
    setTempC('24');
    setRoadType('Urban Arterial');
    setEventIncident('None');
    handleRunAnalysis();
  };

  // Reset form inputs
  const handleReset = () => {
    setLocation('Marathahalli - Outer Ring Road');
    setDateVal('2026-09-27');
    setTimeVal('14:30');
    setTrafficVol('6,500');
    setAvgSpeed('18');
    setCrowdDensity('520');
    setWeatherCondition('Light Rain');
    setTempC('24');
    setRoadType('Urban Arterial');
    setEventIncident('None');
  };

  const handleActionCheck = (index) => {
    const updated = [...actions];
    updated[index].checked = !updated[index].checked;
    setActions(updated);
  };

  const checkedCount = actions.filter(a => a.checked).length;

  // Download simulation report
  const downloadSimulationReport = async () => {
    const chkText = actions.filter(a => a.checked).map(a => a.text);
    try {
      const res = await fetch(`${API_BASE}/simulation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          date: dateVal,
          time: timeVal,
          predicted_condition: analysisResult.predicted_condition,
          severity: analysisResult.severity,
          selected_actions: chkText
        })
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.report_text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = data.filename;
        link.click();
      }
    } catch (e) {
      console.log("Download report error:", e);
    }
  };

  return (
    <div className="view-container">
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>Urban Simulation & Analysis</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>Provide input parameters to simulate urban conditions and evaluate real-time factor attribution and mitigation directives.</p>
        </div>

        <button
          onClick={() => setShowHowItWorksModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(226, 232, 240, 0.9)', padding: '0.45rem 0.85rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>How It Works</span>
        </button>
      </div>

      {/* Main 2-Column Grid Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: Panel 1 - Input Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Input Parameters</h3>
                  <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Set the location, time and key parameters to run the simulation.</p>
                </div>
              </div>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Reset</button>
            </div>

            {/* Input Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Row 1: Location, Date, Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Location / Zone</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="Marathahalli - Outer Ring Road">Marathahalli - Outer Ring Road</option>
                    <option value="Whitefield Main Road">Whitefield Main Road</option>
                    <option value="Hebbal Flyover Junction">Hebbal Flyover Junction</option>
                    <option value="Indiranagar 100ft Road">Indiranagar 100ft Road</option>
                    <option value="Koramangala 80ft Road">Koramangala 80ft Road</option>
                    <option value="Electronic City Phase 1">Electronic City Phase 1</option>
                    <option value="BTM Layout 2nd Stage">BTM Layout 2nd Stage</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Date</label>
                  <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Time</label>
                  <select value={timeVal} onChange={(e) => setTimeVal(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="14:30">14:30</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:30">17:30</option>
                    <option value="18:30">18:30</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Traffic Volume & Average Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Traffic Volume</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={trafficVol} onChange={(e) => setTrafficVol(e.target.value)} style={{ width: '55%', padding: '0.45rem 0.65rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.45rem 0.4rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.72rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="vehicles/hour">vehicles/hour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Average Speed</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={avgSpeed} onChange={(e) => setAvgSpeed(e.target.value)} style={{ width: '55%', padding: '0.45rem 0.65rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.45rem 0.4rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.72rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="km/h">km/h</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Crowd Density & Weather Condition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Crowd Density</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={crowdDensity} onChange={(e) => setCrowdDensity(e.target.value)} style={{ width: '55%', padding: '0.45rem 0.65rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.45rem 0.4rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.72rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="people/km²">people/km²</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Weather Condition</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)} style={{ flex: 1, padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                      <option value="Light Rain">Light Rain</option>
                      <option value="Heavy Rain">Heavy Rain</option>
                      <option value="Clear Sky">Clear Sky</option>
                      <option value="Overcast">Overcast</option>
                    </select>
                    <input type="text" value={tempC} onChange={(e) => setTempC(e.target.value)} style={{ width: 42, padding: '0.45rem 0.3rem', textAlign: 'center', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>°C</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Road Type & Event/Incident */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Road Type</label>
                  <select value={roadType} onChange={(e) => setRoadType(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="Urban Arterial">Urban Arterial</option>
                    <option value="Expressway / Highway">Expressway / Highway</option>
                    <option value="Secondary Arterial">Secondary Arterial</option>
                    <option value="Local Access Road">Local Access Road</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Event / Incident (Optional)</label>
                  <select value={eventIncident} onChange={(e) => setEventIncident(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="None">None</option>
                    <option value="VIP Convoy Movement">VIP Convoy Movement</option>
                    <option value="Public Rally / Concert">Public Rally / Concert</option>
                    <option value="Road Maintenance Closure">Road Maintenance Closure</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '0.5rem' }}>
                <button onClick={handleUseLiveData} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFFFFF', border: '1.5px solid #10B981', color: '#065F46', padding: '0.65rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                  <span>Use Current Live Data</span>
                </button>

                <button onClick={handleRunAnalysis} disabled={isAnalyzing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#059669', border: 'none', color: '#FFFFFF', padding: '0.65rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s ease' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'currentColor' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>{isAnalyzing ? 'Simulating...' : 'Run Analysis'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Sub-Card: Input Summary */}
          <div className="glass-panel" style={{ padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                <span>Input Summary</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Edit</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1rem', alignItems: 'center' }}>
              {/* Mini Map Container */}
              <div ref={miniMapRef} style={{ width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', border: '1px solid #CBD5E1', zindex: 1 }}></div>

              {/* Summary Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.76rem', color: '#334155' }}>
                <div><span style={{ color: '#64748B' }}>Location</span>: <strong>{location}</strong></div>
                <div><span style={{ color: '#64748B' }}>Date & Time</span>: <strong>{dateVal}, {timeVal}</strong></div>
                <div><span style={{ color: '#64748B' }}>Traffic Volume</span>: <strong>{trafficVol} vehicles/hour</strong></div>
                <div><span style={{ color: '#64748B' }}>Average Speed</span>: <strong>{avgSpeed} km/h</strong></div>
                <div><span style={{ color: '#64748B' }}>Crowd Density</span>: <strong>{crowdDensity} people/km²</strong></div>
                <div><span style={{ color: '#64748B' }}>Weather</span>: <strong>{weatherCondition}, {tempC}°C</strong></div>
                <div><span style={{ color: '#64748B' }}>Road Type</span>: <strong>{roadType}</strong></div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Panel 2 - Analysis Results */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Panel 2 Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>2</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Analysis Results</h3>
                <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Simulation output based on the provided input parameters.</p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800 }}>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Analysis Completed
              </span>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>Completed in {analysisResult.execution_time_seconds || 6} seconds</div>
            </div>
          </div>

          {/* Top Result Banner (Light Red Tint Box) */}
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EF4444', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 600 }}>Predicted Urban Condition</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B' }}>{analysisResult.predicted_condition}</span>
                <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>{analysisResult.severity}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#7F1D1D', marginTop: 3, lineHeight: 1.35 }}>{analysisResult.summary_alert}</div>
            </div>
          </div>

          {/* 4 Metric Output Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#EF4444', fill: 'none', strokeWidth: 2 }}><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
                <span>Traffic Speed</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{analysisResult.metrics?.traffic_speed || '18 km/h'}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>{analysisResult.metrics?.traffic_speed_sub || '-62% vs baseline'}</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#2563EB', fill: 'none', strokeWidth: 2 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Crowd Density</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{analysisResult.metrics?.crowd_density || '520 /km²'}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>{analysisResult.metrics?.crowd_density_sub || '+18% vs baseline'}</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#0284C7', fill: 'none', strokeWidth: 2 }}><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>
                <span>Weather</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{analysisResult.metrics?.weather || 'Light Rain'}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', marginTop: 1 }}>{analysisResult.metrics?.temp || '24°C'} Possible impact on traffic</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#D97706', fill: 'none', strokeWidth: 2 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                <span>Road Condition</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{analysisResult.metrics?.road_condition || 'Slower Flow'}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748B', marginTop: 1 }}>{analysisResult.metrics?.road_type || 'Urban Arterial'} Affected by rain</div>
            </div>
          </div>

          {/* 2-Column Factors & Factor Attribution Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', marginTop: '0.25rem' }}>
            {/* Left: Key Contributing Factors */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.6rem' }}>Key Contributing Factors</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(analysisResult.factors || []).map((f, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 32px', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{f.factor}</span>
                    <div style={{ background: '#F1F5F9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ background: f.color || '#059669', width: `${f.pct}%`, height: '100%', borderRadius: 4 }}></div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Decision Factor Attribution */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', cursor: 'pointer' }} onClick={() => setIsExplainableOpen(!isExplainableOpen)}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>Decision Factor Attribution</h4>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, transform: isExplainableOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
              </div>

              {isExplainableOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(analysisResult.explainable_ai || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.73rem', lineHeight: 1.35, color: '#334155' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operational Mitigation Protocol Box (Light Green Tint Box) */}
          <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0, marginTop: 2 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065F46' }}>Operational Mitigation Protocol</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', marginTop: 2 }}>Consider diverting traffic to alternative routes.</div>
              <div style={{ fontSize: '0.74rem', color: '#065F46', marginTop: 3, lineHeight: 1.35 }}>
                Traffic speed is significantly lower than usual and crowd density is increased near bus stops. Implement traffic diversion, enhance public transport frequency, and monitor the situation closely.
              </div>
            </div>
          </div>

          {/* Recommended Actions Accordion */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsActionsOpen(!isActionsOpen)}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>Recommended Actions ({checkedCount}/{actions.length})</span>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, transform: isActionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isActionsOpen && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {actions.map((act, index) => (
                  <label key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={act.checked} onChange={() => handleActionCheck(index)} style={{ accentColor: '#059669', cursor: 'pointer' }} />
                    <span>{act.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Download Report Button */}
          <button onClick={downloadSimulationReport} style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 8, width: '100%', background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '0.65rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download Analysis Report</span>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none', strokeWidth: 2, marginLeft: 'auto' }}><path d="M6 9l6 6 6-6"/></svg>
          </button>

        </div>

      </div>

      {/* How It Works Glassmorphic Modal */}
      {showHowItWorksModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowHowItWorksModal(false)}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyCenter: 'center', border: '1px solid #A7F3D0' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Urban Simulation Architecture</h2>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Counterfactual what-if modeling and multi-modal feature attribution</p>
                </div>
              </div>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                style={{ border: 'none', background: '#F1F5F9', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                title="Close"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.55 }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>1. Counterfactual Scenario Engine</strong>
                When you tweak traffic volume, pedestrian counts, or rainfall levels, the simulation engine runs an inference pass against the trained Random Forest / XGBoost ensemble models to predict flow degradation before it occurs in physical reality.
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>2. Factor Attribution Model (Feature Importance Engine)</strong>
                Rather than treating prediction as an opaque model, each output decomposes into ranked contributing factors (e.g. 42% Traffic Volume, 27% Crowd Density, 18% Rainfall) using tree-path attribution algorithms.
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>3. Actionable Mitigation Synthesis</strong>
                Identified bottlenecks generate targeted operational counter-measures, such as Variable Message Sign (VMS) rerouting, adaptive signal cycle overrides, and public transit shuttle dispatch.
              </div>
            </div>

            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                style={{ background: '#059669', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
