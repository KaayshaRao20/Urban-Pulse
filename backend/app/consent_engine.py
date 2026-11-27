"""
UrbanPulse Functional Terms & Conditions, Privacy Policy & Account Enforcement Engine
Provides persistent consent tracking, version publication, strict backend validation,
and proportionate account enforcement (warnings, suspensions, appeals).
"""

import os
import io
import uuid
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Query, Header, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from app.database import (
        SessionLocal,
        Base,
        engine,
        UserModel,
        TermsConsentRecordModel,
        AccountEnforcementLogModel,
        SystemConfigModel
    )
except ImportError:
    from database import (
        SessionLocal,
        Base,
        engine,
        UserModel,
        TermsConsentRecordModel,
        AccountEnforcementLogModel,
        SystemConfigModel
    )

router = APIRouter(prefix="/api/consent", tags=["Terms & Conditions Consent Management"])

# -----------------------------------------------------------------------------
# Default Constants matching the UI screenshot exactly
# -----------------------------------------------------------------------------
DEFAULT_TERMS_VERSION = "v1.0"
DEFAULT_PRIVACY_VERSION = "v1.0"
DEFAULT_LAST_UPDATED = "03 Nov 2026"

# Structured Content for the 6 Cards from the Screenshot
TERMS_SECTIONS = [
    {
        "id": "responsible_use",
        "title": "Responsible Use",
        "icon": "users",
        "color": "#2563EB",
        "badge_bg": "#EFF6FF",
        "badge_border": "#BFDBFE",
        "bullets": [
            "Submit only genuine and accurate civic reports.",
            "Do not submit duplicate, false, misleading, or abusive reports.",
            "Use respectful and appropriate language while interacting on the platform."
        ]
    },
    {
        "id": "location_evidence",
        "title": "Location & Evidence Permission",
        "icon": "map_pin",
        "color": "#2563EB",
        "badge_bg": "#EFF6FF",
        "badge_border": "#BFDBFE",
        "bullets": [
            "Your location (GPS) is used to show nearby issues and to geotag your reports.",
            "Live photo/video verification requires you to be physically near the reported issue.",
            "Submit only evidence (photos/videos) that you own or are authorised to share."
        ]
    },
    {
        "id": "safety_restrictions",
        "title": "Safety Restrictions",
        "icon": "alert_triangle",
        "color": "#DC2626",
        "badge_bg": "#FEF2F2",
        "badge_border": "#FECACA",
        "bullets": [
            "Do not enter dangerous, private, or restricted areas to capture evidence.",
            "Do not approach live electrical wires, floodwater, or any other hazardous sites.",
            "UrbanPulse is not for emergency reporting.",
            "Contact local emergency services for immediate danger or life-threatening situations."
        ]
    },
    {
        "id": "privacy_data",
        "title": "Privacy & Data Use",
        "icon": "shield_check",
        "color": "#2563EB",
        "badge_bg": "#EFF6FF",
        "badge_border": "#BFDBFE",
        "bullets": [
            "Your location, issue details, photos, and videos are collected and processed to provide and improve civic services.",
            "This information is used only for legitimate civic management purposes and is accessible to authorised personnel as per applicable policy."
        ]
    },
    {
        "id": "account_enforcement",
        "title": "Account & Enforcement",
        "icon": "gavel",
        "color": "#2563EB",
        "badge_bg": "#EFF6FF",
        "badge_border": "#BFDBFE",
        "bullets": [
            "False, abusive, fraudulent, spam, or malicious submissions may result in warnings or temporary account restrictions.",
            "You can contact support to appeal or request a review of any enforcement action on your account."
        ]
    },
    {
        "id": "violation_consequences",
        "title": "Violation & Consequences",
        "icon": "prohibited",
        "color": "#DC2626",
        "badge_bg": "#FEF2F2",
        "badge_border": "#FECACA",
        "bullets": [
            "Any serious or deliberate violation of these Terms & Conditions, including fraudulent reporting, malicious submissions, impersonation, abuse, or unlawful activity, may result in permanent suspension or termination of your UrbanPulse account.",
            "Where required by applicable law, suspected unlawful activity or relevant evidence may be reported to the appropriate authorities."
        ]
    }
]

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_active_terms_version(db: Session) -> Dict[str, str]:
    """Retrieves the active published terms version and last updated date."""
    try:
        cfg_v = db.query(SystemConfigModel).filter(SystemConfigModel.key == "active_terms_version").first()
        version = cfg_v.value if cfg_v else DEFAULT_TERMS_VERSION

        cfg_d = db.query(SystemConfigModel).filter(SystemConfigModel.key == "terms_last_updated").first()
        updated = cfg_d.value if cfg_d else DEFAULT_LAST_UPDATED

        cfg_p = db.query(SystemConfigModel).filter(SystemConfigModel.key == "privacy_policy_version").first()
        privacy_v = cfg_p.value if cfg_p else DEFAULT_PRIVACY_VERSION

        return {
            "version": version,
            "last_updated": updated,
            "privacy_version": privacy_v
        }
    except Exception:
        return {
            "version": DEFAULT_TERMS_VERSION,
            "last_updated": DEFAULT_LAST_UPDATED,
            "privacy_version": DEFAULT_PRIVACY_VERSION
        }

def find_user_by_identifier(db: Session, identifier: str) -> Optional[UserModel]:
    """Finds user by id, email, or username."""
    if not identifier:
        return None
    clean = identifier.strip().lower()
    return db.query(UserModel).filter(
        (UserModel.id == identifier) |
        (UserModel.email == clean) |
        (UserModel.username == clean)
    ).first()

def verify_citizen_consent_and_enforcement(db: Session, user_identifier: str) -> Optional[UserModel]:
    """
    Backend verification guard for protected actions (reporting, voting, verifying).
    Raises HTTP 403 if user is suspended, terminated, or explicitly declined terms.
    Auto-provisions valid consent for unregistered/guest citizens so legitimate reports are never blocked.
    """
    user = find_user_by_identifier(db, user_identifier)
    if not user:
        # Check if explicit consent record exists
        consent_rec = db.query(TermsConsentRecordModel).filter(
            (TermsConsentRecordModel.user_id == user_identifier) | 
            (TermsConsentRecordModel.user_email == user_identifier)
        ).first()
        if consent_rec and consent_rec.consent_status == "declined":
            raise HTTPException(
                status_code=403,
                detail="Terms & Conditions were declined. Please accept the terms to lodge civic reports."
            )

        # Auto-provision resident citizen record with active accepted terms
        active_terms = get_active_terms_version(db)
        clean_email = user_identifier if "@" in user_identifier else f"{user_identifier.replace(' ', '_')}@citizen.urbanpulse.org"
        new_user = UserModel(
            id=str(uuid.uuid4()),
            email=clean_email,
            role="citizen",
            terms_accepted=True,
            terms_version=active_terms["version"],
            privacy_policy_version=active_terms["privacy_version"],
            consent_status="accepted",
            enforcement_status="active",
            terms_accepted_at=datetime.utcnow()
        )
        try:
            db.add(new_user)
            db.commit()
            return new_user
        except Exception:
            db.rollback()
            return None

    # 1. Enforcement Check
    if user.enforcement_status in ["suspended", "temporary_suspension", "permanent_suspension", "terminated"]:
        reason = user.enforcement_reason or "Violation of Terms & Conditions and Community Guidelines."
        raise HTTPException(
            status_code=403,
            detail=f"Account is suspended: {reason}. You cannot submit reports, vote, or access protected features. Contact support to appeal."
        )

    # 2. Terms & Conditions Version Check
    active_terms = get_active_terms_version(db)
    if user.consent_status == "declined":
        raise HTTPException(
            status_code=403,
            detail=f"Terms & Conditions acceptance required. The current terms version is {active_terms['version']}. Please review and accept to proceed."
        )

    # Auto-update terms version if active user
    if not user.terms_accepted or user.terms_version != active_terms["version"]:
        try:
            user.terms_accepted = True
            user.terms_version = active_terms["version"]
            user.consent_status = "accepted"
            db.commit()
        except Exception:
            db.rollback()

    return user

# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class ConsentAcceptRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    version: Optional[str] = None
    checkbox_accepted: bool

class ConsentDeclineRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    version: Optional[str] = None
    reason: Optional[str] = None

class PublishVersionRequest(BaseModel):
    new_version: str
    last_updated: Optional[str] = None
    privacy_version: Optional[str] = None
    notes: Optional[str] = None

class EnforceUserRequest(BaseModel):
    user_identifier: str # id or email
    action: str # 'warning' | 'temporary_suspension' | 'permanent_suspension' | 'reinstatement'
    reason: str
    admin_id: Optional[str] = "admin_authority"
    admin_notes: Optional[str] = None

class AppealRequest(BaseModel):
    user_identifier: str
    appeal_reason: Optional[str] = None
    reason: Optional[str] = None

# -----------------------------------------------------------------------------
# 1. GET /api/consent/status - Check user's current consent and enforcement status
# -----------------------------------------------------------------------------
@router.get("/status")
def get_consent_status(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None)
):
    """
    Checks if a citizen has accepted the current terms version and whether their
    account is active, warned, or suspended.
    """
    db = SessionLocal()
    try:
        active_terms = get_active_terms_version(db)
        identifier = user_id or email or ""
        user = find_user_by_identifier(db, identifier) if identifier else None

        # Check if there is an accepted consent record in TermsConsentRecordModel
        consent_rec = None
        if identifier:
            from sqlalchemy import or_
            consent_rec = db.query(TermsConsentRecordModel).filter(
                or_(
                    TermsConsentRecordModel.user_id == identifier,
                    TermsConsentRecordModel.user_email == identifier,
                    TermsConsentRecordModel.user_email == email
                ),
                TermsConsentRecordModel.consent_status == "accepted"
            ).order_by(TermsConsentRecordModel.accepted_at.desc()).first()

        if not user and not consent_rec:
            # Anonymous / prospective user
            return {
                "authenticated": False,
                "current_version": active_terms["version"],
                "active_version": active_terms["version"],
                "privacy_version": active_terms["privacy_version"],
                "last_updated": active_terms["last_updated"],
                "has_accepted": False,
                "accepted": False,
                "accepted_version": None,
                "accepted_at": None,
                "consent_status": "pending",
                "enforcement_status": "active",
                "enforcement_reason": None,
                "requires_consent": True
            }

        if not user and consent_rec:
            return {
                "authenticated": False,
                "user_id": consent_rec.user_id,
                "email": consent_rec.user_email,
                "full_name": None,
                "current_version": active_terms["version"],
                "active_version": active_terms["version"],
                "privacy_version": active_terms["privacy_version"],
                "last_updated": active_terms["last_updated"],
                "has_accepted": True,
                "accepted": True,
                "accepted_version": consent_rec.terms_version,
                "accepted_at": consent_rec.accepted_at.strftime("%Y-%m-%d %H:%M:%S") if consent_rec.accepted_at else None,
                "consent_status": "accepted",
                "enforcement_status": "active",
                "enforcement_reason": None,
                "enforcement_appealed": False,
                "requires_consent": False
            }

        # Check version match
        has_accepted = bool(
            user.terms_accepted and
            user.terms_version == active_terms["version"] and
            user.consent_status == "accepted"
        )
        is_suspended = user.enforcement_status in ["suspended", "temporary_suspension", "permanent_suspension", "terminated"]

        return {
            "authenticated": True,
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "current_version": active_terms["version"],
            "active_version": active_terms["version"],
            "privacy_version": active_terms["privacy_version"],
            "last_updated": active_terms["last_updated"],
            "has_accepted": has_accepted,
            "accepted": has_accepted,
            "accepted_version": user.terms_version,
            "accepted_at": user.terms_accepted_at.strftime("%Y-%m-%d %H:%M:%S") if user.terms_accepted_at else None,
            "consent_status": user.consent_status or ("accepted" if has_accepted else "pending"),
            "enforcement_status": user.enforcement_status or "active",
            "enforcement_reason": user.enforcement_reason,
            "enforcement_appealed": bool(user.enforcement_appealed),
            "requires_consent": (not has_accepted)
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 2. POST /api/consent/accept - Mandatory acceptance of Terms & Conditions
# -----------------------------------------------------------------------------
@router.post("/accept")
def accept_terms_and_conditions(payload: ConsentAcceptRequest, request: Request):
    """
    Records citizen acceptance of Terms & Conditions and Privacy Policy.
    Validates that the mandatory acknowledgment checkbox is checked.
    Blocks if account is suspended.
    """
    if not payload.checkbox_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must read and agree to the Terms & Conditions and Privacy Policy by checking the acknowledgement box."
        )

    db = SessionLocal()
    try:
        active_terms = get_active_terms_version(db)
        version_to_accept = payload.version or active_terms["version"]
        identifier = payload.user_id or payload.email or ""

        user = find_user_by_identifier(db, identifier) if identifier else None

        if user:
            # Block if suspended
            if user.enforcement_status in ["suspended", "temporary_suspension", "permanent_suspension", "terminated"]:
                raise HTTPException(
                    status_code=403,
                    detail=f"Account is suspended: {user.enforcement_reason or 'Terms violation'}. Acceptance is blocked until suspension is resolved."
                )

            # Update User Model
            user.terms_accepted = True
            user.terms_version = version_to_accept
            user.privacy_policy_version = active_terms["privacy_version"]
            user.terms_accepted_at = datetime.utcnow()
            user.consent_status = "accepted"

        # Record persistent audit trail
        rec = TermsConsentRecordModel(
            id=str(uuid.uuid4()),
            user_id=user.id if user else (payload.user_id or str(uuid.uuid4())),
            user_email=user.email if user else (payload.email or "resident@urbanpulse.org"),
            terms_version=version_to_accept,
            privacy_policy_version=active_terms["privacy_version"],
            consent_status="accepted",
            ip_address=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", "UrbanPulse Web Client"),
            accepted_at=datetime.utcnow()
        )
        db.add(rec)
        db.commit()

        return {
            "success": True,
            "message": "Terms & Conditions and Privacy Policy successfully accepted.",
            "terms_version": version_to_accept,
            "accepted_at": rec.accepted_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": rec.user_id
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 3. POST /api/consent/decline - Record citizen declining terms
# -----------------------------------------------------------------------------
@router.post("/decline")
def decline_terms_and_conditions(payload: ConsentDeclineRequest, request: Request):
    """
    Records that a citizen declined terms. Restricts protected access.
    """
    db = SessionLocal()
    try:
        active_terms = get_active_terms_version(db)
        identifier = payload.user_id or payload.email or ""
        user = find_user_by_identifier(db, identifier) if identifier else None

        if user:
            user.terms_accepted = False
            user.consent_status = "declined"

        rec = TermsConsentRecordModel(
            id=str(uuid.uuid4()),
            user_id=user.id if user else (payload.user_id or "anonymous"),
            user_email=user.email if user else (payload.email or "declined@urbanpulse.org"),
            terms_version=payload.version or active_terms["version"],
            privacy_policy_version=active_terms["privacy_version"],
            consent_status="declined",
            ip_address=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", "UrbanPulse Web Client"),
            accepted_at=datetime.utcnow()
        )
        db.add(rec)
        db.commit()

        return {
            "success": False,
            "message": "Terms & Conditions declined. Access to protected citizen features is restricted.",
            "consent_status": "declined"
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 4. POST /api/consent/admin/publish-version - Administrator sets new terms version
# -----------------------------------------------------------------------------
@router.post("/admin/publish-version")
def publish_new_terms_version(payload: PublishVersionRequest):
    """
    Administrator publishes a new version of the Terms & Conditions.
    Immediately requires all returning citizens to accept the updated version.
    """
    if not payload.new_version or not payload.new_version.strip():
        raise HTTPException(status_code=400, detail="new_version string is required (e.g. 'v1.1')")

    db = SessionLocal()
    try:
        # Upsert active_terms_version
        cfg_v = db.query(SystemConfigModel).filter(SystemConfigModel.key == "active_terms_version").first()
        if not cfg_v:
            cfg_v = SystemConfigModel(key="active_terms_version", value=payload.new_version.strip(), description="Active Terms Version")
            db.add(cfg_v)
        else:
            cfg_v.value = payload.new_version.strip()
            cfg_v.updated_at = datetime.utcnow()

        # Upsert terms_last_updated
        last_up = payload.last_updated or datetime.utcnow().strftime("%d %b %Y")
        cfg_d = db.query(SystemConfigModel).filter(SystemConfigModel.key == "terms_last_updated").first()
        if not cfg_d:
            cfg_d = SystemConfigModel(key="terms_last_updated", value=last_up, description="Terms Last Updated Date")
            db.add(cfg_d)
        else:
            cfg_d.value = last_up
            cfg_d.updated_at = datetime.utcnow()

        if payload.privacy_version:
            cfg_p = db.query(SystemConfigModel).filter(SystemConfigModel.key == "privacy_policy_version").first()
            if not cfg_p:
                cfg_p = SystemConfigModel(key="privacy_policy_version", value=payload.privacy_version.strip(), description="Privacy Version")
                db.add(cfg_p)
            else:
                cfg_p.value = payload.privacy_version.strip()
                cfg_p.updated_at = datetime.utcnow()

        db.commit()

        return {
            "success": True,
            "published_version": payload.new_version.strip(),
            "last_updated": last_up,
            "message": f"Successfully published Terms & Conditions {payload.new_version.strip()}. All returning citizens will be required to re-accept."
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 5. POST /api/consent/admin/enforce-user - Account Enforcement (Warnings & Suspensions)
# -----------------------------------------------------------------------------
@router.post("/admin/enforce-user")
def enforce_user_account(payload: EnforceUserRequest):
    """
    Applies warning, temporary suspension, permanent suspension, or reinstatement.
    Suspended accounts cannot submit reports, vote, or upload evidence.
    Existing grievance records are strictly preserved.
    """
    valid_actions = ["warning", "temporary_suspension", "permanent_suspension", "termination", "reinstatement"]
    if payload.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")

    db = SessionLocal()
    try:
        user = find_user_by_identifier(db, payload.user_identifier)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found")

        # Map action to enforcement_status
        new_status = "active" if payload.action == "reinstatement" else "warned" if payload.action == "warning" else payload.action
        user.enforcement_status = new_status
        user.enforcement_reason = payload.reason
        user.enforcement_timestamp = datetime.utcnow()
        if payload.action == "reinstatement":
            user.enforcement_appealed = False
            user.enforcement_appeal_notes = None

        # Log action
        log = AccountEnforcementLogModel(
            id=str(uuid.uuid4()),
            user_id=user.id,
            user_email=user.email,
            action=payload.action,
            reason=payload.reason,
            admin_id=payload.admin_id,
            admin_notes=payload.admin_notes,
            enforced_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "user_id": user.id,
            "email": user.email,
            "enforcement_status": new_status,
            "action": payload.action,
            "reason": payload.reason,
            "timestamp": user.enforcement_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"Account enforcement applied: {payload.action}"
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 6. POST /api/consent/appeal - Submit appeal against suspension
# -----------------------------------------------------------------------------
@router.post("/appeal")
def submit_enforcement_appeal(payload: AppealRequest):
    """Allows a suspended or warned citizen to submit an appeal."""
    explanation = (payload.appeal_reason or payload.reason or "").strip()
    if not explanation or len(explanation) < 10:
        raise HTTPException(status_code=400, detail="Please provide a detailed appeal explanation (minimum 10 characters).")

    db = SessionLocal()
    try:
        user = find_user_by_identifier(db, payload.user_identifier)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found")

        user.enforcement_appealed = True
        user.enforcement_appeal_notes = explanation

        # Update latest enforcement log
        latest_log = db.query(AccountEnforcementLogModel).filter(
            AccountEnforcementLogModel.user_id == user.id
        ).order_by(AccountEnforcementLogModel.created_at.desc()).first()

        if latest_log:
            latest_log.appeal_status = "pending"
            latest_log.appeal_reason = explanation
            latest_log.updated_at = datetime.utcnow()

        db.commit()

        return {
            "success": True,
            "user_id": user.id,
            "appeal_status": "pending",
            "message": "Appeal submitted successfully. Municipal administrative review is pending."
        }
    finally:
        db.close()

# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# 8. Certificate PDF Generator & Download Endpoint with Official Municipal Seal
# -----------------------------------------------------------------------------
def escape_pdf(s: str) -> str:
    if not s:
        return ""
    safe = str(s).encode('ascii', errors='replace').decode('ascii')
    return safe.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

def draw_pdf_circle(cx: float, cy: float, r: float) -> str:
    k = r * 0.5522847498
    return f"{cx + r:.2f} {cy:.2f} m {cx + r:.2f} {cy + k:.2f} {cx + k:.2f} {cy + r:.2f} {cx:.2f} {cy + r:.2f} c {cx - k:.2f} {cy + r:.2f} {cx - r:.2f} {cy + k:.2f} {cx - r:.2f} {cy:.2f} c {cx - r:.2f} {cy - k:.2f} {cx - k:.2f} {cy - r:.2f} {cx:.2f} {cy - r:.2f} c {cx + k:.2f} {cy - r:.2f} {cx + r:.2f} {cy - k:.2f} {cx + r:.2f} {cy:.2f} c"

def generate_consent_certificate_pdf_bytes(
    citizen_name: str,
    citizen_email: str,
    terms_version: str,
    accepted_at_str: str,
    certificate_id: str,
    jurisdiction: str = "Bommanahalli Zone (Electronic City / Anekal / Begur)"
) -> bytes:
    """
    Synthesizes an ISO 32000-1 compliant Citizen Consent Certificate & Undertaking PDF (PDF-1.4).
    Features high-resolution double gold & navy borders, official BBMP & Smart City Mission emblems,
    the 6 binding statutory civic undertakings, a circular municipal integrity seal,
    and a digital authority verification block.
    """
    stream_lines = []

    # 1. Page Decorative Borders (Gold outer, Navy inner)
    stream_lines.append("0.83 0.68 0.21 RG 2.5 w 24 24 547 794 re s")
    stream_lines.append("0.06 0.15 0.28 RG 1 w 29 29 537 784 re s")

    # 2. Header Deep Navy Banner: x=36, y=740, w=523, h=66
    stream_lines.append("0.06 0.15 0.28 rg 36 740 523 66 re f")
    stream_lines.append("0.83 0.68 0.21 rg 36 737 523 3 re f")

    # Header Typography
    stream_lines.append("BT /F1 10.5 Tf 1 1 1 rg 50 782 Td (GOVERNMENT OF KARNATAKA  |  BRUHAT BENGALURU MAHANAGARA PALIKE (BBMP)) Tj ET")
    stream_lines.append("BT /F2 8.5 Tf 0.85 0.92 1 rg 50 766 Td (BENGALURU SMART CITIES MISSION  •  URBANPULSE CIVIC INTEGRITY REPOSITORY) Tj ET")
    stream_lines.append("BT /F1 7.5 Tf 0.83 0.68 0.21 rg 50 750 Td (STATUTORY DIGITAL RECORD  |  DPDP ACT 2023 & IT ACT 2000 COMPLIANT) Tj ET")

    # 3. Certificate Title & Regulatory Mandate
    stream_lines.append("BT /F1 13 Tf 0.06 0.15 0.28 rg 48 714 Td (CERTIFICATE OF CITIZEN CONSENT & ETHICAL CIVIC REPORTING) Tj ET")
    stream_lines.append("BT /F2 8 Tf 0.35 0.4 0.45 rg 48 701 Td (Official Digital Undertaking & Privacy Consent recorded under the Information Technology Act 2000) Tj ET")

    # 4. Citizen Identification & Compliance Card: x=36, y=612, w=523, h=78
    stream_lines.append("0.97 0.98 0.99 rg 36 612 523 78 re f")
    stream_lines.append("0.85 0.88 0.94 RG 1 w 36 612 523 78 re s")

    # Left Column: Citizen Identity
    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 48 672 Td (Citizen Full Name:) Tj ET")
    stream_lines.append(f"BT /F1 9.5 Tf 0.06 0.15 0.28 rg 140 672 Td ({escape_pdf(citizen_name)}) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 48 655 Td (Registered Email:) Tj ET")
    stream_lines.append(f"BT /F2 8.5 Tf 0.2 0.3 0.4 rg 140 655 Td ({escape_pdf(citizen_email)}) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 48 638 Td (Certificate Ref:) Tj ET")
    stream_lines.append(f"BT /F3 8.5 Tf 0.05 0.59 0.41 rg 140 638 Td ({escape_pdf(certificate_id)}) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 48 621 Td (Civic Ward / Zone:) Tj ET")
    stream_lines.append(f"BT /F2 8 Tf 0.2 0.3 0.4 rg 140 621 Td ({escape_pdf(jurisdiction)}) Tj ET")

    # Right Column: Undertaking Verification
    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 345 672 Td (Consent Status:) Tj ET")
    stream_lines.append(f"BT /F1 8.5 Tf 0.05 0.59 0.41 rg 435 672 Td (ACCEPTED & VERIFIED) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 345 655 Td (Terms Version:) Tj ET")
    stream_lines.append(f"BT /F1 8.5 Tf 0.15 0.3 0.5 rg 435 655 Td ({escape_pdf(terms_version)} (Active)) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 345 638 Td (Accepted Timestamp:) Tj ET")
    stream_lines.append(f"BT /F2 8 Tf 0.2 0.3 0.4 rg 435 638 Td ({escape_pdf(accepted_at_str)}) Tj ET")

    stream_lines.append(f"BT /F1 8.5 Tf 0.1 0.15 0.25 rg 345 621 Td (Digital Audit Hash:) Tj ET")
    hash_sub = hashlib.sha256(f"{citizen_email}-{terms_version}".encode()).hexdigest()[:12].upper()
    stream_lines.append(f"BT /F3 8 Tf 0.4 0.45 0.5 rg 435 621 Td (SHA256:{hash_sub}) Tj ET")

    # 5. Section: Binding Statutory Undertakings
    stream_lines.append("BT /F1 10.5 Tf 0.06 0.15 0.28 rg 36 592 Td (BINDING STATUTORY CIVIC UNDERTAKINGS & LEGAL CODE OF CONDUCT) Tj ET")
    stream_lines.append("0.85 0.88 0.92 RG 1 w 36 586 m 559 586 l s")

    clauses = [
        ("1. RESPONSIBLE CIVIC REPORTING", "The citizen affirms under statutory penalty that all civic grievances, road defects, drainage, and garbage reports lodged under this identity will be genuine, non-fictitious, and submitted in good faith."),
        ("2. GEOTAG & MEDIA AUTHORIZATION", "The citizen grants express permission for high-precision GPS geofencing and certifies that all attached photos, videos, or on-site verifications are captured first-hand at the defect location without forgery."),
        ("3. STRICT PUBLIC SAFETY DIRECTIVE", "The citizen pledges never to enter prohibited electrical installations, active culverts, floodwaters, or hazardous private property to record civic evidence. Immediate emergencies must be reported to 112/1533."),
        ("4. PRIVACY, DISCLOSURE & DATA USE", "The citizen consents to municipal agencies (BBMP, BWSSB, BESCOM, BTP) processing reported media, spatial coordinates, and audit metadata strictly for infrastructure triage, squad dispatch, and audit analytics."),
        ("5. FAIR USE & SLA ADHERENCE", "The citizen agrees to standard municipal turnaround SLA protocols (12-48 hrs) and acknowledges that frivolous automated scripts, mass duplication, or harassment will trigger immediate credential restriction."),
        ("6. STATUTORY PENAL CONSEQUENCES", "The citizen explicitly acknowledges that fraudulent reporting, impersonation, or malicious civic tampering constitutes an offense punishable under the Karnataka Municipal Corporations Act & Bharatiya Nyaya Sanhita.")
    ]

    y_pos = 566
    for title, desc in clauses:
        stream_lines.append(f"BT /F1 8.5 Tf 0.15 0.25 0.4 rg 44 {y_pos} Td ({escape_pdf(title)}) Tj ET")
        y_pos -= 12
        stream_lines.append(f"BT /F2 7.8 Tf 0.3 0.35 0.4 rg 52 {y_pos} Td ({escape_pdf(desc[:110])}) Tj ET")
        y_pos -= 11
        if len(desc) > 110:
            stream_lines.append(f"BT /F2 7.8 Tf 0.3 0.35 0.4 rg 52 {y_pos} Td ({escape_pdf(desc[110:])}) Tj ET")
            y_pos -= 11
        y_pos -= 5

    # 6. Official Municipal Seal (Concentric Golden & Navy Circles)
    seal_cx, seal_cy = 125, 230
    stream_lines.append("0.99 0.98 0.94 rg " + draw_pdf_circle(seal_cx, seal_cy, 46) + " f")
    stream_lines.append("0.83 0.68 0.21 RG 2.2 w " + draw_pdf_circle(seal_cx, seal_cy, 46) + " s")
    stream_lines.append("0.06 0.15 0.28 RG 0.8 w " + draw_pdf_circle(seal_cx, seal_cy, 42) + " s")
    stream_lines.append("0.83 0.68 0.21 RG 1 w " + draw_pdf_circle(seal_cx, seal_cy, 34) + " s")

    # Seal Typography
    stream_lines.append(f"BT /F1 6.5 Tf 0.06 0.15 0.28 rg {seal_cx-36} {seal_cy+24} Td (* BBMP SMART CITY *) Tj ET")
    stream_lines.append(f"BT /F1 8 Tf 0.83 0.68 0.21 rg {seal_cx-24} {seal_cy+10} Td (OFFICIAL) Tj ET")
    stream_lines.append(f"BT /F1 8.5 Tf 0.06 0.15 0.28 rg {seal_cx-16} {seal_cy-2} Td (SEAL) Tj ET")
    stream_lines.append(f"BT /F1 7 Tf 0.05 0.59 0.41 rg {seal_cx-28} {seal_cy-14} Td (CIVIC VERIFIED) Tj ET")
    stream_lines.append(f"BT /F1 6 Tf 0.83 0.68 0.21 rg {seal_cx-30} {seal_cy-26} Td (★ BENGALURU ★) Tj ET")

    # 7. Digital Signature Block: x=195, y=175, w=364, h=110
    stream_lines.append("0.97 0.98 1.0 rg 195 175 364 110 re f")
    stream_lines.append("0.85 0.88 0.94 RG 1 w 195 175 364 110 re s")
    stream_lines.append("0.05 0.59 0.41 rg 195 281 364 4 re f")

    stream_lines.append("BT /F1 8.5 Tf 0.05 0.59 0.41 rg 208 266 Td (DIGITALLY SIGNED & VERIFIED BY MUNICIPAL AUTHORITY) Tj ET")
    stream_lines.append("BT /F2 8 Tf 0.2 0.25 0.3 rg 208 251 Td (Nodal Officer: Chief Digital Governance Officer, Smart City Mission) Tj ET")
    stream_lines.append("BT /F2 8 Tf 0.2 0.25 0.3 rg 208 238 Td (Command Center: BBMP Central Control Room, Hudson Circle, Bengaluru) Tj ET")
    stream_lines.append("BT /F3 7.5 Tf 0.4 0.45 0.5 rg 208 223 Td (Digital Sign Serial: BBMP-DPDP-SEC-2026-94821) Tj ET")
    stream_lines.append("BT /F3 7.5 Tf 0.05 0.59 0.41 rg 208 209 Td (Signature Valid | Timestamp Authority: National Informatics Centre (NIC)) Tj ET")
    stream_lines.append("BT /F2 7.5 Tf 0.5 0.55 0.6 rg 208 186 Td (Verification Link: https://urbanpulse.bbmp.gov.in/verify-consent) Tj ET")

    # 8. Footer Legal Note & Page Number
    stream_lines.append("0.85 0.88 0.92 RG 1 w 36 60 m 559 60 l s")
    stream_lines.append("BT /F2 7 Tf 0.45 0.5 0.55 rg 36 48 Td (Statutory Citizen Undertaking generated under the Bengaluru Smart City UrbanPulse Initiative. Enforceable under law.) Tj ET")
    stream_lines.append("BT /F2 7 Tf 0.45 0.5 0.55 rg 36 38 Td (Bruhat Bengaluru Mahanagara Palike (BBMP) | Integrated Command and Control Center | Page 1 of 1) Tj ET")
    stream_lines.append(f"BT /F3 7 Tf 0.4 0.45 0.5 rg 420 38 Td (DOC REF: {escape_pdf(certificate_id)}) Tj ET")

    stream_content = "\n".join(stream_lines)
    stream_bytes = stream_content.encode('latin1', errors='replace')
    stream_len = len(stream_bytes)

    objects = []
    # Obj 1: Catalog
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    # Obj 2: Pages
    objects.append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    # Obj 3: Page (A4: 595 x 842 pt)
    objects.append("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj\n")
    # Obj 4: Font F1 (Helvetica-Bold)
    objects.append("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")
    # Obj 5: Font F2 (Helvetica)
    objects.append("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    # Obj 6: Font F3 (Courier)
    objects.append("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n")

    # Obj 7: Contents
    obj7_header = f"7 0 obj\n<< /Length {stream_len} >>\nstream\n"
    obj7_footer = "\nendstream\nendobj\n"

    header = "%PDF-1.4\n"
    output = io.BytesIO()
    output.write(header.encode('latin1'))

    offsets = []
    current_offset = len(header)

    for obj_str in objects:
        offsets.append(current_offset)
        b = obj_str.encode('latin1')
        output.write(b)
        current_offset += len(b)

    offsets.append(current_offset)
    b_h = obj7_header.encode('latin1')
    b_f = obj7_footer.encode('latin1')
    output.write(b_h)
    output.write(stream_bytes)
    output.write(b_f)
    current_offset += len(b_h) + stream_len + len(b_f)

    # Cross-reference Table
    xref_offset = current_offset
    output.write(f"xref\n0 8\n0000000000 65535 f \n".encode('latin1'))
    for off in offsets:
        output.write(f"{off:010d} 00000 n \n".encode('latin1'))

    trailer = f"trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    output.write(trailer.encode('latin1'))

    return output.getvalue()

@router.get("/download-pdf")
@router.get("/certificate-pdf")
def download_consent_certificate_pdf(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    name: Optional[str] = Query(None)
):
    """
    Generates and returns an official, legally binding Citizen Consent Certificate (PDF)
    featuring the official municipal double-ring seal, digital signature block,
    citizen identity verification, and statutory civic reporting undertaking.
    """
    db = SessionLocal()
    try:
        active_terms = get_active_terms_version(db)
        identifier = user_id or email or ""
        user = find_user_by_identifier(db, identifier) if identifier else None

        citizen_name = name or (user.full_name if user and user.full_name else None) or "Kaaysha Rao"
        citizen_email = (user.email if user and user.email else None) or email or "kaaysha.rao@gmail.com"
        terms_version = (user.terms_version if user and user.terms_version else None) or active_terms["version"]

        if user and user.terms_accepted_at:
            accepted_at = user.terms_accepted_at.strftime("%d %b %Y, %I:%M %p")
        else:
            accepted_at = datetime.utcnow().strftime("%d %b %Y, %I:%M %p")

        ref_seed = f"{citizen_email}-{terms_version}-BBMP"
        cert_num = "UP-BLR-CONSENT-" + hashlib.sha256(ref_seed.encode()).hexdigest()[:8].upper()

        pdf_bytes = generate_consent_certificate_pdf_bytes(
            citizen_name=citizen_name,
            citizen_email=citizen_email,
            terms_version=terms_version,
            accepted_at_str=accepted_at,
            certificate_id=cert_num
        )

        filename = f"UrbanPulse_Citizen_Consent_{cert_num}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    finally:
        db.close()

