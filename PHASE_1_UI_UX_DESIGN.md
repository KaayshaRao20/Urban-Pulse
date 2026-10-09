# UrbanPulse – Smart City Monitoring & Response Network
## Phase 1: UI/UX Design System & Authority Dashboard Specification

---

## 1. Design Aesthetics & Visual Identity Directive

The UrbanPulse user interface is engineered to provide an **enterprise-grade, government-operations aesthetic**. The platform must evoke operational authority, technical clarity, high data density, and immediate situation awareness suited for municipal control rooms.

### 1.1 Prohibited Design Anti-Patterns
To ensure academic maturity and enterprise credibility, the UI strictly avoids:
* ❌ Gaming-style HUD visuals, sci-fi borders, or neon glow effects.
* ❌ Unnecessary glassmorphism, heavy blur effects, or translucent frost overlays.
* ❌ Overly rounded, bubbly cards or consumer-facing mobile card aesthetics.
* ❌ Excessive decorative animations, floating particles, or flashy transition effects.
* ❌ Cartoon or playful iconography.

### 1.2 Required Enterprise Aesthetic Characteristics
* ✅ Crisp, subtle structural borders and clean grid alignments.
* ✅ Clear typographic hierarchy using modern sans-serif fonts (e.g., Inter, Roboto).
* ✅ High contrast data display with controlled visual weight.
* ✅ Standardized semantic indicator badges for rapid operational assessment.

---

## 2. Official Brand Color Palette Tokens

The interface enforces a authoritative **Dark Green** enterprise color system. Semantic status colors are restricted strictly to state indicators.

```
PRIMARY DARK GREEN  [ #0B3D2E ]  ■ Header / Navigation / Core Elements
SECONDARY GREEN     [ #145A43 ]  ■ Primary Action / Active States
ACCENT GREEN        [ #1F7A5A ]  ■ Highlights / Selected Borders
LIGHT BACKGROUND    [ #F4F7F5 ]  ■ App Canvas Background
DARK HEADER         [ #092C22 ]  ■ Top Navigation Bar
PRIMARY TEXT        [ #17231F ]  ■ High Contrast Headings / Labels
SECONDARY TEXT      [ #5B6B64 ]  ■ Muted Descriptions / Subheaders
WHITE SURFACE       [ #FFFFFF ]  ■ Content Card Backgrounds
```

### 2.1 Semantic Status Color System
Semantic colors indicate operational state and alert severity. They must maintain high visual contrast against dark green navigation and white card surfaces:

| Status State | Color Name | Hex Code | Visual Application |
| :--- | :--- | :--- | :--- |
| **Normal Condition** | Forest Green | `#1E8E3E` | Normal urban state, connected sensors, optimal throughput. |
| **Moderate / Warning** | Amber / Gold | `#F9AB00` | Moderate congestion, elevated crowd density, weather advisory. |
| **Critical / High Risk** | Deep Crimson | `#D93025` | Impending urban breakdown, severe severe weather/crowd spike alert. |
| **Information / System** | Operational Blue | `#1A73E8` | System notices, telemetry updates, scenario simulation metadata. |

---

## 3. Target Authority Dashboard Structure (7 Core Sections)

The Authority Dashboard is structured into seven specialized operational modules:

```
+-----------------------------------------------------------------------------------------------+
| TOP NAVIGATION: UrbanPulse | Live Monitoring | Predictions | Alerts | Scenario | Analytics      |
+-----------------------------------------------------------------------------------------------+
| SECTION 1: SYSTEM & DATA STATUS BAR                                                           |
| [Data Stream: CONNECTED]   [Last Update: 14:08:22]   [ML Engine: ACTIVE (XGBoost v1.0)]       |
+------------------------------------+----------------------------------------------------------+
| SECTION 2: URBAN CONDITION OVERVIEW| SECTION 3: INTERACTIVE URBAN MAP                         |
| • Current Index: Moderate          | • Vector base map                                        |
| • Monitored Zones: 14 Active       | • Corridor condition markers (Green/Amber/Red)           |
| • Active Alerts: 2 Critical        | • Selected zone spatial overlay                          |
+------------------------------------+----------------------------------------------------------+
| SECTION 4: PREDICTION PANEL        | SECTION 5: CONTRIBUTING FACTORS                          |
| • Current State: Moderate          | • Traffic Congestion: 45% Impact                         |
| • Predicted State: Critical (+30m) | • Crowd Density: 35% Impact                              |
| • Confidence: 87% | Trend: Up      | • Rainfall Rate: 20% Impact                              |
+------------------------------------+----------------------------------------------------------+
| SECTION 6: ALERT MANAGEMENT PANEL  | SECTION 7: WHAT-IF SCENARIO SIMULATOR                    |
| • [CRITICAL] Corridor A Outflow    | • Baseline vs Simulated Input Sliders                    |
| • Timestamp: 14:05 | Reason: Rain  | • Run Scenario Prediction Comparison                     |
+------------------------------------+----------------------------------------------------------+
```

### 3.1 Module Functional Specifications
1. **System & Data Status Bar**: Displays pipeline latency, telemetry ingestion health, and active ML model version.
2. **Urban Condition Overview**: High-level KPI summary cards displaying city-wide state summary.
3. **Interactive Urban Map Panel**: Geospatial map interface displaying monitored corridors, spatial threat heatmaps, and location selectors.
4. **Prediction Panel**: Summarizes output from the ML engine for selected locations and future time horizons.
5. **Contributing Factors Panel**: Renders feature attribution breakdown identifying top drivers behind the prediction.
6. **Alert Management Panel**: Operational table detailing active alerts, timestamp, severity, location, and recommended response protocol.
7. **What-If Scenario Simulator**: Interactive sandbox enabling operators to manipulate traffic, crowd, and weather variables to execute counterfactual predictions using the trained model.
