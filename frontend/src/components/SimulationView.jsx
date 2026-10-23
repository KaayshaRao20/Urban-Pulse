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
    else if (location.includes('MG Road')) { lat = 12.9756; lng = 77.6066; }
    else if (location.includes('Marathahalli')) { lat = 12.9569; lng = 77.7011; }

    miniMapInst.current.setView([lat, lng], 13);
  }, [location]);

  // Fetch canonical location list on mount
  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const res = await fetch(`${API_BASE}/focus/locations`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLocationsList(data);
          }
        }
      } catch (e) {
        console.warn("Locations fetch note:", e);
      }
    };
    fetchLocs();
  }, []);

  const [isLiveData, setIsLiveData] = useState(false);
  const [liveDataTimestamp, setLiveDataTimestamp] = useState(null);
  const [locationsList, setLocationsList] = useState([]);

  // Internal executor for simulation
  const executeSimulation = async ({ loc, vol, speed, crowd, weather, temp, road, date, time, incident }) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: loc,
          date: date,
          time: time,
          traffic_volume: vol,
          traffic_volume_unit: 'vehicles/hour',
          avg_speed: speed,
          avg_speed_unit: 'km/h',
          crowd_density: crowd,
          crowd_density_unit: 'people/km²',
          weather_condition: weather,
          temp_c: temp,
          road_type: road,
          event_incident: incident
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        if (data.recommended_actions) {
          setActions(data.recommended_actions);
        }
        return;
      }
    } catch (e) {
      console.warn("Simulation API error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Scenario Simulation API call from user inputs
  const handleRunAnalysis = async () => {
    setIsLiveData(false);
    const numVol = parseFloat(trafficVol.replace(/,/g, '')) || 6500;
    const numSpeed = parseFloat(avgSpeed) || 18;
    const numCrowd = parseFloat(crowdDensity) || 520;
    const numTemp = parseFloat(tempC) || 24;

    await executeSimulation({
      loc: location,
      vol: numVol,
      speed: numSpeed,
      crowd: numCrowd,
      weather: weatherCondition,
      temp: numTemp,
      road: roadType,
      date: dateVal,
      time: timeVal,
      incident: eventIncident
    });
  };

  // Populate form with current telemetry live data from backend
  const handleUseLiveData = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/simulation/live?location=${encodeURIComponent(location)}`);
      if (res.ok) {
        const live = await res.json();
        setTrafficVol(Math.round(live.traffic_volume).toLocaleString());
        setAvgSpeed(String(Math.round(live.avg_speed)));
        setCrowdDensity(String(Math.round(live.crowd_density)));
        setWeatherCondition(live.weather_condition || 'Light Rain');
        setTempC(String(Math.round(live.temp_c)));
        setRoadType(live.road_type || 'Urban Arterial');
        setEventIncident('None');
        setDateVal(live.date || new Date().toISOString().split('T')[0]);
        setTimeVal(live.time || new Date().toTimeString().slice(0, 5));
        setIsLiveData(true);
        setLiveDataTimestamp(live.timestamp);

        await executeSimulation({
          loc: live.location,
          vol: live.traffic_volume,
          speed: live.avg_speed,
          crowd: live.crowd_density,
          weather: live.weather_condition,
          temp: live.temp_c,
          road: live.road_type,
          date: live.date,
          time: live.time,
          incident: 'None'
        });
        return;
      }
    } catch (e) {
      console.warn("Use current live data note:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset form inputs
  const handleReset = () => {
    setIsLiveData(false);
    setLiveDataTimestamp(null);
    setLocation('Marathahalli – Outer Ring Road');
    setDateVal(new Date().toISOString().split('T')[0]);
    setTimeVal(new Date().toTimeString().slice(0, 5));
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
      <div className="simulation-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Panel 1 - Input Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          <div className="glass-panel" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Input Parameters</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>Set corridor parameters to evaluate simulated traffic and crowd pressure.</p>
                </div>
              </div>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Reset</button>
            </div>

            {/* Input Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              
              {/* Row 1: Location, Date, Time */}
              <div className="simulation-form-row-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Location / Zone</label>
                  <select value={location} onChange={(e) => { setLocation(e.target.value); setIsLiveData(false); }} style={{ width: '100%', padding: '0.38rem 0.55rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    {locationsList.length > 0 ? (
                      locationsList.map(l => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Marathahalli – Outer Ring Road">Marathahalli – Outer Ring Road</option>
                        <option value="MG Road Interchange">MG Road Interchange</option>
                        <option value="Indiranagar 100ft Road">Indiranagar 100ft Road</option>
                        <option value="Whitefield IT Corridor">Whitefield IT Corridor</option>
                        <option value="Koramangala 80ft Junction">Koramangala 80ft Junction</option>
                        <option value="Electronic City Phase 1">Electronic City Phase 1</option>
                        <option value="Hebbal Flyover Junction">Hebbal Flyover Junction</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Date</label>
                  <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={{ width: '100%', padding: '0.38rem 0.55rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Time</label>
                  <select value={timeVal} onChange={(e) => setTimeVal(e.target.value)} style={{ width: '100%', padding: '0.38rem 0.55rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="14:30">14:30</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:30">17:30</option>
                    <option value="18:30">18:30</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Traffic Volume & Average Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Traffic Volume</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={trafficVol} onChange={(e) => setTrafficVol(e.target.value)} style={{ width: '55%', padding: '0.38rem 0.55rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.38rem 0.35rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.7rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="vehicles/hour">veh/hr</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Average Speed</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={avgSpeed} onChange={(e) => setAvgSpeed(e.target.value)} style={{ width: '55%', padding: '0.38rem 0.55rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.38rem 0.35rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.7rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="km/h">km/h</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Crowd Density & Weather Condition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Crowd Density</label>
                  <div style={{ display: 'flex' }}>
                    <input type="text" value={crowdDensity} onChange={(e) => setCrowdDensity(e.target.value)} style={{ width: '55%', padding: '0.38rem 0.55rem', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <select style={{ width: '45%', padding: '0.38rem 0.35rem', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.7rem', fontWeight: 600, color: '#475569', outline: 'none' }}>
                      <option value="people/km²">/km²</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Weather Condition</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)} style={{ flex: 1, padding: '0.38rem 0.45rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.76rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                      <option value="Light Rain">Light Rain</option>
                      <option value="Heavy Rain">Heavy Rain</option>
                      <option value="Clear Sky">Clear Sky</option>
                      <option value="Overcast">Overcast</option>
                    </select>
                    <input type="text" value={tempC} onChange={(e) => setTempC(e.target.value)} style={{ width: 38, padding: '0.38rem 0.2rem', textAlign: 'center', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.76rem', fontWeight: 700, color: '#0F172A', outline: 'none' }} />
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>°C</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Road Type & Event/Incident */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Road Type</label>
                  <select value={roadType} onChange={(e) => setRoadType(e.target.value)} style={{ width: '100%', padding: '0.38rem 0.55rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="Urban Arterial">Urban Arterial</option>
                    <option value="Expressway / Highway">Expressway / Highway</option>
                    <option value="Secondary Arterial">Secondary Arterial</option>
                    <option value="Local Access Road">Local Access Road</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Event / Incident</label>
                  <select value={eventIncident} onChange={(e) => setEventIncident(e.target.value)} style={{ width: '100%', padding: '0.38rem 0.55rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}>
                    <option value="None">None</option>
                    <option value="VIP Convoy Movement">VIP Convoy Movement</option>
                    <option value="Public Rally / Concert">Public Rally / Concert</option>
                    <option value="Road Maintenance Closure">Road Maintenance Closure</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '0.35rem' }}>
                <button onClick={handleUseLiveData} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFFFFF', border: '1.5px solid #10B981', color: '#065F46', padding: '0.5rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                  <span>Use Current Live Data</span>
                </button>

                <button onClick={handleRunAnalysis} disabled={isAnalyzing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#059669', border: 'none', color: '#FFFFFF', padding: '0.5rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s ease' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'currentColor' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>{isAnalyzing ? 'Simulating...' : 'Run Simulation'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Sub-Card: Input Summary */}
          <div className="glass-panel" style={{ padding: '0.75rem 0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.4rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                <span>Configuration Preview</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}>Edit</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.85rem', alignItems: 'center' }}>
              {/* Mini Map Container */}
              <div ref={miniMapRef} style={{ width: '100%', height: 110, borderRadius: 6, overflow: 'hidden', border: '1px solid #CBD5E1', zIndex: 1 }}></div>

              {/* Summary Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: '#334155' }}>
                <div><span style={{ color: '#64748B' }}>Corridor</span>: <strong>{location}</strong></div>
                <div><span style={{ color: '#64748B' }}>Telemetry</span>: <strong>{trafficVol} v/h • {avgSpeed} km/h</strong></div>
                <div><span style={{ color: '#64748B' }}>Density</span>: <strong>{crowdDensity} /km²</strong></div>
                <div><span style={{ color: '#64748B' }}>Atmosphere</span>: <strong>{weatherCondition}, {tempC}°C</strong></div>
                <div><span style={{ color: '#64748B' }}>Class</span>: <strong>{roadType}</strong></div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Panel 2 - Analysis Results */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Panel 2 Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Analysis Results</h3>
                <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>Predictive condition forecast derived from input telemetry.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isLiveData ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 800 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  Live Telemetry ({liveDataTimestamp ? liveDataTimestamp.split(',')[1] || liveDataTimestamp : 'Active Stream'})
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 800 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }}></span>
                  Simulated Scenario
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '2px 7px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 800 }}>
                <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                {analysisResult.status || 'Completed'} ({analysisResult.execution_time_seconds || 3}s)
              </span>
            </div>
          </div>

          {/* Top Result Banner (Light Red Tint Box) */}
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#EF4444', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.66rem', color: '#991B1B', fontWeight: 600 }}>Predicted Urban Condition</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991B1B' }}>{analysisResult.predicted_condition}</span>
                <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>{analysisResult.severity}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#7F1D1D', marginTop: 2, lineHeight: 1.3 }}>{analysisResult.summary_alert}</div>
            </div>
          </div>

          {/* 4 Metric Output Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 6, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="#EF4444" fill="none" strokeWidth="2"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/></svg>
                <span>Speed</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{analysisResult.metrics?.traffic_speed || '18 km/h'}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#EF4444' }}>{analysisResult.metrics?.traffic_speed_sub || '-62%'}</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 6, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="#2563EB" fill="none" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>Crowd</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{analysisResult.metrics?.crowd_density || '520 /km²'}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#EF4444' }}>{analysisResult.metrics?.crowd_density_sub || '+18%'}</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 6, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="#0284C7" fill="none" strokeWidth="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>
                <span>Weather</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{analysisResult.metrics?.temp || '24°C'}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#64748B' }}>{analysisResult.metrics?.weather || 'Rain'}</div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 6, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="#D97706" fill="none" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                <span>Road Flow</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{analysisResult.metrics?.road_condition || 'Slower'}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#64748B' }}>{analysisResult.metrics?.road_type || 'Arterial'}</div>
            </div>
          </div>

          {/* 2-Column Factors & Factor Attribution Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
            {/* Left: Key Contributing Factors */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '0.65rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem 0' }}>Contributing Factors</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(analysisResult.factors || []).map((f, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '85px 1fr 30px', alignItems: 'center', gap: 6, fontSize: '0.68rem' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{f.factor}</span>
                    <div style={{ background: '#F1F5F9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ background: f.color || '#059669', width: `${f.pct}%`, height: '100%', borderRadius: 3 }}></div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Decision Factor Attribution */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => setIsExplainableOpen(!isExplainableOpen)}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Pattern Attribution</h4>
                <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: 'currentColor', fill: 'none', strokeWidth: 2, transform: isExplainableOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
              </div>

              {isExplainableOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(analysisResult.explainable_ai || []).slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.68rem', lineHeight: 1.3, color: '#334155' }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', fontWeight: 800, fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operational Mitigation Protocol Box (Light Green Tint Box) */}
          <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065F46' }}>Operational Mitigation Protocol</div>
              <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 1, lineHeight: 1.3 }}>
                {analysisResult.recommendation?.slice(0, 150) || 'Implement corridor signal hold on side arteries and alert traffic police squad.'}
              </div>
            </div>
          </div>

          {/* Recommended Actions Accordion */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsActionsOpen(!isActionsOpen)}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F172A' }}>Recommended Actions ({checkedCount}/{actions.length})</span>
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: 'currentColor', fill: 'none', strokeWidth: 2, transform: isActionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isActionsOpen && (
              <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {actions.map((act, index) => (
                  <label key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={act.checked} onChange={() => handleActionCheck(index)} style={{ accentColor: '#059669', cursor: 'pointer' }} />
                    <span>{act.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Download Report Button */}
          <button onClick={downloadSimulationReport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '0.5rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download Analysis Report</span>
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
