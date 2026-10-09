# Urban Pulse: Smart City Monitoring and Response Network

Urban Pulse is a centralized, real-time smart city intelligence, telemetry monitoring, and incident response platform. It delivers operational awareness across metropolitan infrastructure, public transit systems, environmental metrics, crowd densities, and emergency response workflows.

---

## 🌆 System Overview

- **Real-time Telemetry & Intelligence Map**: Interactive GIS mapping showing live city sectors, congestion indices, incident clusters, transit telemetry, and sensor feeds.
- **Predictive Analytics & Forecasting**: Machine learning models and analytical routines predicting congestion hotspots, crowd surge risks, transit delays, and anomaly detections.
- **Simulations & What-If Modeling**: Sandbox environment to simulate severe weather conditions, major public events, infrastructure disruptions, and traffic rerouting strategies.
- **Automated Alerts Engine**: Rule-based and predictive alerting pipeline dispatching municipal priorities, dispatch triggers, and public advisories.
- **Reports & Administrative Control**: Comprehensive compliance, throughput, and environmental audit reporting paired with administrative threshold controls.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 / Vite
- **Styling**: Tailwind CSS & Modern Glassmorphic Dashboard Design
- **Mapping & Visuals**: Leaflet / React-Leaflet, Chart.js, Lucide Icons

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Data & Telemetry Engine**: Pandas, NumPy, Scikit-learn
- **Database & Storage**: SQLite / SQLAlchemy persistence, tabular telemetry archives
- **Real-time Protocol**: RESTful APIs & WebSocket event streaming

---

## 📁 Repository Structure

```text
Urban-Pulse/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application server & routes
│   │   ├── database.py          # Database schema & session management
│   │   ├── alerts_engine.py     # Real-time incident detection & alerting
│   │   ├── reports_engine.py    # Analytical reports & export generation
│   │   └── settings_engine.py   # System threshold configuration
│   └── storage/
│       ├── datasets/            # City telemetry, traffic & weather datasets
│       └── models/              # Pretrained prediction weights & artifacts
├── frontend/
│   ├── src/
│   │   ├── components/          # Views: Map, Alerts, Predictive, Simulation, Reports
│   │   ├── App.jsx              # Application shell & navigation
│   │   └── index.css            # Design tokens & responsive styles
│   ├── package.json
│   └── vite.config.js
├── data/                        # Sample telemetry feeds
├── scratch/                     # Backend verification scripts
└── docs/ (PHASE_*.md)           # Architecture, EDA, telemetry, and system design specifications
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Git**

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt  # or fast-api, uvicorn, sqlalchemy, pandas, scikit-learn
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 📜 Documentation & System Specs
Complete design phase documents are included in the repository root:
- `PHASE_1_*.md`: Problem statement, scope, requirements, tech stack, and use cases.
- `PHASE_2_*.md`: Telemetry ingestion, EDA, database architecture, preprocessing, and API design.
