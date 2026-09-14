import math
from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy.orm import Session
from typing import List

from app.db.database import SessionLocal
from app.models.complaint import Complaint
from app.models.user import User
from app.models.jurisdiction import Department, Municipality 
from app.api.auth import get_current_user
from app.schemas.complaint_schema import ComplaintCreate, ComplaintResponse
from app.services.ai_service import analyze_complaint_severity
from ai_module.classifier import classify_issue
from pydantic import BaseModel
from typing import Optional

class AIPredictRequest(BaseModel):
    description: str
    image_url: Optional[str] = None

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- HAVERSINE SPATIAL ENGINE ---
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_complaint(
    complaint: ComplaintCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    print(f"--- NEW REPORT RECEIVED: Frontend sent '{complaint.category}' ---")
    
    # --- BUG FIX 1: SMART DEPARTMENT ROUTING TRANSLATOR ---
    # We extract a short, safe keyword to search the database with, 
    # so we don't fail if the frontend sends a long string like "Other / Unclassified"
    search_keyword = complaint.category.split(" ")[0] # Grabs the first word (e.g., "Roads", "Water")
    
    if "Other" in complaint.category or "Unclassified" in complaint.category:
        search_keyword = "General"
    elif "Vandalism" in complaint.category or "Safety" in complaint.category:
        search_keyword = "Safety" # Or "Vandalism" depending on your DB
        
    # Try to find a partial match in the Database using the short keyword
    matched_dept = db.query(Department).filter(
        Department.name.ilike(f"%{search_keyword}%")
    ).first()

    # THE SAFETY NET: If it STILL fails to find a department, we assign it to Roads ID,
    # BUT we do NOT overwrite the 'complaint.category' string anymore!
    if not matched_dept:
        print(f"⚠️ Exact DB department for '{search_keyword}' not found. Routing to default department.")
        matched_dept = db.query(Department).filter(Department.name.ilike("%Roads%")).first()
        # WE REMOVED THE LINE THAT WAS OVERWRITING YOUR CATEGORY HERE!

    dept_id = matched_dept.id if matched_dept else None

    # Default to Bengaluru South Zone 
    default_zone = db.query(Municipality).filter(Municipality.name == "Bengaluru South Zone").first()
    mun_id = default_zone.id if default_zone else None

    # --- BUG FIX 2: CLUSTER BY DEPARTMENT ID, NOT FRAGILE TEXT ---
    master_id = None
    if complaint.location_lat and complaint.location_lng:
        
        # Now we only check if they belong to the same department!
        active_masters = db.query(Complaint).filter(
            Complaint.department_id == dept_id,
            Complaint.parent_id == None,
            Complaint.status.in_(["Pending", "Submitted", "Assigned", "Open"])
        ).all()

        for master in active_masters:
            if master.location_lat and master.location_lng:
                distance = calculate_distance(
                    complaint.location_lat, complaint.location_lng,
                    master.location_lat, master.location_lng
                )
                
                if distance <= 50: 
                    print(f"⚠️ CLUSTER MATCH! Found identical incident #{master.id} just {int(distance)}m away.")
                    master.report_count += 1
                    master_id = master.id
                    db.commit() 
                    break 

    description_text = complaint.description 
    ai_calculated_severity = analyze_complaint_severity(description_text)

    new_complaint = Complaint(
        title=complaint.title,
        description=description_text,
        category=complaint.category, # This will now safely remain exactly what the frontend sent!
        address=getattr(complaint, 'address', getattr(complaint, 'location', "Location pending GPS")),
        location_lat=getattr(complaint, 'location_lat', None), 
        location_lng=getattr(complaint, 'location_lng', None),
        severity=ai_calculated_severity,  
        status="Open",
        user_id=current_user.id, 
        image_url=complaint.image_url,
        parent_id=master_id,
        department_id=dept_id,      
        municipality_id=mun_id      
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    return new_complaint

@router.get("/", response_model=List[ComplaintResponse])
def read_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() == "citizen":
        complaints = db.query(Complaint).filter(Complaint.user_id == current_user.id).all()
        
        # --- DATABASE AUTO-HEALER FOR STALE DATA ---
        # This catches any tickets that got stuck before we added the cascade fix!
        has_changes = False
        for c in complaints:
            if c.parent_id is not None:
                # Find the master ticket this child belongs to
                master = db.query(Complaint).filter(Complaint.id == c.parent_id).first()
                # If the master moved on without the child, sync them up!
                if master and c.status != master.status:
                    print(f"🔧 Auto-Healing Citizen Ticket #{c.id} to match Master status: {master.status}")
                    c.status = master.status
                    has_changes = True
        
        # Commit the fixes to the database permanently
        if has_changes:
            db.commit()
            
    elif current_user.role.lower() in ["official", "worker"]:
        complaints = db.query(Complaint).filter(
            Complaint.parent_id == None,
            Complaint.municipality_id == current_user.municipality_id,
            Complaint.department_id == current_user.department_id
        ).all()
    else:
        complaints = db.query(Complaint).filter(Complaint.parent_id == None).all()
        
    return complaints

@router.post("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int, 
    status: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the specific master complaint
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # 1. Update the status of the Master Ticket
    complaint.status = status
    
    # 2. BUG FIX: Cascade the status update to ALL duplicate Child Tickets!
    child_complaints = db.query(Complaint).filter(Complaint.parent_id == complaint_id).all()
    for child in child_complaints:
        child.status = status
        
    db.commit()
    db.refresh(complaint)
    
    return {
        "message": f"Task {complaint_id} and {len(child_complaints)} duplicate(s) marked as {status}", 
        "status": status
    }

@router.post("/predict-category")
def predict_ticket_category(request: AIPredictRequest):
    """
    Real AI categorization: runs the description through the local zero-shot
    classifier (ai_module/classifier.py) instead of a hardcoded keyword list.
    Note: this only ever looks at the text - there's no image/vision model
    wired up anywhere in this codebase, so a photo never affects the result
    even though it's accepted in the request payload.
    """
    predicted_category = classify_issue(request.description)
    return {"predicted_category": predicted_category}