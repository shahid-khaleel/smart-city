from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

# Import the Base class from database.py
from app.db.database import Base

class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to the resolved complaint and the worker who fixed it
    # Note: complaint_id is unique here because one complaint typically has one final resolution
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Details about how the issue was fixed
    resolution_notes = Column(String, nullable=False)
    
    # Optional photographic proof of the completed work
    proof_image_url = Column(String, nullable=True)
    
    # Timestamp for when the resolution was submitted
    resolved_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---------------------------------------------------------
    # Relationships (Uncomment once User and Complaint models are built)
    # ---------------------------------------------------------
    # complaint = relationship("Complaint", back_populates="resolution")
    # worker = relationship("User", back_populates="resolutions")