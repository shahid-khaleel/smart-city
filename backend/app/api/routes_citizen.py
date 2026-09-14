from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

# Updated imports to match our established project structure
from .deps import get_db, get_current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.schemas.complaint_schema import ComplaintResponse
from app.services.upload import save_upload_file

# AI Module Imports
from ai_module.image_validator import is_image_valid
from ai_module.classifier import classify_issue
from ai_module.priority_engine import determine_priority
from ai_module.duplicate_detector import is_duplicate

# Set up the router with the prefix to keep endpoints clean (e.g., /citizen/complaints)
router = APIRouter(prefix="/citizen", tags=["Citizen Operations"])

@router.get("/complaints", response_model=List[ComplaintResponse])
def get_my_complaints(
    skip: int = 0, 
    limit: int = 10, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch the complaint history for the currently logged-in citizen.
    """
    if current_user.role != "Citizen":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    complaints = db.query(Complaint)\
        .filter(Complaint.user_id == current_user.id)\
        .offset(skip)\
        .limit(limit)\
        .all()
        
    return complaints


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def track_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Track the real-time status and details of a specific complaint.
    """
    if current_user.role != "Citizen":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Ensure a citizen can only track their own complaints
    if complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")
        
    return complaint


@router.post("/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def report_issue(
    description: str = Form(...),
    location_lat: float = Form(...),
    location_lng: float = Form(...),
    address: str = Form(...),
    category: Optional[str] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Report a new civic issue with automated AI validation, zero-shot classification, 
    priority triage, and duplicate detection.
    """
    # Role-Based Access Control (RBAC)
    if current_user.role != "Citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only Citizens can submit complaints."
        )

    # 1. AI Image Validation (Bouncer)
    valid_image = await is_image_valid(image, blur_threshold=80.0)
    
    # FIXED: Rewind the file cursor after the AI reads it, so it can be saved properly later!
    await image.seek(0) 
    
    if not valid_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image is too blurry or invalid. Please upload a clear photo of the issue."
        )

    # 2. AI Zero-Shot Classification (Categorizer)
    resolved_category = category if category else classify_issue(description)

    # 3. AI Priority Engine (Triage)
    assigned_priority = determine_priority(description)

    # 4. AI Duplicate Detection (Filter)
    recent_complaints = db.query(Complaint.description).order_by(Complaint.id.desc()).limit(20).all()
    existing_texts = [c[0] for c in recent_complaints]
    
    final_description = description
    if is_duplicate(description, existing_texts, similarity_threshold=0.85):
        final_description = f"[POTENTIAL DUPLICATE] {description}"

    # 5. Upload image via our local storage service
    image_path = None
    if image:
        image_path = save_upload_file(image, subfolder="complaints")

    # 6. Database insertion using SQLAlchemy directly with enriched AI properties
    new_complaint = Complaint(
        title=resolved_category, # Using category as a fallback title
        category=resolved_category,
        description=final_description,
        address=address,
        location_lat=location_lat,
        location_lng=location_lng,
        image_url=image_path,
        user_id=current_user.id,
        status="Submitted",
        severity=assigned_priority # FIXED: Changed from 'priority' to 'severity' to match DB/Schema!
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    return new_complaint