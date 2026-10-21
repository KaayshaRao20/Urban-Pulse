"""
UrbanPulse Alerts & Incidents Engine
Real-time alerts monitoring, dynamic escalation, duplicate prevention,
and authority dispatch management.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, Body

try:
    from app.database import SessionLocal, AlertModel, AlertUpdateModel, AlertCommentModel
except ImportError:
    try:
        from database import SessionLocal, AlertModel, AlertUpdateModel, AlertCommentModel
    except ImportError:
        SessionLocal = None
        AlertModel = None
        AlertUpdateModel = None
        AlertCommentModel = None

# Authorities Store
AUTHORITIES_STORE = [
    {
        "id": "auth-btp",
        "name": "Bengaluru Traffic Police (BTP)",
        "department": "Traffic Management Division",
        "email": "controlroom@bangaloretrafficpolice.gov.in",
        "phone": "+91 80 2294 3030",
        "jurisdiction": "Citywide Traffic Operations"
    },
    {
        "id": "auth-bbmp-disaster",
        "name": "BBMP Disaster Management Cell",
        "department": "Stormwater & Flood Mitigation Cell",
        "email": "disastercell@bbmp.gov.in",
        "phone": "+91 80 2222 1188",
        "jurisdiction": "Civic Infrastructure & Drainage"
    },
    {
        "id": "auth-bmrcl",
        "name": "BMRCL Namma Metro Operations",
        "department": "Metro Rail Operations Command",
        "email": "operations@bmrc.co.in",
        "phone": "+91 80 2296 9300",
        "jurisdiction": "Metro Rapid Transit Network"
    },
    {
        "id": "auth-bmtc",
        "name": "BMTC Central Dispatch & Rapid Response",
        "department": "Public Surface Transport",
        "email": "dispatch@mybmtc.karnataka.gov.in",
        "phone": "+91 80 2295 2525",
        "jurisdiction": "Bus Fleet & Multi-modal Hubs"
    },
    {
        "id": "auth-bescom",
        "name": "BESCOM Power Grid Command",
        "department": "Electrical Distribution Control",
        "email": "command@bescom.karnataka.gov.in",
        "phone": "1912",
        "jurisdiction": "Urban Electrical Grid"
    },
    {
        "id": "auth-kspfs",
        "name": "Karnataka Fire & Emergency Services",
        "department": "Emergency Medical & Fire Rescue",
        "email": "emergency@kspfs.gov.in",
        "phone": "101",
        "jurisdiction": "Hazard Rescue & Medical Response"
    }
]

# Core Initial Alerts Store (44 alerts: 5 Critical, 12 High, 18 Moderate, 9 Low)
INITIAL_ALERTS: List[Dict[str, Any]] = [
    # --- 1. CRITICAL (5 Total) ---
    {
        "id": "alt-001",
        "alert_type": "traffic",
        "title": "Severe Traffic Congestion",
        "description": "Severe traffic congestion due to an accident and increased vehicle volume. Traffic movement is significantly slow in both directions.",
        "severity": "Critical",
        "status": "Active",
        "location": "Marathahalli – Outer Ring Road",
        "location_id": "loc-001",
        "time_str": "14:31",
        "time_ago": "2 minutes ago",
        "timestamp": "27 Sep 2026, 14:31",
        "source": "Traffic Monitoring",
        "camera_feed_url": "/assets/marathahalli_traffic_cam.jpg",
        "camera_feed_label": "Live Camera Feed – Marathahalli – Outer Ring Road",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Mobility", "level": "High", "pct": 85, "color": "#EF4444"},
            {"category": "Public Transport", "level": "Medium", "pct": 55, "color": "#F97316"},
            {"category": "Emergency Response", "level": "High", "pct": 80, "color": "#EF4444"},
            {"category": "Economic Impact", "level": "Medium", "pct": 50, "color": "#F97316"}
        ],
        "affected_areas": [
            "Marathahalli Junction",
            "Outer Ring Road (Both Directions)",
            "Bellandur Flyover",
            "KTPO Junction"
        ],
        "timeline": [
            {"time": "14:31", "title": "Alert detected", "desc": "Severe traffic congestion reported on Outer Ring Road.", "color": "#EF4444"},
            {"time": "14:35", "title": "Field teams notified", "desc": "Traffic management team has been dispatched.", "color": "#F97316"},
            {"time": "14:40", "title": "Ongoing monitoring", "desc": "Situation under observation.", "color": "#475569"}
        ],
        "related_info": {
            "approx_delay": "20 – 40 minutes",
            "affected_stretch": "Marathahalli – ORR (Both Directions)",
            "possible_cause": "Accident + High Vehicle Volume",
            "agencies_notified": "Traffic Police, BMRCL, BBMP"
        },
        "telemetry_metrics": {
            "speed": "14 km/h",
            "speed_trend": "↓ 72%",
            "traffic_volume": "4,820 veh/h",
            "volume_trend": "↑ 65%",
            "congestion_level": "88%",
            "congestion_trend": "↑ 38%",
            "affected_road": "Outer Ring Road",
            "affected_road_sub": "Both Directions"
        },
        "live_updates": [
            {"time": "14:31", "text": "Alert raised by traffic monitoring system.", "dot": "red"},
            {"time": "14:32", "text": "Camera feed confirms heavy congestion.", "dot": "red"},
            {"time": "14:32", "text": "Traffic police notified.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-002",
        "alert_type": "weather",
        "title": "Heavy Rainfall",
        "description": "Intense convective downpour causing significant runoff and imminent water accumulation across underpasses.",
        "severity": "Critical",
        "status": "Active",
        "location": "Whitefield",
        "location_id": "loc-004",
        "time_str": "14:28",
        "time_ago": "5 minutes ago",
        "timestamp": "27 Sep 2026, 14:28",
        "source": "Weather Monitoring Station",
        "camera_feed_url": None,
        "camera_feed_label": "Telemetry Radar – Whitefield Basin",
        "icon": "cloud-rain",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Critical", "pct": 90, "color": "#EF4444"},
            {"category": "Mobility", "level": "High", "pct": 78, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 72, "color": "#EF4444"},
            {"category": "Crowd Movement", "level": "Moderate", "pct": 40, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "15 – 35 minutes",
            "affected_stretch": "ITPL Main Road & Hope Farm Junction",
            "possible_cause": "Severe Monsoonal Cloudburst",
            "agencies_notified": "BBMP Disaster Cell, Traffic Police"
        },
        "telemetry_metrics": {
            "rainfall": "42 mm/h",
            "temperature": "22.5°C",
            "weather_condition": "Heavy Rain / Thunderstorm"
        },
        "live_updates": [
            {"time": "14:28", "text": "Rainfall sensor detected precipitation exceeding 40 mm/h.", "dot": "red"},
            {"time": "14:29", "text": "Underpass water accumulation warning active.", "dot": "red"},
            {"time": "14:30", "text": "BBMP mobile de-watering pump dispatched.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-011",
        "alert_type": "traffic",
        "title": "Severe Flash Flood Waterlogging",
        "description": "Ejipura inner ring road underpass submerged by 45cm runoff, blocking all vehicular movement.",
        "severity": "Critical",
        "status": "Active",
        "location": "Ejipura Underpass",
        "location_id": "loc-011",
        "time_str": "14:25",
        "time_ago": "8 minutes ago",
        "timestamp": "27 Sep 2026, 14:25",
        "source": "Hydrological Sensor Network",
        "camera_feed_url": None,
        "camera_feed_label": "Ejipura Waterway Sensor 03",
        "icon": "waves",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Mobility", "level": "High", "pct": 92, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 95, "color": "#EF4444"},
            {"category": "Road Condition", "level": "High", "pct": 90, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "30 – 60 minutes",
            "affected_stretch": "Inner Ring Road Koramangala - Indiranagar Link",
            "possible_cause": "Stormwater Culvert Breach",
            "agencies_notified": "BBMP, Emergency Rescue, Traffic Police"
        },
        "telemetry_metrics": {
            "road_condition": "45cm Submerged",
            "affected_stretch": "Ejipura Underpass",
            "rainfall": "38 mm/h"
        },
        "live_updates": [
            {"time": "14:25", "text": "Water depth sensor breached critical safety limit.", "dot": "red"},
            {"time": "14:27", "text": "Both carriageways closed by traffic police.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-012",
        "alert_type": "transit",
        "title": "Metro Signaling Grid Failure",
        "description": "Signaling automation trip between Majestic and MG Road causing train holding and station congestion.",
        "severity": "Critical",
        "status": "Active",
        "location": "Majestic Metro Intermodal Hub",
        "location_id": "loc-012",
        "time_str": "14:23",
        "time_ago": "10 minutes ago",
        "timestamp": "27 Sep 2026, 14:23",
        "source": "BMRCL SCADA System",
        "camera_feed_url": None,
        "camera_feed_label": "BMRCL Majestic Platform Feeds",
        "icon": "bus",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "High", "pct": 96, "color": "#EF4444"},
            {"category": "Crowd Movement", "level": "High", "pct": 88, "color": "#EF4444"},
            {"category": "Mobility", "level": "High", "pct": 82, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "25 – 45 minutes",
            "affected_stretch": "Purple Line Corridor",
            "possible_cause": "Interlocking System Fault",
            "agencies_notified": "BMRCL Operations, City Police"
        },
        "telemetry_metrics": {
            "transit_mode": "Purple Line Metro",
            "crowd_density": "890 people/km²"
        },
        "live_updates": [
            {"time": "14:23", "text": "Signal interlocking fallback active.", "dot": "red"},
            {"time": "14:25", "text": "Crowd control protocols initiated at concourse.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-013",
        "alert_type": "traffic",
        "title": "Multi-Vehicle Pileup",
        "description": "Three heavy freight trucks and two passenger vehicles collision blocking northbound lanes.",
        "severity": "Critical",
        "status": "Active",
        "location": "NICE Road Toll Plaza",
        "location_id": "loc-013",
        "time_str": "14:19",
        "time_ago": "14 minutes ago",
        "timestamp": "27 Sep 2026, 14:19",
        "source": "Expressway Surveillance",
        "camera_feed_url": None,
        "camera_feed_label": "NICE Road KM 14 Cam",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Mobility", "level": "High", "pct": 88, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 92, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "45 – 70 minutes",
            "affected_stretch": "Hosur Road to Bannerghatta Link",
            "possible_cause": "High-Speed Brake Failure",
            "agencies_notified": "Expressway Authority, Trauma Ambulance, BTP"
        },
        "telemetry_metrics": {
            "speed": "5 km/h",
            "affected_road": "NICE Ring Road KM 14"
        },
        "live_updates": [
            {"time": "14:19", "text": "Collision alert generated from automated speed delta.", "dot": "red"},
            {"time": "14:21", "text": "Ambulances and cranes dispatched.", "dot": "blue"}
        ],
        "comments": []
    },

    # --- 2. HIGH (12 Total) ---
    {
        "id": "alt-003",
        "alert_type": "crowd",
        "title": "Large Crowd Gathering",
        "description": "Significant pedestrian surge observed near shopping district and transport node.",
        "severity": "High",
        "status": "Active",
        "location": "MG Road",
        "location_id": "loc-002",
        "time_str": "14:26",
        "time_ago": "7 minutes ago",
        "timestamp": "27 Sep 2026, 14:26",
        "source": "Crowd Sensors",
        "camera_feed_url": None,
        "camera_feed_label": "MG Road Concourse Cam",
        "icon": "users",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "High", "pct": 80, "color": "#EF4444"},
            {"category": "Public Transport", "level": "High", "pct": 75, "color": "#EF4444"},
            {"category": "Mobility", "level": "Moderate", "pct": 55, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 20 minutes",
            "affected_stretch": "MG Road & Brigade Road",
            "possible_cause": "Promotional Event + Transit Egress",
            "agencies_notified": "BMRCL, City Police"
        },
        "telemetry_metrics": {
            "crowd_density": "780 people/km²",
            "change": "+35%",
            "affected_location": "MG Road Metro Station"
        },
        "live_updates": [
            {"time": "14:26", "text": "Crowd density threshold exceeded 700.", "dot": "orange"},
            {"time": "14:27", "text": "Traffic police deploying pedestrian marshals.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-004",
        "alert_type": "road",
        "title": "Road Blockage",
        "description": "Broken down heavy commercial vehicle on flyover merge obstructing two central lanes.",
        "severity": "High",
        "status": "Active",
        "location": "Silk Board Junction",
        "location_id": "loc-007",
        "time_str": "14:22",
        "time_ago": "11 minutes ago",
        "timestamp": "27 Sep 2026, 14:22",
        "source": "Traffic Enforcement Feed",
        "camera_feed_url": None,
        "camera_feed_label": "Silk Board Flyover Approach",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "High", "pct": 85, "color": "#EF4444"},
            {"category": "Mobility", "level": "High", "pct": 80, "color": "#EF4444"},
            {"category": "Public Transport", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "25 – 45 minutes",
            "affected_stretch": "Silk Board to HSR Layout Ramp",
            "possible_cause": "Broken Down Heavy Commercial Vehicle",
            "agencies_notified": "Traffic Police, Towing Unit"
        },
        "telemetry_metrics": {
            "speed": "8 km/h",
            "road_condition": "Obstruction on Ramp",
            "affected_stretch": "Silk Board Merge"
        },
        "live_updates": [
            {"time": "14:22", "text": "Road obstruction detected.", "dot": "orange"},
            {"time": "14:24", "text": "Heavy recovery crane deployed.", "dot": "blue"}
        ],
        "comments": []
    },
    {
        "id": "alt-005",
        "alert_type": "transit",
        "title": "Public Transport Disruption",
        "description": "Significant bus delay on arterial corridors due to Majestic terminal gridlock.",
        "severity": "High",
        "status": "Active",
        "location": "Krantivira Sangolli Rayanna (KSR) Station",
        "location_id": "loc-005",
        "time_str": "14:20",
        "time_ago": "13 minutes ago",
        "timestamp": "27 Sep 2026, 14:20",
        "source": "Transit Dispatch",
        "camera_feed_url": None,
        "camera_feed_label": "Majestic Bus Terminal Flow",
        "icon": "bus",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "High", "pct": 85, "color": "#EF4444"},
            {"category": "Crowd Movement", "level": "High", "pct": 70, "color": "#EF4444"},
            {"category": "Mobility", "level": "Moderate", "pct": 60, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "15 – 25 minutes",
            "affected_stretch": "Majestic Terminal Approach",
            "possible_cause": "Gridlock at Subedar Chatram Road",
            "agencies_notified": "BMTC Operations, KSRTC"
        },
        "telemetry_metrics": {
            "speed": "11 km/h",
            "affected_road": "Majestic Transit Terminal"
        },
        "live_updates": [
            {"time": "14:20", "text": "Bus schedule delays exceed 20 min.", "dot": "orange"}
        ],
        "comments": []
    },
    {
        "id": "alt-014",
        "alert_type": "traffic",
        "title": "Severe Bottleneck on Tin Factory Flyover",
        "description": "Merging traffic between KR Puram railway bridge and Old Madras road backed up 3.2km.",
        "severity": "High",
        "status": "Active",
        "location": "Tin Factory Junction",
        "location_id": "loc-014",
        "time_str": "14:16",
        "time_ago": "17 minutes ago",
        "timestamp": "27 Sep 2026, 14:16",
        "source": "Traffic Surveillance",
        "camera_feed_url": None,
        "camera_feed_label": "KR Puram Hanging Bridge North",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "High", "pct": 84, "color": "#EF4444"},
            {"category": "Mobility", "level": "High", "pct": 79, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "25 – 40 minutes",
            "affected_stretch": "KR Puram Hanging Bridge to Baiyappanahalli",
            "possible_cause": "Heavy Inflow + Merge Friction",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"speed": "12 km/h", "congestion_level": "82%"},
        "live_updates": [{"time": "14:16", "text": "Congestion wave detected.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-015",
        "alert_type": "weather",
        "title": "Thunderstorm & High Wind Advisory",
        "description": "Wind gusts exceeding 55 km/h causing fallen branches across Bannerghatta corridor.",
        "severity": "High",
        "status": "Active",
        "location": "Bannerghatta Road",
        "location_id": "loc-015",
        "time_str": "14:14",
        "time_ago": "19 minutes ago",
        "timestamp": "27 Sep 2026, 14:14",
        "source": "Meteorological Doppler",
        "camera_feed_url": None,
        "camera_feed_label": "South Bangalore Radar",
        "icon": "cloud-rain",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "High", "pct": 75, "color": "#EF4444"},
            {"category": "Mobility", "level": "Moderate", "pct": 60, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "15 – 25 minutes",
            "affected_stretch": "IIMB to Meenakshi Mall Stretch",
            "possible_cause": "Squall Line Movement",
            "agencies_notified": "BBMP Forest Cell, BESCOM"
        },
        "telemetry_metrics": {"wind_speed": "58 km/h", "rainfall": "18 mm/h"},
        "live_updates": [{"time": "14:14", "text": "High wind alert activated.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-016",
        "alert_type": "crowd",
        "title": "Stadium Ingress Footfall Spike",
        "description": "22,000 spectators arriving simultaneously for cricket fixture; pedestrian overflow onto Queens Road.",
        "severity": "High",
        "status": "Active",
        "location": "Chinnaswamy Stadium",
        "location_id": "loc-016",
        "time_str": "14:11",
        "time_ago": "22 minutes ago",
        "timestamp": "27 Sep 2026, 14:11",
        "source": "Smart CCTV Analytics",
        "camera_feed_url": None,
        "camera_feed_label": "Queens Road Gate 3",
        "icon": "users",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "High", "pct": 88, "color": "#EF4444"},
            {"category": "Public Transport", "level": "High", "pct": 82, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "20 – 35 minutes",
            "affected_stretch": "Cubbon Park - Queens Road Periphery",
            "possible_cause": "Stadium Gate Ingress",
            "agencies_notified": "City Police, BTP, BMRCL"
        },
        "telemetry_metrics": {"crowd_density": "820 people/km²", "change": "+45%"},
        "live_updates": [{"time": "14:11", "text": "Spectator ingress peak confirmed.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-017",
        "alert_type": "road",
        "title": "Underpass Lane Inundation",
        "description": "Koramangala 80ft road underpass drainage pump electrical failure; single lane traffic only.",
        "severity": "High",
        "status": "Active",
        "location": "Koramangala 80ft Road",
        "location_id": "loc-005",
        "time_str": "14:08",
        "time_ago": "25 minutes ago",
        "timestamp": "27 Sep 2026, 14:08",
        "source": "Drainage IoT Station",
        "camera_feed_url": None,
        "camera_feed_label": "Koramangala 80ft Underpass",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "High", "pct": 78, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 74, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "20 – 35 minutes",
            "affected_stretch": "Koramangala Sony World Link",
            "possible_cause": "Drain Pump Electrical Trip",
            "agencies_notified": "BBMP Engineering, Traffic Police"
        },
        "telemetry_metrics": {"road_condition": "20cm water accumulation"},
        "live_updates": [{"time": "14:08", "text": "Pump malfunction alert logged.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-018",
        "alert_type": "traffic",
        "title": "Hospital Emergency Corridor Congestion",
        "description": "Ambulance artery between Richmond Circle and Bowring Hospital experiencing high delay.",
        "severity": "High",
        "status": "Active",
        "location": "Richmond Circle",
        "location_id": "loc-018",
        "time_str": "14:06",
        "time_ago": "27 minutes ago",
        "timestamp": "27 Sep 2026, 14:06",
        "source": "Emergency Fleet GPS",
        "camera_feed_url": None,
        "camera_feed_label": "Richmond Flyover Cam",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Mobility", "level": "High", "pct": 82, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 76, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "15 – 30 minutes",
            "affected_stretch": "Richmond Circle to Residency Road",
            "possible_cause": "Signal Synchronization Glitch",
            "agencies_notified": "Emergency Dispatch, Traffic Police"
        },
        "telemetry_metrics": {"speed": "16 km/h", "congestion_level": "78%"},
        "live_updates": [{"time": "14:06", "text": "Priority corridor slowdown flagged.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-019",
        "alert_type": "transit",
        "title": "Airport Bus Line Congestion Delay",
        "description": "Vayu Vajra airport shuttle buses experiencing 35-minute delays on Hebbal flyover ramp.",
        "severity": "High",
        "status": "Active",
        "location": "Hebbal Flyover",
        "location_id": "loc-010",
        "time_str": "14:03",
        "time_ago": "30 minutes ago",
        "timestamp": "27 Sep 2026, 14:03",
        "source": "BMTC Airport Line Dispatch",
        "camera_feed_url": None,
        "camera_feed_label": "Hebbal Elevated Corridor",
        "icon": "bus",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "High", "pct": 80, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 75, "color": "#EF4444"}
        ],
        "related_info": {
            "approx_delay": "25 – 40 minutes",
            "affected_stretch": "Hebbal Outer Ring Road Loop",
            "possible_cause": "Airport-bound Heavy Volume",
            "agencies_notified": "BMTC, BIAL Traffic Desk"
        },
        "telemetry_metrics": {"speed": "18 km/h"},
        "live_updates": [{"time": "14:03", "text": "Shuttle delay telemetry received.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-020",
        "alert_type": "road",
        "title": "Pavement Subsidence Alert",
        "description": "Road surface depression identified near metro pillar 142 on Hosur road.",
        "severity": "High",
        "status": "Active",
        "location": "Electronic City Expressway",
        "location_id": "loc-020",
        "time_str": "14:01",
        "time_ago": "32 minutes ago",
        "timestamp": "27 Sep 2026, 14:01",
        "source": "Infrastructure LiDAR Sensor",
        "camera_feed_url": None,
        "camera_feed_label": "Hosur Road Pillar 142 Cam",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "High", "pct": 82, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 65, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "15 – 30 minutes",
            "affected_stretch": "Kudlu Gate to Singasandra",
            "possible_cause": "Sub-surface Water Leaching",
            "agencies_notified": "NHAI, BMRCL, Traffic Police"
        },
        "telemetry_metrics": {"road_condition": "Subsidence detected"},
        "live_updates": [{"time": "14:01", "text": "Structural sensor flagged warning.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-021",
        "alert_type": "traffic",
        "title": "Commercial Zone Delivery Congestion",
        "description": "E-commerce logistics trucks parked on carriage-way impeding outbound lanes.",
        "severity": "High",
        "status": "Active",
        "location": "Peenya Industrial Area",
        "location_id": "loc-021",
        "time_str": "13:58",
        "time_ago": "35 minutes ago",
        "timestamp": "27 Sep 2026, 13:58",
        "source": "Automated Patrol",
        "camera_feed_url": None,
        "camera_feed_label": "Peenya 1st Stage Gate Cam",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "High", "pct": 74, "color": "#EF4444"},
            {"category": "Mobility", "level": "Moderate", "pct": 60, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "20 – 30 minutes",
            "affected_stretch": "Tumkur Road - Peenya Flyover Under",
            "possible_cause": "Unregulated Freight Loading",
            "agencies_notified": "Industrial Security, Traffic Police"
        },
        "telemetry_metrics": {"speed": "14 km/h"},
        "live_updates": [{"time": "13:58", "text": "Obstruction recorded by patrol.", "dot": "orange"}],
        "comments": []
    },
    {
        "id": "alt-022",
        "alert_type": "crowd",
        "title": "Convention Center Exhibition Overflow",
        "description": "Tech summit attendee vehicles queuing onto outer service roads.",
        "severity": "High",
        "status": "Active",
        "location": "BIEC Tumkur Road",
        "location_id": "loc-022",
        "time_str": "13:55",
        "time_ago": "38 minutes ago",
        "timestamp": "27 Sep 2026, 13:55",
        "source": "Gate Sensors",
        "camera_feed_url": None,
        "camera_feed_label": "BIEC Entrance Gates",
        "icon": "users",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "High", "pct": 76, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 68, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "15 – 30 minutes",
            "affected_stretch": "Madavara Metro Station Periphery",
            "possible_cause": "Major Tech Summit Concluding Day",
            "agencies_notified": "Event Security, Traffic Police"
        },
        "telemetry_metrics": {"crowd_density": "690 people/km²"},
        "live_updates": [{"time": "13:55", "text": "Gate overflow detected.", "dot": "orange"}],
        "comments": []
    },

    # --- 3. MODERATE (18 Total) ---
    {
        "id": "alt-006",
        "alert_type": "utility",
        "title": "Power Outage",
        "description": "11kV feeder trip resulting in non-functional traffic signals across 100ft road intersections.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Indiranagar",
        "location_id": "loc-003",
        "time_str": "14:18",
        "time_ago": "15 minutes ago",
        "timestamp": "27 Sep 2026, 14:18",
        "source": "BESCOM Grid Monitor",
        "camera_feed_url": None,
        "camera_feed_label": "100ft Road Feeder Station",
        "icon": "zap",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 45, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 40, "color": "#F97316"},
            {"category": "Public Transport", "level": "Low", "pct": 20, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "5 – 10 minutes",
            "affected_stretch": "100ft Road & 12th Main Signals",
            "possible_cause": "Tree Branch Fall on Overhead Line",
            "agencies_notified": "BESCOM Control Room, Traffic Police"
        },
        "telemetry_metrics": {"status": "Grid Trip", "affected_road": "Indiranagar 100ft Road"},
        "live_updates": [{"time": "14:18", "text": "Signal power drop recorded.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-007",
        "alert_type": "traffic",
        "title": "Accident Reported",
        "description": "Minor two-wheeler collision on Bellandur service road; traffic flowing slowly around cordon.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Bellandur",
        "location_id": "loc-007",
        "time_str": "14:15",
        "time_ago": "18 minutes ago",
        "timestamp": "27 Sep 2026, 14:15",
        "source": "Highway Patrol Alert",
        "camera_feed_url": None,
        "camera_feed_label": "Bellandur EcoSpace Approach",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 65, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 60, "color": "#F97316"},
            {"category": "Crowd Movement", "level": "Low", "pct": 25, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "15 – 30 minutes",
            "affected_stretch": "Bellandur EcoSpace Service Road",
            "possible_cause": "Two-wheeler Collision",
            "agencies_notified": "Traffic Police, 108 Ambulance"
        },
        "telemetry_metrics": {"speed": "18 km/h"},
        "live_updates": [{"time": "14:15", "text": "Incident flagged by monitoring.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-008",
        "alert_type": "weather",
        "title": "Waterlogging",
        "description": "15cm water accumulation near Sony World junction following afternoon downpour.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Koramangala",
        "location_id": "loc-005",
        "time_str": "14:12",
        "time_ago": "21 minutes ago",
        "timestamp": "27 Sep 2026, 14:12",
        "source": "Drainage Sensor Network",
        "camera_feed_url": None,
        "camera_feed_label": "Sony World Junction Sensor",
        "icon": "waves",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 65, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 55, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 20 minutes",
            "affected_stretch": "Sony World Junction to 80ft Road",
            "possible_cause": "Silt Trap Clogging at Inflow",
            "agencies_notified": "BBMP Engineering"
        },
        "telemetry_metrics": {"rainfall": "18 mm/h", "water_depth": "15 cm"},
        "live_updates": [{"time": "14:12", "text": "Runoff threshold reached.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-023",
        "alert_type": "traffic",
        "title": "Flyover Expansion Joint Inspection",
        "description": "Single lane cordoned off for technical measurement on Domlur flyover.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Domlur Flyover",
        "location_id": "loc-023",
        "time_str": "14:09",
        "time_ago": "24 minutes ago",
        "timestamp": "27 Sep 2026, 14:09",
        "source": "Municipal Bridge Cell",
        "camera_feed_url": None,
        "camera_feed_label": "Domlur Flyover East Ramp",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 58, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 52, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 18 minutes",
            "affected_stretch": "Old Airport Road towards Indiranagar",
            "possible_cause": "Bridge Maintenance Survey",
            "agencies_notified": "BBMP Bridges, Traffic Police"
        },
        "telemetry_metrics": {"speed": "24 km/h"},
        "live_updates": [{"time": "14:09", "text": "Survey zone active.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-024",
        "alert_type": "crowd",
        "title": "Metro Station Ticket Barrier Slowdown",
        "description": "Automated fare collection gate maintenance causing minor queues at Byappanahalli.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Byappanahalli Metro",
        "location_id": "loc-024",
        "time_str": "14:07",
        "time_ago": "26 minutes ago",
        "timestamp": "27 Sep 2026, 14:07",
        "source": "Metro Station Telemetry",
        "camera_feed_url": None,
        "camera_feed_label": "Concourse AFC Gates",
        "icon": "users",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "Moderate", "pct": 55, "color": "#F97316"},
            {"category": "Crowd Movement", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 12 minutes",
            "affected_stretch": "South Concourse Ticket Gates",
            "possible_cause": "Network Handshake Delay",
            "agencies_notified": "BMRCL AFC Team"
        },
        "telemetry_metrics": {"crowd_density": "450 people/km²"},
        "live_updates": [{"time": "14:07", "text": "Manual tokens deployed.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-025",
        "alert_type": "traffic",
        "title": "Signal Timing Asynchrony",
        "description": "Adaptive signal controller operating in pre-timed backup mode at Sony World junction.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Koramangala Sony World",
        "location_id": "loc-025",
        "time_str": "14:04",
        "time_ago": "29 minutes ago",
        "timestamp": "27 Sep 2026, 14:04",
        "source": "Adaptive Traffic System",
        "camera_feed_url": None,
        "camera_feed_label": "Sony World Controller Box",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 60, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 55, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 20 minutes",
            "affected_stretch": "80ft Road Intersect",
            "possible_cause": "Optical Fiber Cut",
            "agencies_notified": "Traffic Police IT Cell"
        },
        "telemetry_metrics": {"congestion_level": "68%"},
        "live_updates": [{"time": "14:04", "text": "Fallback cycle active.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-026",
        "alert_type": "weather",
        "title": "Precipitation Runoff Near Flyover Pillar",
        "description": "Drain spout water cascade splashing onto lower carriage-way at Dairy Circle.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Dairy Circle Flyover",
        "location_id": "loc-026",
        "time_str": "14:02",
        "time_ago": "31 minutes ago",
        "timestamp": "27 Sep 2026, 14:02",
        "source": "Civic Ward Sensors",
        "camera_feed_url": None,
        "camera_feed_label": "Dairy Circle Lower Ramp",
        "icon": "waves",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 50, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 45, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 15 minutes",
            "affected_stretch": "Bannerghatta to Hosur Road Junction",
            "possible_cause": "Drain Spout Clog",
            "agencies_notified": "BBMP Maintenance"
        },
        "telemetry_metrics": {"rainfall": "14 mm/h"},
        "live_updates": [{"time": "14:02", "text": "Water runoff alert logged.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-027",
        "alert_type": "traffic",
        "title": "Delivery Fleet Vehicle Breakdown",
        "description": "Mini delivery van broken down in curbside lane on Sarjapur road near Wipro gate.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Sarjapur Road",
        "location_id": "loc-027",
        "time_str": "13:59",
        "time_ago": "34 minutes ago",
        "timestamp": "27 Sep 2026, 13:59",
        "source": "Traffic Warden Mobile",
        "camera_feed_url": None,
        "camera_feed_label": "Wipro Sarjapur Gate Cam",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 58, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 20 minutes",
            "affected_stretch": "Kaikondrahalli to Doddakannelli",
            "possible_cause": "Transmission Failure",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"speed": "20 km/h"},
        "live_updates": [{"time": "13:59", "text": "Tow vehicle en route.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-028",
        "alert_type": "utility",
        "title": "Streetlight Circuit Breaker Trip",
        "description": "500-meter stretch of street illumination offline along Kanakapura road.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Kanakapura Road",
        "location_id": "loc-028",
        "time_str": "13:56",
        "time_ago": "37 minutes ago",
        "timestamp": "27 Sep 2026, 13:56",
        "source": "Smart Lighting Gateway",
        "camera_feed_url": None,
        "camera_feed_label": "Kanakapura Pole 88",
        "icon": "zap",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 48, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "No significant delay",
            "affected_stretch": "Konanakunte Cross to Metro",
            "possible_cause": "MCB Overload",
            "agencies_notified": "BBMP Electrical"
        },
        "telemetry_metrics": {"status": "Circuit Trip"},
        "live_updates": [{"time": "13:56", "text": "Automated ticket raised to BESCOM.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-029",
        "alert_type": "crowd",
        "title": "Transit Interchange Commuter Surge",
        "description": "Post-shift tech corridor shuttle passengers grouping at Kadubeesanahalli footbridge.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Kadubeesanahalli ORR",
        "location_id": "loc-029",
        "time_str": "13:53",
        "time_ago": "40 minutes ago",
        "timestamp": "27 Sep 2026, 13:53",
        "source": "Pedestrian Sensors",
        "camera_feed_url": None,
        "camera_feed_label": "Skywalk Camera 02",
        "icon": "users",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "Moderate", "pct": 60, "color": "#F97316"},
            {"category": "Public Transport", "level": "Moderate", "pct": 52, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 15 minutes",
            "affected_stretch": "Kadubeesanahalli Skywalk",
            "possible_cause": "Shift Change Inflow",
            "agencies_notified": "ORRCA Traffic Marshals"
        },
        "telemetry_metrics": {"crowd_density": "510 people/km²"},
        "live_updates": [{"time": "13:53", "text": "Pedestrian marshals on station.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-030",
        "alert_type": "road",
        "title": "Telecom Fiber Trenching Safety Cordon",
        "description": "Excavation barrier occupies 1.5 meters of lane near Lalbagh West Gate.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Lalbagh West Gate",
        "location_id": "loc-030",
        "time_str": "13:51",
        "time_ago": "42 minutes ago",
        "timestamp": "27 Sep 2026, 13:51",
        "source": "Right-of-Way GIS",
        "camera_feed_url": None,
        "camera_feed_label": "Lalbagh Perimeter Road",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 50, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 45, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 10 minutes",
            "affected_stretch": "Krumbiegal Road Junction",
            "possible_cause": "Permitted Fiber Cable Pull",
            "agencies_notified": "BBMP ROW Cell"
        },
        "telemetry_metrics": {"road_condition": "Lane partially reduced"},
        "live_updates": [{"time": "13:51", "text": "Safety barricades verified.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-031",
        "alert_type": "traffic",
        "title": "U-Turn Merge Slowdown",
        "description": "Slow merging at newly constructed U-turn loop opposite Manyata Tech Park.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Nagawara – Manyata Park",
        "location_id": "loc-031",
        "time_str": "13:48",
        "time_ago": "45 minutes ago",
        "timestamp": "27 Sep 2026, 13:48",
        "source": "Traffic Velocity Radar",
        "camera_feed_url": None,
        "camera_feed_label": "Manyata Gate 2 Loop",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 62, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 54, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 20 minutes",
            "affected_stretch": "Outer Ring Road Nagawara Section",
            "possible_cause": "Merge Queue Spilling to Fast Lane",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"speed": "22 km/h"},
        "live_updates": [{"time": "13:48", "text": "Velocity sensor slowdown logged.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-032",
        "alert_type": "weather",
        "title": "Low Visibility Fog / Mist Warning",
        "description": "Localized mist formation lowering visibility to 300m on Airport expressway.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Devanahalli Highway Corridor",
        "location_id": "loc-032",
        "time_str": "13:45",
        "time_ago": "48 minutes ago",
        "timestamp": "27 Sep 2026, 13:45",
        "source": "Aviation Weather Uplink",
        "camera_feed_url": None,
        "camera_feed_label": "Trumpet Interchange Cam",
        "icon": "cloud-rain",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 55, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 48, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 15 minutes",
            "affected_stretch": "Yelahanka to Trumpet Interchange",
            "possible_cause": "Atmospheric Inversion",
            "agencies_notified": "NHAI VMS Operator"
        },
        "telemetry_metrics": {"weather_condition": "Mist / Fog", "visibility": "300m"},
        "live_updates": [{"time": "13:45", "text": "Variable speed limits activated on VMS.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-033",
        "alert_type": "transit",
        "title": "Bus Rapid Transit Lane Incursion",
        "description": "Private four-wheelers breaching designated priority bus lane at Mahadevapura.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Mahadevapura ORR",
        "location_id": "loc-033",
        "time_str": "13:42",
        "time_ago": "51 minutes ago",
        "timestamp": "27 Sep 2026, 13:42",
        "source": "AI Enforcement Camera",
        "camera_feed_url": None,
        "camera_feed_label": "Bus Lane Cam 12",
        "icon": "bus",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "Moderate", "pct": 56, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "5 – 12 minutes",
            "affected_stretch": "Mahadevapura to Marathahalli",
            "possible_cause": "Peak Ingress Congestion",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"speed": "20 km/h"},
        "live_updates": [{"time": "13:42", "text": "Automated challan generation triggered.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-034",
        "alert_type": "traffic",
        "title": "Slow Moving Oversized Cargo Escort",
        "description": "Heavy turbine transporter moving under escort at 12 km/h along Hosur road.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Bommasandra Industrial Belt",
        "location_id": "loc-034",
        "time_str": "13:38",
        "time_ago": "55 minutes ago",
        "timestamp": "27 Sep 2026, 13:38",
        "source": "Highway Patrol Liaison",
        "camera_feed_url": None,
        "camera_feed_label": "Hosur Expressway KM 22",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 54, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 48, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "10 – 18 minutes",
            "affected_stretch": "Attibele to Chandapura",
            "possible_cause": "Permitted Oversized Freight",
            "agencies_notified": "Traffic Police Escort"
        },
        "telemetry_metrics": {"speed": "12 km/h"},
        "live_updates": [{"time": "13:38", "text": "Cargo convoy logged.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-035",
        "alert_type": "road",
        "title": "Speed Cushion Surface Raveling",
        "description": "Worn thermoplastic speed table causing motorists to brake abruptly.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Vittal Mallya Road",
        "location_id": "loc-035",
        "time_str": "13:35",
        "time_ago": "58 minutes ago",
        "timestamp": "27 Sep 2026, 13:35",
        "source": "Road Surface Laser Sensor",
        "camera_feed_url": None,
        "camera_feed_label": "Vittal Mallya Crossing",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 46, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "3 – 8 minutes",
            "affected_stretch": "UB City Approach",
            "possible_cause": "Surface Wear",
            "agencies_notified": "BBMP Roads"
        },
        "telemetry_metrics": {"road_condition": "Surface irregularity"},
        "live_updates": [{"time": "13:35", "text": "Surface maintenance work order queued.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-036",
        "alert_type": "utility",
        "title": "Water Main Leakage Cordon",
        "description": "BWSSB pipeline repair work taking up one curb lane on Old Madras road.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Old Madras Road",
        "location_id": "loc-036",
        "time_str": "13:30",
        "time_ago": "1 hour ago",
        "timestamp": "27 Sep 2026, 13:30",
        "source": "BWSSB Dispatch",
        "camera_feed_url": None,
        "camera_feed_label": "OMR Pillar 89",
        "icon": "waves",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Moderate", "pct": 52, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 48, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "8 – 15 minutes",
            "affected_stretch": "Ulsoor to Swami Vivekananda Rd",
            "possible_cause": "Emergency Water Pipe Weld",
            "agencies_notified": "BWSSB, Traffic Police"
        },
        "telemetry_metrics": {"road_condition": "One lane cordoned"},
        "live_updates": [{"time": "13:30", "text": "Repair team on site.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-044",
        "alert_type": "traffic",
        "title": "Feeder Bus Bay Queue Spillover",
        "description": "Peak hour feeder buses queuing outside Kengeri terminal entry gate causing moderate curb delay.",
        "severity": "Moderate",
        "status": "Active",
        "location": "Kengeri Satellite Town Corridor",
        "location_id": "loc-044",
        "time_str": "13:28",
        "time_ago": "1.1 hours ago",
        "timestamp": "27 Sep 2026, 13:28",
        "source": "BMTC Feeder Telemetry",
        "camera_feed_url": None,
        "camera_feed_label": "Kengeri Terminal Ingress Cam",
        "icon": "bus",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Public Transport", "level": "Moderate", "pct": 54, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 48, "color": "#F97316"}
        ],
        "related_info": {
            "approx_delay": "8 – 14 minutes",
            "affected_stretch": "Mysuru Road Metro Terminal Approach",
            "possible_cause": "Feeder Schedule Bunching",
            "agencies_notified": "BMTC, Traffic Police"
        },
        "telemetry_metrics": {"speed": "21 km/h"},
        "live_updates": [{"time": "13:28", "text": "Feeder queue marshals active.", "dot": "blue"}],
        "comments": []
    },

    # --- 4. LOW (9 Total) ---
    {
        "id": "alt-009",
        "alert_type": "event",
        "title": "Event Alert",
        "description": "Cultural handicraft exhibition opening causing gradual visitor car inflow.",
        "severity": "Low",
        "status": "Active",
        "location": "Bengaluru Palace",
        "location_id": "loc-009",
        "time_str": "14:10",
        "time_ago": "23 minutes ago",
        "timestamp": "27 Sep 2026, 14:10",
        "source": "Palace Grounds Event Office",
        "camera_feed_url": None,
        "camera_feed_label": "Gate 1 Bellary Road",
        "icon": "info",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "Moderate", "pct": 40, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Low", "pct": 30, "color": "#10B981"},
            {"category": "Mobility", "level": "Low", "pct": 25, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "5 – 10 minutes",
            "affected_stretch": "Bellary Road Palace Gate 1",
            "possible_cause": "Exhibition Opening Day",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"crowd_density": "320 people/km²"},
        "live_updates": [{"time": "14:10", "text": "Event parking protocol initiated.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-010",
        "alert_type": "road_work",
        "title": "Road Work",
        "description": "Scheduled surface milling on airport-bound loop during low-density window.",
        "severity": "Low",
        "status": "Active",
        "location": "Hebbal Flyover",
        "location_id": "loc-010",
        "time_str": "14:05",
        "time_ago": "28 minutes ago",
        "timestamp": "27 Sep 2026, 14:05",
        "source": "BDA Maintenance Unit",
        "camera_feed_url": None,
        "camera_feed_label": "Hebbal Airport Loop",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 45, "color": "#F97316"},
            {"category": "Road Condition", "level": "Moderate", "pct": 40, "color": "#F97316"},
            {"category": "Mobility", "level": "Low", "pct": 30, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "5 – 15 minutes",
            "affected_stretch": "Airport Bound Ramp Expansion",
            "possible_cause": "Scheduled Road Milling",
            "agencies_notified": "BDA, NHAI"
        },
        "telemetry_metrics": {"speed": "32 km/h"},
        "live_updates": [{"time": "14:05", "text": "Worksite cones aligned.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-037",
        "alert_type": "event",
        "title": "Public Park Morning Gathering",
        "description": "Weekend fitness gathering dispersing peacefully from Cubbon Park.",
        "severity": "Low",
        "status": "Active",
        "location": "Cubbon Park",
        "location_id": "loc-037",
        "time_str": "13:50",
        "time_ago": "43 minutes ago",
        "timestamp": "27 Sep 2026, 13:50",
        "source": "Horticulture Department",
        "camera_feed_url": None,
        "camera_feed_label": "K.R. Circle Gate",
        "icon": "info",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Crowd Movement", "level": "Low", "pct": 25, "color": "#10B981"},
            {"category": "Mobility", "level": "Low", "pct": 18, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "Negligible",
            "affected_stretch": "Kasturba Road Promenade",
            "possible_cause": "Scheduled Recreational Activity",
            "agencies_notified": "Park Security"
        },
        "telemetry_metrics": {"crowd_density": "210 people/km²"},
        "live_updates": [{"time": "13:50", "text": "Dispersal orderly.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-038",
        "alert_type": "road_work",
        "title": "Line Marking Retouching",
        "description": "Thermoplastic pedestrian crosswalk painting along MG road during daytime lull.",
        "severity": "Low",
        "status": "Active",
        "location": "MG Road Crossing",
        "location_id": "loc-002",
        "time_str": "13:40",
        "time_ago": "53 minutes ago",
        "timestamp": "27 Sep 2026, 13:40",
        "source": "Traffic Engineering Section",
        "camera_feed_url": None,
        "camera_feed_label": "Trinity Circle West",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Low", "pct": 20, "color": "#10B981"},
            {"category": "Traffic Flow", "level": "Low", "pct": 18, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "2 – 5 minutes",
            "affected_stretch": "Trinity Circle to Anil Kumble Circle",
            "possible_cause": "Routine Paint Touch-up",
            "agencies_notified": "BBMP Traffic Cell"
        },
        "telemetry_metrics": {"speed": "38 km/h"},
        "live_updates": [{"time": "13:40", "text": "Single paint cart operating.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-039",
        "alert_type": "weather",
        "title": "Light Drizzle Advisory",
        "description": "Intermittent light drizzle (1.2 mm/h) across Jayanagar residential sectors.",
        "severity": "Low",
        "status": "Active",
        "location": "Jayanagar 4th Block",
        "location_id": "loc-039",
        "time_str": "13:32",
        "time_ago": "1 hour ago",
        "timestamp": "27 Sep 2026, 13:32",
        "source": "City Weather Net",
        "camera_feed_url": None,
        "camera_feed_label": "Jayanagar Shopping Complex",
        "icon": "cloud-rain",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Low", "pct": 18, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "No delay",
            "affected_stretch": "11th Main Road",
            "possible_cause": "Passing Cloud Band",
            "agencies_notified": "None"
        },
        "telemetry_metrics": {"rainfall": "1.2 mm/h", "temperature": "26.0°C"},
        "live_updates": [{"time": "13:32", "text": "Light drizzle recorded.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-040",
        "alert_type": "event",
        "title": "School Zone Vehicle Influx Advisory",
        "description": "School buses positioning in dedicated pick-up bays along Residency road.",
        "severity": "Low",
        "status": "Active",
        "location": "Residency Road",
        "location_id": "loc-040",
        "time_str": "13:25",
        "time_ago": "1 hour ago",
        "timestamp": "27 Sep 2026, 13:25",
        "source": "Traffic Wardens",
        "camera_feed_url": None,
        "camera_feed_label": "Museum Road Crossing",
        "icon": "info",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Low", "pct": 28, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "5 – 10 minutes",
            "affected_stretch": "Richmond Town Schools Node",
            "possible_cause": "School Dismissal Interval",
            "agencies_notified": "School Marshals"
        },
        "telemetry_metrics": {"speed": "28 km/h"},
        "live_updates": [{"time": "13:25", "text": "Buses within allocated zones.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-041",
        "alert_type": "road_work",
        "title": "Median Tree Pruning",
        "description": "BBMP horticulture staff pruning overgrown branches along Bellary road median.",
        "severity": "Low",
        "status": "Active",
        "location": "Bellary Road – Mekhri Circle",
        "location_id": "loc-041",
        "time_str": "13:18",
        "time_ago": "1.2 hours ago",
        "timestamp": "27 Sep 2026, 13:18",
        "source": "Forest Cell",
        "camera_feed_url": None,
        "camera_feed_label": "Mekhri Underpass North",
        "icon": "alert-triangle",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Low", "pct": 22, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "3 – 5 minutes",
            "affected_stretch": "Mekhri Circle to Palace Gate",
            "possible_cause": "Monsoon Precautionary Pruning",
            "agencies_notified": "BBMP Forest Cell"
        },
        "telemetry_metrics": {"speed": "35 km/h"},
        "live_updates": [{"time": "13:18", "text": "Pruning crew on median.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-042",
        "alert_type": "traffic",
        "title": "Minor Road Surface Patch Inspection",
        "description": "Cold-mix asphalt patch verification on Sarjapur road completed smoothly.",
        "severity": "Low",
        "status": "Active",
        "location": "Carmelaram Station Road",
        "location_id": "loc-042",
        "time_str": "13:10",
        "time_ago": "1.3 hours ago",
        "timestamp": "27 Sep 2026, 13:10",
        "source": "Quality Inspection Cell",
        "camera_feed_url": None,
        "camera_feed_label": "Carmelaram Level Crossing",
        "icon": "car",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Road Condition", "level": "Low", "pct": 15, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "Negligible",
            "affected_stretch": "Carmelaram Flyover Approach",
            "possible_cause": "Patch Quality Measurement",
            "agencies_notified": "BBMP Roads"
        },
        "telemetry_metrics": {"speed": "40 km/h"},
        "live_updates": [{"time": "13:10", "text": "Testing vehicle cleared area.", "dot": "blue"}],
        "comments": []
    },
    {
        "id": "alt-043",
        "alert_type": "event",
        "title": "University Convocation Traffic Marshals Active",
        "description": "Marshals regulating guest vehicles entering Central College campus.",
        "severity": "Low",
        "status": "Active",
        "location": "Palace Road – Central College",
        "location_id": "loc-043",
        "time_str": "13:00",
        "time_ago": "1.5 hours ago",
        "timestamp": "27 Sep 2026, 13:00",
        "source": "Campus Security",
        "camera_feed_url": None,
        "camera_feed_label": "Palace Road Campus Gate",
        "icon": "info",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
        "resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "assigned_to": None,
        "assigned_to_id": None,
        "recipient_email": None,
        "assignment_status": None,
        "assigned_at": None,
        "is_escalated": False,
        "impact_data": [
            {"category": "Traffic Flow", "level": "Low", "pct": 18, "color": "#10B981"}
        ],
        "related_info": {
            "approx_delay": "2 – 5 minutes",
            "affected_stretch": "Palace Road Near Post Office",
            "possible_cause": "Annual Convocation",
            "agencies_notified": "Traffic Police"
        },
        "telemetry_metrics": {"speed": "36 km/h"},
        "live_updates": [{"time": "13:00", "text": "Entry flow regulated successfully.", "dot": "blue"}],
        "comments": []
    }
]

# Global In-Memory Working State
ALERTS_DATA: List[Dict[str, Any]] = [dict(a) for a in INITIAL_ALERTS]

# Track newly generated or escalated critical alert IDs for real-time notification
LATEST_CRITICAL_ALERT_ID: Optional[str] = "alt-001"
LATEST_CRITICAL_TIMESTAMP: str = "27 Sep 2026, 14:31"

# Pydantic Request Models
class AcknowledgeRequest(BaseModel):
    user: Optional[str] = "Admin (Urban Authority)"

class ResolveRequest(BaseModel):
    user: Optional[str] = "Admin (Urban Authority)"

class AssignRequest(BaseModel):
    authority_id: str
    message: Optional[str] = "Please review and respond to this critical alert."

class CommentRequest(BaseModel):
    user: Optional[str] = "Admin (Urban Authority)"
    comment: str

class EscalateSimRequest(BaseModel):
    alert_id: Optional[str] = None
    target_severity: Optional[str] = "Critical"

# Router Definition
router = APIRouter(prefix="/api", tags=["Alerts & Incidents"])

_ALERTS_INITIALIZED = False

def sync_alerts_from_db():
    """
    Syncs alerts between database and memory.
    If database is empty, seeds all INITIAL_ALERTS into database.
    If database has records, populates in-memory store from database.
    """
    global ALERTS_DATA, _ALERTS_INITIALIZED
    if _ALERTS_INITIALIZED or not SessionLocal or not AlertModel:
        return
    try:
        db = SessionLocal()
        count = db.query(AlertModel).count()
        if count == 0:
            for a in INITIAL_ALERTS:
                alert_db = AlertModel(
                    id=a["id"],
                    alert_type=a.get("alert_type", "traffic"),
                    title=a.get("title", ""),
                    description=a.get("description", ""),
                    severity=a.get("severity", "Moderate"),
                    status=a.get("status", "Active"),
                    location=a.get("location", ""),
                    location_id=a.get("location_id"),
                    latitude=12.9716,
                    longitude=77.5946,
                    source=a.get("source", "Sensor Network"),
                    camera_feed_url=a.get("camera_feed_url"),
                    camera_feed_label=a.get("camera_feed_label"),
                    time_str=a.get("time_str"),
                    detected_at=a.get("timestamp", datetime.now().strftime("%d %b %Y, %H:%M")),
                    updated_at=a.get("timestamp", datetime.now().strftime("%d %b %Y, %H:%M")),
                    acknowledged=a.get("acknowledged", False),
                    acknowledged_at=a.get("acknowledged_at"),
                    acknowledged_by=a.get("acknowledged_by"),
                    resolved=a.get("resolved", False),
                    resolved_at=a.get("resolved_at"),
                    resolved_by=a.get("resolved_by"),
                    assigned_to=a.get("assigned_to"),
                    assigned_to_id=a.get("assigned_to_id"),
                    recipient_email=a.get("recipient_email"),
                    assignment_status=a.get("assignment_status"),
                    assigned_at=a.get("assigned_at"),
                    impact_data=a.get("impact_data"),
                    related_info=a.get("related_info"),
                    telemetry_metrics=a.get("telemetry_metrics"),
                    is_escalated=a.get("is_escalated", False)
                )
                db.add(alert_db)
            db.commit()
            print("[Alerts Engine] 44 Initial Alerts seeded into database.")
        else:
            db_alerts = db.query(AlertModel).all()
            db_updates = db.query(AlertUpdateModel).all() if AlertUpdateModel else []
            db_comments = db.query(AlertCommentModel).all() if AlertCommentModel else []
            
            updates_by_alert = {}
            for u in db_updates:
                updates_by_alert.setdefault(u.alert_id, []).append({
                    "time": u.timestamp,
                    "text": u.text,
                    "dot": u.dot_color
                })
            
            comments_by_alert = {}
            for c in db_comments:
                comments_by_alert.setdefault(c.alert_id, []).append({
                    "id": c.id,
                    "user": c.user,
                    "comment": c.comment,
                    "timestamp": c.timestamp
                })
                
            merged_list = []
            for row in db_alerts:
                init_match = next((x for x in INITIAL_ALERTS if x["id"] == row.id), {})
                alert_dict = {
                    **init_match,
                    "id": row.id,
                    "alert_type": row.alert_type,
                    "title": row.title,
                    "description": row.description,
                    "severity": row.severity,
                    "status": row.status,
                    "location": row.location,
                    "location_id": row.location_id,
                    "source": row.source,
                    "camera_feed_url": row.camera_feed_url,
                    "camera_feed_label": row.camera_feed_label,
                    "time_str": row.time_str,
                    "timestamp": row.detected_at,
                    "acknowledged": row.acknowledged,
                    "acknowledged_at": row.acknowledged_at,
                    "acknowledged_by": row.acknowledged_by,
                    "resolved": row.resolved,
                    "resolved_at": row.resolved_at,
                    "resolved_by": row.resolved_by,
                    "assigned_to": row.assigned_to,
                    "assigned_to_id": row.assigned_to_id,
                    "recipient_email": row.recipient_email,
                    "assignment_status": row.assignment_status,
                    "impact_data": init_match.get("impact_data") or row.impact_data or [],
                    "affected_areas": init_match.get("affected_areas") or [],
                    "timeline": init_match.get("timeline") or [],
                    "related_info": {**(row.related_info or {}), **(init_match.get("related_info") or {})},
                    "telemetry_metrics": {**(row.telemetry_metrics or {}), **(init_match.get("telemetry_metrics") or {})},
                    "is_escalated": row.is_escalated,
                    "live_updates": updates_by_alert.get(row.id, init_match.get("live_updates", [])),
                    "comments": comments_by_alert.get(row.id, init_match.get("comments", []))
                }
                merged_list.append(alert_dict)
            if merged_list:
                ALERTS_DATA = merged_list
                print(f"[Alerts Engine] Loaded {len(merged_list)} alerts from database.")
        db.close()
        _ALERTS_INITIALIZED = True
    except Exception as e:
        print(f"[Alerts Engine] Notice syncing alerts from database: {e}")

@router.get("/alerts")
def get_alerts(
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("latest")
):
    """
    Returns live alert list with comprehensive filter and search capabilities.
    Does NOT recreate or mutate active records unnecessarily.
    """
    sync_alerts_from_db()
    results = [a for a in ALERTS_DATA if a.get("status") != "Expired"]

    # Filter by Severity
    if severity and severity.lower() not in ["all", "all severity"]:
        sev_clean = severity.strip().capitalize()
        results = [a for a in results if a.get("severity", "").capitalize() == sev_clean]

    # Filter by Alert Type
    if alert_type and alert_type.lower() not in ["all", "all types"]:
        t_clean = alert_type.strip().lower()
        results = [a for a in results if t_clean in a.get("alert_type", "").lower() or t_clean in a.get("title", "").lower()]

    # Filter by Location
    if location and location.lower() not in ["all", "all locations"]:
        loc_clean = location.strip().lower()
        results = [a for a in results if loc_clean in a.get("location", "").lower()]

    # Search query
    if search and search.strip():
        q = search.strip().lower()
        results = [
            a for a in results
            if q in a.get("title", "").lower()
            or q in a.get("location", "").lower()
            or q in a.get("description", "").lower()
            or q in a.get("severity", "").lower()
            or q in a.get("source", "").lower()
        ]

    # Sort
    if sort == "oldest":
        results.reverse()
    elif sort == "severity":
        order = {"Critical": 1, "High": 2, "Moderate": 3, "Low": 4}
        results.sort(key=lambda x: order.get(x.get("severity", "Low"), 5))
    else:
        # Default newest first (initial order is newest first)
        pass

    return results

@router.get("/alerts/summary")
def get_alerts_summary():
    """
    Returns live aggregate counts for the top summary cards:
    Critical, High, Moderate, Low, Total Active.
    """
    active = [a for a in ALERTS_DATA if a.get("status") in ["Active", "Acknowledged"]]
    critical_count = len([a for a in active if a.get("severity") == "Critical"])
    high_count = len([a for a in active if a.get("severity") == "High"])
    moderate_count = len([a for a in active if a.get("severity") == "Moderate"])
    low_count = len([a for a in active if a.get("severity") == "Low"])
    total_active = len(active)

    return {
        "critical": critical_count,
        "high": high_count,
        "moderate": moderate_count,
        "low": low_count,
        "total_active": total_active,
        "latest_critical_id": LATEST_CRITICAL_ALERT_ID,
        "latest_critical_timestamp": LATEST_CRITICAL_TIMESTAMP,
        "timestamp": datetime.now().strftime("%d %b %Y %H:%M:%S"),
        "is_live": True
    }

@router.get("/alerts/{alert_id}")
def get_alert_details(alert_id: str):
    """
    Returns full details for a single alert.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.get("/alerts/{alert_id}/updates")
def get_alert_live_updates(alert_id: str):
    """
    Returns the real-time activity log for a specific alert.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert.get("live_updates", [])

@router.get("/authorities")
def get_authorized_authorities():
    """
    Returns official government teams and emergency response authorities.
    """
    return AUTHORITIES_STORE

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, req: AcknowledgeRequest = Body(default=None)):
    """
    Authority acknowledges the alert.
    Persists acknowledgment timestamp, author, and appends live update.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    user_name = req.user if req and req.user else "Admin (Urban Authority)"
    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    now_time = datetime.now().strftime("%H:%M")

    alert["acknowledged"] = True
    alert["status"] = "Acknowledged"
    alert["acknowledged_at"] = now_str
    alert["acknowledged_by"] = user_name

    # Append to live activity log
    updates = alert.get("live_updates", [])
    updates.insert(0, {
        "time": now_time,
        "text": f"Alert acknowledged by {user_name}.",
        "dot": "blue"
    })
    alert["live_updates"] = updates

    # Persist to database
    if SessionLocal and AlertModel:
        try:
            db = SessionLocal()
            row = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
            if row:
                row.acknowledged = True
                row.status = "Acknowledged"
                row.acknowledged_at = now_str
                row.acknowledged_by = user_name
                if AlertUpdateModel:
                    db.add(AlertUpdateModel(
                        id=f"upd-{uuid.uuid4().hex[:6]}",
                        alert_id=alert_id,
                        timestamp=now_time,
                        text=f"Alert acknowledged by {user_name}.",
                        dot_color="blue"
                    ))
                db.commit()
            db.close()
        except Exception as e:
            print(f"[Alerts Engine] Notice persisting acknowledge to DB: {e}")

    return {
        "success": True,
        "message": "Alert acknowledged successfully.",
        "alert": alert
    }

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, req: ResolveRequest = Body(default=None)):
    """
    Authority marks alert as Resolved.
    Status transitions to 'Resolved' and updates active counts.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    user_name = req.user if req and req.user else "Admin (Urban Authority)"
    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    now_time = datetime.now().strftime("%H:%M")

    alert["resolved"] = True
    alert["status"] = "Resolved"
    alert["resolved_at"] = now_str
    alert["resolved_by"] = user_name

    updates = alert.get("live_updates", [])
    updates.insert(0, {
        "time": now_time,
        "text": f"Incident resolved and closed by {user_name}.",
        "dot": "green"
    })
    alert["live_updates"] = updates

    # Persist to database
    if SessionLocal and AlertModel:
        try:
            db = SessionLocal()
            row = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
            if row:
                row.resolved = True
                row.status = "Resolved"
                row.resolved_at = now_str
                row.resolved_by = user_name
                if AlertUpdateModel:
                    db.add(AlertUpdateModel(
                        id=f"upd-{uuid.uuid4().hex[:6]}",
                        alert_id=alert_id,
                        timestamp=now_time,
                        text=f"Incident resolved and closed by {user_name}.",
                        dot_color="green"
                    ))
                db.commit()
            db.close()
        except Exception as e:
            print(f"[Alerts Engine] Notice persisting resolve to DB: {e}")

    return {
        "success": True,
        "message": "Alert resolved successfully.",
        "alert": alert
    }

@router.post("/alerts/{alert_id}/assign")
def assign_alert(alert_id: str, payload: AssignRequest):
    """
    Assign alert to official authority/team.
    Validates authority, retrieves official email, simulates secure dispatch,
    and updates alert record.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    authority = next((auth for auth in AUTHORITIES_STORE if auth["id"] == payload.authority_id), None)
    if not authority:
        raise HTTPException(status_code=400, detail="Invalid authority ID. Official team not found.")

    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    now_time = datetime.now().strftime("%H:%M")

    # Update Alert Assignment Metadata
    alert["assigned_to"] = authority["name"]
    alert["assigned_to_id"] = authority["id"]
    alert["recipient_email"] = authority["email"]
    alert["assignment_status"] = "Sent"
    alert["assigned_at"] = now_str

    # Append to live activity log
    updates = alert.get("live_updates", [])
    updates.insert(0, {
        "time": now_time,
        "text": f"Assigned to {authority['name']}. Priority dispatch sent to {authority['email']}.",
        "dot": "blue"
    })
    alert["live_updates"] = updates

    # Persist to database
    if SessionLocal and AlertModel:
        try:
            db = SessionLocal()
            row = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
            if row:
                row.assigned_to = authority["name"]
                row.assigned_to_id = authority["id"]
                row.recipient_email = authority["email"]
                row.assignment_status = "Sent"
                row.assigned_at = now_str
                if AlertUpdateModel:
                    db.add(AlertUpdateModel(
                        id=f"upd-{uuid.uuid4().hex[:6]}",
                        alert_id=alert_id,
                        timestamp=now_time,
                        text=f"Assigned to {authority['name']}. Priority dispatch sent to {authority['email']}.",
                        dot_color="blue"
                    ))
                db.commit()
            db.close()
        except Exception as e:
            print(f"[Alerts Engine] Notice persisting assignment to DB: {e}")

    return {
        "success": True,
        "message": "Alert assigned successfully.",
        "assignment": {
            "assigned_to": authority["name"],
            "recipient_email": authority["email"],
            "assignment_status": "Sent",
            "assigned_at": now_str,
            "message": payload.message
        },
        "alert": alert
    }

@router.post("/alerts/{alert_id}/comment")
def add_alert_comment(alert_id: str, payload: CommentRequest):
    """
    Record authority operator comment/notes.
    """
    alert = next((a for a in ALERTS_DATA if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty.")

    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    now_time = datetime.now().strftime("%H:%M")
    comment_entry = {
        "id": f"cmt-{uuid.uuid4().hex[:6]}",
        "user": payload.user or "Admin (Urban Authority)",
        "comment": payload.comment.strip(),
        "timestamp": now_str
    }

    if "comments" not in alert:
        alert["comments"] = []
    alert["comments"].append(comment_entry)

    # Append to live activity log
    updates = alert.get("live_updates", [])
    updates.insert(0, {
        "time": now_time,
        "text": f"Authority note added: \"{payload.comment[:45]}...\"",
        "dot": "blue"
    })
    alert["live_updates"] = updates

    # Persist to database
    if SessionLocal and AlertCommentModel:
        try:
            db = SessionLocal()
            db.add(AlertCommentModel(
                id=comment_entry["id"],
                alert_id=alert_id,
                user=comment_entry["user"],
                comment=comment_entry["comment"],
                timestamp=comment_entry["timestamp"]
            ))
            db.commit()
            db.close()
        except Exception as e:
            print(f"[Alerts Engine] Notice persisting comment to DB: {e}")

    return {
        "success": True,
        "message": "Comment recorded successfully.",
        "comment": comment_entry
    }

@router.post("/alerts/simulate-escalation")
def simulate_escalation(payload: EscalateSimRequest = Body(default=None)):
    """
    Simulate real-time alert escalation (e.g., High -> Critical) or new Critical alert
    for verifying the automatic Critical Alert Popup functionality without page reload.
    """
    global LATEST_CRITICAL_ALERT_ID, LATEST_CRITICAL_TIMESTAMP

    target_id = payload.alert_id if payload and payload.alert_id else "alt-003"
    alert = next((a for a in ALERTS_DATA if a["id"] == target_id), None)

    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    now_time = datetime.now().strftime("%H:%M")

    if alert:
        prev_sev = alert["severity"]
        alert["severity"] = "Critical"
        alert["is_escalated"] = True
        alert["timestamp"] = now_str
        alert["time_str"] = now_time
        updates = alert.get("live_updates", [])
        updates.insert(0, {
            "time": now_time,
            "text": f"ESCALATION ALERT: Severity elevated from {prev_sev} to CRITICAL. Emergency response required.",
            "dot": "red"
        })
        alert["live_updates"] = updates
        LATEST_CRITICAL_ALERT_ID = alert["id"]
        LATEST_CRITICAL_TIMESTAMP = now_str

        # Persist escalation to database
        if SessionLocal and AlertModel:
            try:
                db = SessionLocal()
                row = db.query(AlertModel).filter(AlertModel.id == target_id).first()
                if row:
                    row.severity = "Critical"
                    row.is_escalated = True
                    if AlertUpdateModel:
                        db.add(AlertUpdateModel(
                            id=f"upd-{uuid.uuid4().hex[:6]}",
                            alert_id=target_id,
                            timestamp=now_time,
                            text=f"ESCALATION ALERT: Severity elevated to CRITICAL. Emergency response required.",
                            dot_color="red"
                        ))
                    db.commit()
                db.close()
            except Exception as e:
                print(f"[Alerts Engine] Notice persisting escalation to DB: {e}")

        return {
            "success": True,
            "message": f"Alert {target_id} escalated to Critical.",
            "alert": alert
        }
    else:
        # Create a new critical alert dynamically
        new_id = f"alt-dyn-{uuid.uuid4().hex[:4]}"
        new_alert = {
            "id": new_id,
            "alert_type": "traffic",
            "title": "Severe Traffic Congestion Escalation",
            "description": "Rapid escalation in vehicle density at major arterial bottleneck.",
            "severity": "Critical",
            "status": "Active",
            "location": "Hebbal Flyover Junction",
            "location_id": "loc-010",
            "time_str": now_time,
            "time_ago": "Just now",
            "timestamp": now_str,
            "source": "Automated LiDAR & Camera Network",
            "camera_feed_url": None,
            "camera_feed_label": "Hebbal Main Cam",
            "icon": "car",
            "acknowledged": False,
            "acknowledged_at": None,
            "acknowledged_by": None,
            "resolved": False,
            "resolved_at": None,
            "resolved_by": None,
            "assigned_to": None,
            "assigned_to_id": None,
            "recipient_email": None,
            "assignment_status": None,
            "assigned_at": None,
            "is_escalated": True,
            "impact_data": [
                {"category": "Mobility", "level": "High", "pct": 88, "color": "#EF4444"},
                {"category": "Traffic Flow", "level": "High", "pct": 85, "color": "#EF4444"}
            ],
            "related_info": {
                "approx_delay": "25 – 45 minutes",
                "affected_stretch": "Hebbal Northbound",
                "possible_cause": "Abrupt Merge Spoke Congestion",
                "agencies_notified": "Traffic Police"
            },
            "telemetry_metrics": {"speed": "11 km/h"},
            "live_updates": [
                {"time": now_time, "text": "Rapid incident escalation detected.", "dot": "red"}
            ],
            "comments": []
        }
        ALERTS_DATA.insert(0, new_alert)
        LATEST_CRITICAL_ALERT_ID = new_id
        LATEST_CRITICAL_TIMESTAMP = now_str

        # Persist new critical alert to database
        if SessionLocal and AlertModel:
            try:
                db = SessionLocal()
                alert_db = AlertModel(
                    id=new_id,
                    alert_type="traffic",
                    title="Severe Traffic Congestion Escalation",
                    description="Rapid escalation in vehicle density at major arterial bottleneck.",
                    severity="Critical",
                    status="Active",
                    location="Hebbal Flyover Junction",
                    location_id="loc-010",
                    latitude=13.0358,
                    longitude=77.5970,
                    source="Automated LiDAR & Camera Network",
                    time_str=now_time,
                    detected_at=now_str,
                    updated_at=now_str,
                    is_escalated=True,
                    impact_data=new_alert["impact_data"],
                    related_info=new_alert["related_info"],
                    telemetry_metrics=new_alert["telemetry_metrics"]
                )
                db.add(alert_db)
                if AlertUpdateModel:
                    db.add(AlertUpdateModel(
                        id=f"upd-{uuid.uuid4().hex[:6]}",
                        alert_id=new_id,
                        timestamp=now_time,
                        text="Rapid incident escalation detected.",
                        dot_color="red"
                    ))
                db.commit()
                db.close()
            except Exception as e:
                print(f"[Alerts Engine] Notice persisting new critical alert to DB: {e}")

        return {
            "success": True,
            "message": "New Critical alert generated.",
            "alert": new_alert
        }
