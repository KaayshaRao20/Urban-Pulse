"""
UrbanPulse Functional Terms & Conditions, Privacy Policy & Account Enforcement Engine
Provides persistent consent tracking, version publication, strict backend validation,
and proportionate account enforcement (warnings, suspensions, appeals).
"""

import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Query, Header
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

def verify_citizen_consent_and_enforcement(db: Session, user_identifier: str) -> UserModel:
    """
    Strict backend verification guard for protected actions (reporting, voting, verifying).
    Raises HTTP 403 if user is suspended, terminated, or has not accepted the active terms version.
    """
    user = find_user_by_identifier(db, user_identifier)
    if not user:
        raise HTTPException(
            status_code=403,
            detail="Terms & Conditions acceptance required. Please review and accept UrbanPulse Terms & Conditions to proceed."
        )

    # 1. Enforcement Check
    if user.enforcement_status in ["suspended", "temporary_suspension", "permanent_suspension", "terminated"]:
        reason = user.enforcement_reason or "Violation of Terms & Conditions and Community Guidelines."
        raise HTTPException(
            status_code=403,
            detail=f"Account is suspended: {reason}. You cannot submit reports, vote, or access protected features. Contact support to appeal."
        )

    # 2. Terms & Conditions Version Check
    active_terms = get_active_terms_version(db)
    if not user.terms_accepted or user.terms_version != active_terms["version"] or user.consent_status != "accepted":
        raise HTTPException(
            status_code=403,
            detail=f"Terms & Conditions acceptance required. The current terms version is {active_terms['version']}. Please review and accept to proceed."
        )

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

        if not user:
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
# 7. GET /api/consent/terms-content - Full Terms Structure & Legal Text
# -----------------------------------------------------------------------------
@router.get("/terms-content")
def get_terms_content():
    """Returns the complete structured Terms & Conditions matching the screenshot."""
    db = SessionLocal()
    try:
        active_terms = get_active_terms_version(db)
        return {
            "title": "Terms & Conditions",
            "subtitle": "Please read and accept the terms below to continue using UrbanPulse.",
            "version": active_terms["version"],
            "privacy_version": active_terms["privacy_version"],
            "last_updated": active_terms["last_updated"],
            "sections": TERMS_SECTIONS,
            "acknowledgement_text": "I have read, understood, and agree to the Terms & Conditions and Privacy Policy, and I understand that any violation may lead to permanent blockage of my account and may be reported to the necessary authorities.",
            "notice": "Acceptance is required to access and use UrbanPulse services. This acceptance will be recorded with the version and timestamp."
        }
    finally:
        db.close()
