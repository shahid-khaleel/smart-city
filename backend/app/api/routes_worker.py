from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

# Dependencies and Models
from .deps import get_db, get_current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.models.assignment import Assignment
from app.models.resolution import Resolution
from app.schemas.complaint_schema import ComplaintResponse
from app.services.notification_service import notify_complaint_status_change

router = APIRouter(prefix="/worker", tags=["Field Worker Operations"])


class ResolutionSubmit(BaseModel):
    notes: str
    # Uploaded client-side (same Cloudinary flow ComplaintForm already uses for
    # citizen report photos), so we just receive the resulting URL here.
    proof_image_url: Optional[str] = None


@router.get("/assignments", response_model=List[ComplaintResponse])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch all complaints that have been assigned to the currently logged-in Field Worker.
    """
    if current_user.role.lower() != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Field Workers can view their assignments."
        )

    # Query complaints by joining the Assignment table to filter by the worker's ID
    assigned_complaints = db.query(Complaint)\
        .join(Assignment, Complaint.id == Assignment.complaint_id)\
        .filter(Assignment.worker_id == current_user.id)\
        .all()

    return assigned_complaints


@router.post("/complaints/{complaint_id}/resolve", status_code=status.HTTP_201_CREATED)
def submit_resolution(
    complaint_id: int,
    payload: ResolutionSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a resolution (notes + optional proof photo) for a complaint.
    """
    if current_user.role.lower() != "worker":
        raise HTTPException(status_code=403, detail="Access denied.")

    if not payload.notes or not payload.notes.strip():
        raise HTTPException(status_code=400, detail="Resolution notes are required.")

    # 1. Verify the complaint exists
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # 2. Resolution.complaint_id is unique - guard against double-submitting
    #    (would otherwise 500 on the database's unique constraint).
    existing = db.query(Resolution).filter(Resolution.complaint_id == complaint_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This complaint has already been resolved.")

    # 3. Create the Resolution record with the real submitted data
    new_resolution = Resolution(
        complaint_id=complaint.id,
        worker_id=current_user.id,
        resolution_notes=payload.notes.strip(),
        proof_image_url=payload.proof_image_url,
    )
    db.add(new_resolution)

    # 4. Update the Complaint status to Resolved
    complaint.status = "Resolved"

    # 5. Fetch the Citizen to notify them of the good news
    citizen = db.query(User).filter(User.id == complaint.user_id).first()

    # 6. Commit everything to the database
    db.commit()

    # 7. Trigger the notification!
    if citizen:
        try:
            notify_complaint_status_change(
                user_email=citizen.email,
                complaint_title=complaint.title,
                new_status="Resolved"
            )
        except Exception as e:
            print(f"Notification skipped: {e}")

    return {
        "message": "Resolution submitted successfully. The citizen has been notified.",
        "resolution_notes": payload.notes,
        "proof_image": payload.proof_image_url
    }
