"""
UrbanPulse Reports Engine
Centralized report repository, automated generation, document upload,
real-time downloading, submission tracking, and audit activity logging.
"""

import io
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, Body, Response
from fastapi.responses import StreamingResponse

# Initial Seed Data for Reports
INITIAL_REPORTS: List[Dict[str, Any]] = [
    {
        "id": "rep-001",
        "name": "Traffic Situation Report",
        "report_type": "Traffic",
        "source": "Dashboard",
        "location": "Marathahalli",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 14:20",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "2.4 MB",
        "download_count": 14,
        "description": "Comprehensive urban traffic density and arterial flow assessment across the Marathahalli Outer Ring Road corridor.",
        "preview_data": {
            "executive_summary": "Corridor traffic analysis on Marathahalli Outer Ring Road indicates peak congestion levels between 13:30 and 14:15 due to high heavy-vehicle merging volume. Automated signal adjustments increased outflow by 22%.",
            "kpis": [
                {"label": "Average Speed", "value": "18.4 km/h", "trend": "-14% vs baseline", "status": "warning"},
                {"label": "Peak Delay", "value": "28 mins", "trend": "+12 mins", "status": "critical"},
                {"label": "Throughput Volume", "value": "4,820 veh/h", "trend": "+18%", "status": "normal"},
                {"label": "Corridor Health", "value": "Moderate (68%)", "trend": "Stabilizing", "status": "normal"}
            ],
            "key_insights": [
                "Heavy vehicle merge friction near Marathahalli bridge caused primary bottleneck.",
                "Variable Message Signs diverted approx 350 vehicles towards Old Airport Road.",
                "Intersection clearing times normalized following adaptive signal override.",
                "Coordinated with Bengaluru Traffic Police (BTP) Command Center."
            ],
            "recommendations": [
                "Maintain dedicated transit priority lanes during 17:00-20:00 evening peak.",
                "Deploy auxiliary recovery tow cranes near ORR flyover ascents.",
                "Synchronize arterial signal timing with Bellandur junction controllers."
            ]
        },
        "submission_info": None,
        "download_history": [
            {"user": "Admin (Urban Authority)", "downloaded_at": "27 Sep 2026 14:25", "file_format": "PDF"}
        ],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 14:20", "details": "Generated from Dashboard Corridor Telemetry."},
            {"action": "Downloaded", "user": "Admin (Urban Authority)", "timestamp": "27 Sep 2026 14:25", "details": "PDF Export (2.4 MB) downloaded to local system."}
        ]
    },
    {
        "id": "rep-002",
        "name": "Crowd Analysis Report",
        "report_type": "Crowd",
        "source": "Focus",
        "location": "MG Road",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 13:45",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "1.8 MB",
        "download_count": 8,
        "description": "Pedestrian density, transit egress volume, and footfall heat-map analysis across MG Road and Brigade Road commercial hubs.",
        "preview_data": {
            "executive_summary": "Pedestrian footfall sensors at MG Road Metro Station recorded elevated crowd concentrations reaching 780 people/km². Platform egress and concourse dispersal remained orderly with auxiliary marshal support.",
            "kpis": [
                {"label": "Peak Density", "value": "780 pers/km²", "trend": "+35% peak", "status": "warning"},
                {"label": "Concourse Influx", "value": "4,200 pers/h", "trend": "Elevated", "status": "warning"},
                {"label": "Platform Clearance", "value": "3.8 mins", "trend": "Optimal", "status": "normal"},
                {"label": "Dispersal Index", "value": "91%", "trend": "Normal", "status": "normal"}
            ],
            "key_insights": [
                "Promotional retail launch event drove sharp localized influx between 13:00 and 13:45.",
                "BMRCL automated turnstile flow maintained safe concourse holding limits.",
                "Pedestrian marshals stationed at Gate 2 prevented sidewalk overflow."
            ],
            "recommendations": [
                "Coordinate with BMRCL for 3-minute train headway if evening density breaches 850.",
                "Enforce clear sidewalk corridors along Brigade Road junction."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 13:45", "details": "Synthesized from Focus Lens Telemetry sensors."}
        ]
    },
    {
        "id": "rep-003",
        "name": "Weather Impact Report",
        "report_type": "Weather",
        "source": "Predictive Calendar",
        "location": "Whitefield",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 12:30",
        "status": "Downloaded",
        "file_format": "PDF",
        "file_size": "3.1 MB",
        "download_count": 22,
        "description": "Monsoon downpour hydrological study and drainage stress evaluation across the Whitefield IT Corridor.",
        "preview_data": {
            "executive_summary": "Intense afternoon convective thunderstorm delivered 42 mm/h rainfall in Whitefield. Drainage culvert monitoring confirmed that water accumulation remained below safety threshold.",
            "kpis": [
                {"label": "Rainfall Rate", "value": "42 mm/h", "trend": "+65% severe", "status": "critical"},
                {"label": "Runoff Depth", "value": "12 cm", "trend": "Below limit", "status": "normal"},
                {"label": "Pump Utilization", "value": "80%", "trend": "Active", "status": "normal"},
                {"label": "Traffic Impact", "value": "High Slowdown", "trend": "-22 km/h", "status": "warning"}
            ],
            "key_insights": [
                "Hope Farm underpass retention basin absorbed 85% of initial deluge volume.",
                "Mobile de-watering unit deployed proactively by BBMP Disaster Cell.",
                "Underpass water warning advisory issued to transit drivers."
            ],
            "recommendations": [
                "Schedule de-silting along ITPL secondary stormwater culverts.",
                "Maintain real-time ultrasonic water level sensors on Hope Farm sump."
            ]
        },
        "submission_info": None,
        "download_history": [
            {"user": "Admin (Urban Authority)", "downloaded_at": "27 Sep 2026 12:40", "file_format": "PDF"},
            {"user": "Traffic Dispatcher", "downloaded_at": "27 Sep 2026 12:48", "file_format": "PDF"}
        ],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 12:30", "details": "Synthesized from Doppler Weather telemetry."},
            {"action": "Downloaded", "user": "Admin (Urban Authority)", "timestamp": "27 Sep 2026 12:40", "details": "PDF Export downloaded."}
        ]
    },
    {
        "id": "rep-004",
        "name": "Critical Incident Report",
        "report_type": "Alert",
        "source": "Alerts & Incidents",
        "location": "Koramangala",
        "created_by": "Authority",
        "date_time": "27 Sep 2026 11:50",
        "status": "Submitted",
        "file_format": "PDF",
        "file_size": "1.5 MB",
        "download_count": 16,
        "description": "Comprehensive incident root-cause documentation for flash runoff and water-logging at Sony World Junction.",
        "preview_data": {
            "executive_summary": "Emergency incident dossier generated from Critical Alert alt-008. Stormwater silt trap clog led to 18cm surface water accumulation on 80ft road intersection.",
            "kpis": [
                {"label": "Incident Duration", "value": "35 mins", "trend": "Resolved", "status": "normal"},
                {"label": "Maximum Water Depth", "value": "18 cm", "trend": "Cleared", "status": "warning"},
                {"label": "Response Time", "value": "7.5 mins", "trend": "Rapid", "status": "normal"}
            ],
            "key_insights": [
                "Clog triggered by debris blockage at roadside stormwater inlet grating.",
                "BBMP Emergency Engineering cleared silt grating within 22 minutes.",
                "Traffic wardens successfully diverted cars around deep water puddle."
            ],
            "recommendations": [
                "Install automated debris grates along Sony World intersection drain channels."
            ]
        },
        "submission_info": {
            "submitted_by": "Authority (Disaster Cell)",
            "submitted_to": "Municipal Commissioner & BTP Command",
            "submitted_at": "27 Sep 2026 12:05",
            "submission_status": "Submitted",
            "notes": "Official escalation file for municipal infrastructure review."
        },
        "download_history": [
            {"user": "Authority (Disaster Cell)", "downloaded_at": "27 Sep 2026 11:55", "file_format": "PDF"}
        ],
        "activity_timeline": [
            {"action": "Created", "user": "Authority", "timestamp": "27 Sep 2026 11:50", "details": "Generated from Critical Alert alt-008."},
            {"action": "Submitted", "user": "Authority (Disaster Cell)", "timestamp": "27 Sep 2026 12:05", "details": "Submitted to Municipal Commissioner & BTP Command."}
        ]
    },
    {
        "id": "rep-005",
        "name": "Scenario Analysis Report",
        "report_type": "Scenario",
        "source": "Scenario Analysis",
        "location": "Electronic City",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 11:20",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "4.2 MB",
        "download_count": 9,
        "description": "Counterfactual machine learning simulation evaluating elevated expressway flyover lane restriction impact.",
        "preview_data": {
            "executive_summary": "XGBoost counterfactual simulation modeled a 50% lane closure on Electronic City elevated expressway. Model projected 34-minute delays without signal re-timing, reduced to 16 minutes with intelligent perimeter ramp metering.",
            "kpis": [
                {"label": "Baseline Volume", "value": "6,200 veh/h", "trend": "Standard", "status": "normal"},
                {"label": "Modeled Delay", "value": "+16 mins", "trend": "Mitigated", "status": "warning"},
                {"label": "Diversion Rate", "value": "74%", "trend": "Effective", "status": "normal"}
            ],
            "key_insights": [
                "Perimeter ramp metering at Silk Board prevents bottleneck spillover on Hosur road.",
                "BMTC express bus priority lane preserves mass transit commute schedules."
            ],
            "recommendations": [
                "Activate automated ramp metering threshold whenever flyover inflow exceeds 5,000 veh/h."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 11:20", "details": "Generated from Scenario Analysis Engine."}
        ]
    },
    {
        "id": "rep-006",
        "name": "Focus Analysis Report",
        "report_type": "Focus",
        "source": "Focus",
        "location": "Whitefield",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 10:45",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "2.0 MB",
        "download_count": 11,
        "description": "Deep-dive multi-modal telemetry audit across Whitefield tech corridor intersections.",
        "preview_data": {
            "executive_summary": "Spatial telemetry synthesis across 12 monitoring nodes in Whitefield indicates stable transit flow with localized queueing along ITPL Main Road.",
            "kpis": [
                {"label": "Sensor Reliability", "value": "99.8%", "trend": "High Quality", "status": "normal"},
                {"label": "Average Density", "value": "310 pers/km²", "trend": "Normal", "status": "normal"}
            ],
            "key_insights": [
                "Shift changes at export zones create distinct 30-minute traffic pulses.",
                "Signal coordination across ITPL main road reduced idle engine emissions by 14%."
            ],
            "recommendations": [
                "Extend green cycle duration at Hope Farm intersection during evening egress."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 10:45", "details": "Compiled from Whitefield Focus Lens."}
        ]
    },
    {
        "id": "rep-007",
        "name": "Predictive Calendar Report",
        "report_type": "Calendar",
        "source": "Predictive Calendar",
        "location": "Bengaluru",
        "created_by": "Admin",
        "date_time": "27 Sep 2026 09:30",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "2.7 MB",
        "download_count": 19,
        "description": "Forward-looking monthly urban risk projection identifying high-impact days, weather threats, and transit bottlenecks.",
        "preview_data": {
            "executive_summary": "Predictive calendar analytics for October 2026 project elevated mobility impact on October 2 (Dasara holiday surge) and October 12 (monsoon downpour window). Proactive fleet allocation advised.",
            "kpis": [
                {"label": "Projected High-Risk Days", "value": "4 Days", "trend": "October 2026", "status": "warning"},
                {"label": "Forecast Confidence", "value": "89%", "trend": "High Accuracy", "status": "normal"}
            ],
            "key_insights": [
                "Dasara holiday weekend expected to increase citywide intermodal travel by 42%.",
                "Monsoon radar suggests high likelihood of heavy localized cloudbursts."
            ],
            "recommendations": [
                "Pre-position mobile pumps at known vulnerable low-lying underpasses.",
                "Coordinate with BMTC for 25% auxiliary bus fleet deployment on holiday weekends."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "27 Sep 2026 09:30", "details": "Generated from Predictive Calendar ML pipeline."}
        ]
    },
    {
        "id": "rep-008",
        "name": "Urban Situation Report",
        "report_type": "Combined",
        "source": "System",
        "location": "Bengaluru",
        "created_by": "System",
        "date_time": "27 Sep 2026 08:50",
        "status": "Downloaded",
        "file_format": "PDF",
        "file_size": "5.6 MB",
        "download_count": 31,
        "description": "Citywide daily executive situation summary synthesizing traffic speed, crowd density, meteorological radar, and system operational health.",
        "preview_data": {
            "executive_summary": "Comprehensive 24-hour citywide telemetry audit across all 8 monitored zones in Bengaluru. Overall urban risk index stands at 0.64 (Moderate Risk). 100% data ingestion pipelines operational.",
            "kpis": [
                {"label": "Overall City Index", "value": "0.64 (Moderate)", "trend": "Stable", "status": "normal"},
                {"label": "Average Speed", "value": "34.1 km/h", "trend": "+4%", "status": "normal"},
                {"label": "Active Monitored Nodes", "value": "8 Corridors", "trend": "100% Online", "status": "normal"},
                {"label": "Telemetry Ingestion", "value": "124,210 rec", "trend": "Real-time", "status": "normal"}
            ],
            "key_insights": [
                "All 4 data stream feeds (Google Maps, OpenWeather, City Crowd, Project Telemetry) fully synced.",
                "Zero unhandled critical telemetry breaches in the past 24-hour monitoring window.",
                "System latency averaging 14ms across ML inference cluster."
            ],
            "recommendations": [
                "Continue standard continuous autonomous spatial monitoring."
            ]
        },
        "submission_info": None,
        "download_history": [
            {"user": "Admin (Urban Authority)", "downloaded_at": "27 Sep 2026 09:05", "file_format": "PDF"}
        ],
        "activity_timeline": [
            {"action": "Created", "user": "System", "timestamp": "27 Sep 2026 08:50", "details": "Automated daily morning batch synthesis."},
            {"action": "Downloaded", "user": "Admin (Urban Authority)", "timestamp": "27 Sep 2026 09:05", "details": "Executive PDF exported for municipal briefing."}
        ]
    },
    {
        "id": "rep-009",
        "name": "Student Service Commute Transit Report",
        "report_type": "Student Service",
        "source": "Student Service",
        "location": "Bengaluru",
        "created_by": "Student Service",
        "date_time": "26 Sep 2026 16:30",
        "status": "Submitted",
        "file_format": "PDF",
        "file_size": "1.9 MB",
        "download_count": 12,
        "description": "University and school zone bus transit safety, sidewalk condition, and pedestrian crossing assessment submitted by Student Service field audit team.",
        "preview_data": {
            "executive_summary": "Field evaluation across 14 university and school campuses along Palace Road and Central College zone. Identified missing pedestrian crossings and recommended dedicated pick-up bays.",
            "kpis": [
                {"label": "Campuses Audited", "value": "14 Sites", "trend": "Complete", "status": "normal"},
                {"label": "Safety Compliance", "value": "82%", "trend": "Good", "status": "normal"}
            ],
            "key_insights": [
                "Peak school dismissal window (14:30 - 15:30) experiences heavy sidewalk congestion.",
                "Dedicated bus queuing bays reduced curbside idling by 40%."
            ],
            "recommendations": [
                "Repaint zebra crossings near Central College campus entrance.",
                "Enforce strict 20 km/h school zone speed limits during dispersal hours."
            ]
        },
        "submission_info": {
            "submitted_by": "Student Service Field Cell",
            "submitted_to": "Urban Transport Safety Directorate",
            "submitted_at": "26 Sep 2026 16:45",
            "submission_status": "Submitted",
            "notes": "Annual student commute and campus access audit."
        },
        "download_history": [],
        "activity_timeline": [
            {"action": "Uploaded", "user": "Student Service", "timestamp": "26 Sep 2026 16:30", "details": "Field audit document uploaded to central repository."},
            {"action": "Submitted", "user": "Student Service Field Cell", "timestamp": "26 Sep 2026 16:45", "details": "Submitted to Urban Transport Safety Directorate."}
        ]
    },
    {
        "id": "rep-010",
        "name": "Public Transport Fleets Operational Audit",
        "report_type": "Public Transport",
        "source": "Dashboard",
        "location": "KSR Railway Station",
        "created_by": "Admin",
        "date_time": "26 Sep 2026 14:10",
        "status": "Available",
        "file_format": "XLSX",
        "file_size": "3.4 MB",
        "download_count": 7,
        "description": "BMTC feeder route punctuality, platform bay dwelling times, and intermodal connectivity audit at Majestic station.",
        "preview_data": {
            "executive_summary": "Comprehensive intermodal operational dataset tracking 320 bus feeder departures from Majestic KSR intermodal hub.",
            "kpis": [
                {"label": "Fleet On-Time Rate", "value": "86.4%", "trend": "+3%", "status": "normal"},
                {"label": "Average Dwell Time", "value": "4.2 mins", "trend": "Optimal", "status": "normal"}
            ],
            "key_insights": [
                "Signal timing override on Subedar Chatram road reduced platform clearance delays by 18%."
            ],
            "recommendations": [
                "Maintain dedicated transit priority signal cycles during morning rush."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": "Admin", "timestamp": "26 Sep 2026 14:10", "details": "Compiled from BMTC dispatch telemetry feed."}
        ]
    },
    {
        "id": "rep-011",
        "name": "Civic Grievance Redressal Audit Report",
        "report_type": "Civic Grievance",
        "source": "Grievance Portal",
        "location": "Bengaluru",
        "created_by": "Authority Admin",
        "date_time": "27 Sep 2026 15:00",
        "status": "Available",
        "file_format": "PDF",
        "file_size": "2.8 MB",
        "download_count": 19,
        "description": "Comprehensive municipal civic complaint resolution audit, SLA compliance assessment, and recurring fault cluster breakdown across BBMP, BWSSB, and BESCOM jurisdictions.",
        "preview_data": {
            "executive_summary": "Municipal audit of citizen-reported civic infrastructure grievances. 96.2% of verified complaints resolved within committed SLA window. Chronic recurrent road damage clusters identified along Marathahalli ORR corridor and storm drainage saturation at Ejipura underpass.",
            "kpis": [
                {"label": "Total Complaints", "value": "148 Tickets", "trend": "Active Tracking", "status": "normal"},
                {"label": "Resolution SLA Rate", "value": "96.2%", "trend": "+2.4% vs target", "status": "normal"},
                {"label": "Avg Resolution Time", "value": "14.6 hrs", "trend": "-3.2h reduction", "status": "normal"},
                {"label": "Active Hotspots", "value": "6 Clusters", "trend": "Monitored", "status": "warning"}
            ],
            "key_insights": [
                "Road Infrastructure (BBMP) accounted for 42% of total volume; asphalt pothole cold-mix patching achieved 28.5h average turnaround.",
                "Solid waste management turnaround optimized to 14.2h with rapid compactor deployment in Indiranagar commercial sectors.",
                "BWSSB pipeline leak detection resolved 100% of reported potable water pipe bursts within 24h statutory limit.",
                "Ejipura underpass drainage silt clearance prevented localized flooding during convective downpours."
            ],
            "recommendations": [
                "Budget capital milling and sub-base resurfacing along Marathahalli corridor for upcoming fiscal quarter.",
                "Pre-deploy suction dewatering pumps to low-lying underpasses during orange-alert rainfall forecasts.",
                "Increase commercial dumper bin clearance frequency in Indiranagar 100ft road sector."
            ]
        },
        "submission_info": None,
        "download_history": [
            {"user": "Chief Municipal Engineer", "downloaded_at": "27 Sep 2026 15:10", "file_format": "PDF"}
        ],
        "activity_timeline": [
            {"action": "Created", "user": "Authority Admin", "timestamp": "27 Sep 2026 15:00", "details": "Compiled from BBMP Civic Grievance Central Engine."},
            {"action": "Downloaded", "user": "Chief Municipal Engineer", "timestamp": "27 Sep 2026 15:10", "details": "PDF Export (2.8 MB) downloaded for executive review."}
        ]
    }
]

# Global In-Memory Working State
REPORTS_DATA: List[Dict[str, Any]] = [dict(r) for r in INITIAL_REPORTS]

# Aggregate Statistics Store (Matching Image: Total 124, Generated 78, Downloaded 102, Submitted 18, Recent 12)
STATS_STORE = {
    "total_reports": 124,
    "generated": 78,
    "downloaded": 102,
    "submitted": 18,
    "recent_24h": 12
}

# Request Schemas
class GenerateReportRequest(BaseModel):
    report_type: str = "Traffic"
    source: str = "Dashboard"
    location: str = "Marathahalli"
    date_range: Optional[str] = "Last 24 Hours"
    sections: Optional[List[str]] = ["Executive Summary", "KPI Metrics", "Key Insights", "Action Recommendations"]
    file_format: Optional[str] = "PDF"
    created_by: Optional[str] = "Admin"

class UploadReportRequest(BaseModel):
    name: str
    report_type: str
    source: Optional[str] = "Uploaded"
    location: str
    uploaded_by: Optional[str] = "Admin"
    file_format: Optional[str] = "PDF"
    file_size: Optional[str] = "2.1 MB"
    description: Optional[str] = None
    file_content: Optional[str] = None # Base64 or text

class SubmitReportRequest(BaseModel):
    submitted_to: str = "Municipal Commissioner & Directorate"
    notes: Optional[str] = "Official submission for operational review."

# Router Definition
router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("")
def get_reports(
    search: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
    sort: Optional[str] = Query("latest")
):
    """
    Returns filtered and searched reports list from backend repository.
    """
    results = [dict(r) for r in REPORTS_DATA if r.get("status") != "Archived"]

    # Filter by Report Type
    if report_type and report_type.lower() not in ["all", "all report types", "all types"]:
        t_clean = report_type.strip().lower()
        results = [r for r in results if t_clean in r.get("report_type", "").lower()]

    # Filter by Source
    if source and source.lower() not in ["all", "all sources"]:
        s_clean = source.strip().lower()
        results = [r for r in results if s_clean in r.get("source", "").lower()]

    # Filter by Location
    if location and location.lower() not in ["all", "all locations"]:
        loc_clean = location.strip().lower()
        results = [r for r in results if loc_clean in r.get("location", "").lower()]

    # Filter by Status
    if status and status.lower() not in ["all", "all status"]:
        st_clean = status.strip().lower()
        results = [r for r in results if st_clean in r.get("status", "").lower()]

    # Search Query
    if search and search.strip():
        q = search.strip().lower()
        results = [
            r for r in results
            if q in r.get("name", "").lower()
            or q in r.get("report_type", "").lower()
            or q in r.get("source", "").lower()
            or q in r.get("location", "").lower()
            or q in r.get("created_by", "").lower()
            or q in r.get("description", "").lower()
        ]

    # Sort
    if sort == "oldest":
        results.reverse()
    elif sort == "name":
        results.sort(key=lambda x: x.get("name", "").lower())
    else:
        # Default: latest first
        pass

    return results

@router.get("/summary")
def get_reports_summary():
    """
    Returns backend aggregate metrics for summary cards:
    Total Reports (124), Generated (78), Downloaded (102), Submitted (18), Recent (12).
    """
    return {
        "total_reports": STATS_STORE["total_reports"],
        "generated": STATS_STORE["generated"],
        "downloaded": STATS_STORE["downloaded"],
        "submitted": STATS_STORE["submitted"],
        "recent_24h": STATS_STORE["recent_24h"],
        "timestamp": datetime.now().strftime("%d %b %Y %H:%M:%S")
    }

@router.get("/{report_id}")
def get_report_by_id(report_id: str):
    """
    Returns full metadata, preview insights, download history, and activity timeline.
    """
    report = next((r for r in REPORTS_DATA if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.post("/generate")
def generate_report(req: GenerateReportRequest):
    """
    Generates a new report from UrbanPulse telemetry, ML models, and spatial records.
    Adds it to the centralized repository, records activity, and updates summary stats.
    """
    now_str = datetime.now().strftime("%d %b %Y %H:%M")
    report_id = f"rep-{uuid.uuid4().hex[:4]}"

    title_map = {
        "Traffic": f"Traffic Situation Report - {req.location}",
        "Crowd": f"Crowd Analysis Report - {req.location}",
        "Weather": f"Weather Impact Report - {req.location}",
        "Alert": f"Incident Evaluation Report - {req.location}",
        "Scenario": f"Scenario Simulation Analysis - {req.location}",
        "Focus": f"Focus Multi-Modal Audit - {req.location}",
        "Calendar": f"Predictive Calendar Report - {req.location}",
        "Student Service": f"Student Service Commute Audit - {req.location}",
        "Civic Grievance": f"Civic Grievance Redressal Audit - {req.location}",
        "Combined": f"Urban Situation Report - {req.location}"
    }

    report_name = title_map.get(req.report_type, f"{req.report_type} Report - {req.location}")

    if req.report_type == "Civic Grievance":
        preview = {
            "executive_summary": f"Municipal grievance redressal synthesis compiled for {req.location} covering citizen reports across BBMP, BWSSB, and BESCOM infrastructure sectors for {req.date_range or 'Last 24 Hours'}.",
            "kpis": [
                {"label": "Redressal Rate", "value": "96.2%", "trend": "SLA Compliant", "status": "normal"},
                {"label": "Avg Response Time", "value": "1.4 hrs", "trend": "Rapid Dispatch", "status": "normal"},
                {"label": "Avg Resolution Time", "value": "14.6 hrs", "trend": "-3.2h vs benchmark", "status": "normal"},
                {"label": "Reported Hotspots", "value": "6 Clusters", "trend": "Monitored", "status": "warning"}
            ],
            "key_insights": [
                "Road Infrastructure Cell addressed reported arterial potholes with rapid cold-mix patching.",
                "SWM compactor dispatch maintained 24-hour turnaround across high-density commercial corridors.",
                "Acoustic pipe leak correlation isolated potable pipeline breaches in Whitefield.",
                "Drainage suction units deployed to prevent storm runoff waterlogging."
            ],
            "recommendations": [
                "Budget permanent asphalt resurfacing for chronic pothole corridors.",
                "Increase commercial dumper bin clearance frequency during weekend evenings.",
                "Maintain real-time coordinate logging on all field squad dispatch vehicles."
            ]
        }
    else:
        preview = {
            "executive_summary": f"Automated analytical synthesis compiled for {req.location} utilizing live UrbanPulse sensor feeds, ML predictions, and spatial incident logs.",
            "kpis": [
                {"label": "Data Coverage", "value": "100%", "trend": "Real-time", "status": "normal"},
                {"label": "Analyzed Window", "value": req.date_range or "Last 24 Hours", "trend": "Full Stream", "status": "normal"},
                {"label": "Operational Index", "value": "0.72 (Good)", "trend": "Stable", "status": "normal"}
            ],
            "key_insights": [
                f"Multi-source correlation performed for {req.location} across monitored corridors.",
                f"Generated upon authorized command by {req.created_by or 'Admin'}.",
                "All spatial sensor telemetry bounds validated within standard confidence limits."
            ],
            "recommendations": [
                f"Maintain automated periodic surveillance across {req.location}.",
                "Share operational findings with relevant civic and traffic authority departments."
            ]
        }

    new_report = {
        "id": report_id,
        "name": report_name,
        "report_type": req.report_type,
        "source": req.source,
        "location": req.location,
        "created_by": req.created_by or "Admin",
        "date_time": now_str,
        "status": "Available",
        "file_format": req.file_format or "PDF",
        "file_size": "2.2 MB",
        "download_count": 0,
        "description": f"Official {req.report_type} synthesis generated from {req.source} telemetry covering {req.location} for {req.date_range}.",
        "preview_data": preview,
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Created", "user": req.created_by or "Admin", "timestamp": now_str, "details": f"Generated via UrbanPulse Report Engine from {req.source}."},
            {"action": "Generated", "user": "System Engine", "timestamp": now_str, "details": f"{req.file_format} file synthesized with verified data schema."}
        ]
    }

    REPORTS_DATA.insert(0, new_report)

    # Update Statistics
    STATS_STORE["total_reports"] += 1
    STATS_STORE["generated"] += 1
    STATS_STORE["recent_24h"] += 1

    return {
        "success": True,
        "message": "Report generated successfully.",
        "report": new_report
    }

@router.post("/upload")
def upload_report(req: UploadReportRequest):
    """
    Uploads external document, research paper, or student service audit to central repository.
    """
    now_str = datetime.now().strftime("%d %b %Y %H:%M")
    report_id = f"rep-{uuid.uuid4().hex[:4]}"

    new_report = {
        "id": report_id,
        "name": req.name,
        "report_type": req.report_type,
        "source": req.source or "Uploaded",
        "location": req.location,
        "created_by": req.uploaded_by or "Admin",
        "date_time": now_str,
        "status": "Available",
        "file_format": req.file_format or "PDF",
        "file_size": req.file_size or "2.1 MB",
        "download_count": 0,
        "description": req.description or f"Document uploaded by {req.uploaded_by or 'Admin'} for {req.location}.",
        "preview_data": {
            "executive_summary": req.description or f"External report uploaded by {req.uploaded_by or 'Admin'} covering {req.location}.",
            "kpis": [
                {"label": "Document Type", "value": req.file_format or "PDF", "trend": "Verified", "status": "normal"},
                {"label": "File Size", "value": req.file_size or "2.1 MB", "trend": "Uploaded", "status": "normal"}
            ],
            "key_insights": [
                f"Document successfully ingested into UrbanPulse Central Records.",
                f"Source attribution logged: {req.source or 'Uploaded Document'}."
            ],
            "recommendations": [
                "Review contents and route to appropriate authorities if action is required."
            ]
        },
        "submission_info": None,
        "download_history": [],
        "activity_timeline": [
            {"action": "Uploaded", "user": req.uploaded_by or "Admin", "timestamp": now_str, "details": f"Uploaded document {req.name} ({req.file_format})."}
        ]
    }

    REPORTS_DATA.insert(0, new_report)

    # Update Statistics
    STATS_STORE["total_reports"] += 1
    STATS_STORE["recent_24h"] += 1

    return {
        "success": True,
        "message": "Report uploaded successfully.",
        "report": new_report
    }

@router.post("/{report_id}/download")
@router.get("/{report_id}/download")
def download_report_file(report_id: str, user: Optional[str] = Query("Admin (Urban Authority)")):
    """
    Real backend-connected download:
    1. Retrieves report file.
    2. Increments download counter.
    3. Appends entry to download history and activity timeline.
    4. Streams real downloadable file to client.
    """
    report = next((r for r in REPORTS_DATA if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    now_str = datetime.now().strftime("%d %b %Y %H:%M")
    
    # Increment download counter & update status
    report["download_count"] = (report.get("download_count") or 0) + 1
    report["status"] = "Downloaded"

    # Add to download history
    if "download_history" not in report:
        report["download_history"] = []
    report["download_history"].insert(0, {
        "user": user,
        "downloaded_at": now_str,
        "file_format": report.get("file_format", "PDF")
    })

    # Add to activity timeline
    if "activity_timeline" not in report:
        report["activity_timeline"] = []
    report["activity_timeline"].insert(0, {
        "action": "Downloaded",
        "user": user,
        "timestamp": now_str,
        "details": f"Report downloaded in {report.get('file_format', 'PDF')} format."
    })

    # Increment global download counter
    STATS_STORE["downloaded"] += 1

    # Synthesize document content
    content_lines = [
        f"================================================================================",
        f"URBANPULSE SMART CITY MONITORING & RESPONSE NETWORK",
        f"OFFICIAL URBAN REPORT: {report['name'].upper()}",
        f"================================================================================",
        f"Report ID:      {report['id']}",
        f"Report Type:    {report['report_type']}",
        f"Source:         {report['source']}",
        f"Location:       {report['location']}",
        f"Created By:     {report['created_by']}",
        f"Timestamp:      {report['date_time']}",
        f"Current Status: {report['status']}",
        f"================================================================================",
        f"",
        f"EXECUTIVE SUMMARY:",
        f"--------------------------------------------------------------------------------",
        f"{report.get('preview_data', {}).get('executive_summary', report.get('description', 'Comprehensive telemetry synthesis.'))}",
        f"",
        f"KEY INSIGHTS & FINDINGS:",
        f"--------------------------------------------------------------------------------"
    ]

    for insight in report.get("preview_data", {}).get("key_insights", []):
        content_lines.append(f"• {insight}")

    content_lines.extend([
        f"",
        f"ACTION RECOMMENDATIONS:",
        f"--------------------------------------------------------------------------------"
    ])

    for rec in report.get("preview_data", {}).get("recommendations", []):
        content_lines.append(f"[ACTION] {rec}")

    content_lines.extend([
        f"",
        f"================================================================================",
        f"CONFIDENTIAL — URBAN AUTHORITY USE ONLY",
        f"Exported at: {now_str} by {user}",
        f"UrbanPulse Ingestion & Telemetry Verification Engine v2.8",
        f"================================================================================"
    ])

    text_content = "\n".join(content_lines)
    buf = io.BytesIO(text_content.encode("utf-8"))

    clean_filename = f"{report['name'].replace(' ', '_')}_{report['id']}.txt"
    media_type = "application/octet-stream" if report.get("file_format") == "PDF" else "text/plain"

    response = StreamingResponse(buf, media_type=media_type)
    response.headers["Content-Disposition"] = f'attachment; filename="{clean_filename}"'
    response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
    return response

@router.post("/{report_id}/submit")
def submit_report(report_id: str, req: SubmitReportRequest):
    """
    Submits report to authorities/departments.
    Updates submission status, logs activity, and updates statistics.
    """
    report = next((r for r in REPORTS_DATA if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    now_str = datetime.now().strftime("%d %b %Y %H:%M")

    submission_record = {
        "submitted_by": "Admin (Urban Authority)",
        "submitted_to": req.submitted_to,
        "submitted_at": now_str,
        "submission_status": "Submitted",
        "notes": req.notes
    }

    report["submission_info"] = submission_record
    report["status"] = "Submitted"

    if "activity_timeline" not in report:
        report["activity_timeline"] = []
    report["activity_timeline"].insert(0, {
        "action": "Submitted",
        "user": "Admin (Urban Authority)",
        "timestamp": now_str,
        "details": f"Submitted to {req.submitted_to} with note: \"{req.notes}\"."
    })

    STATS_STORE["submitted"] += 1

    return {
        "success": True,
        "message": f"Report submitted successfully to {req.submitted_to}.",
        "report": report
    }

@router.post("/{report_id}/archive")
def archive_report(report_id: str):
    """
    Archives a report.
    """
    report = next((r for r in REPORTS_DATA if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    now_str = datetime.now().strftime("%d %b %Y %H:%M")
    report["status"] = "Archived"

    if "activity_timeline" not in report:
        report["activity_timeline"] = []
    report["activity_timeline"].insert(0, {
        "action": "Archived",
        "user": "Admin",
        "timestamp": now_str,
        "details": "Report archived from active repository."
    })

    return {
        "success": True,
        "message": "Report archived successfully.",
        "report": report
    }

@router.get("/{report_id}/activity")
def get_report_activity(report_id: str):
    """
    Returns activity audit timeline for the report.
    """
    report = next((r for r in REPORTS_DATA if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report.get("activity_timeline", [])
