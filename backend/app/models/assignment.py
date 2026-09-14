from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

# Import the Base class we created in database.py
from app.db.database import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys linking this assignment to a specific complaint and a specific worker
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Automatically timestamp when the assignment was created
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Track the progress of this specific assignment
    status = Column(String, default="Assigned")  # e.g., Assigned, In Progress, Completed
    
    # Allow the worker to leave notes when they complete or update the task
    remarks = Column(String, nullable=True)

    # ---------------------------------------------------------
    # Relationships (Uncomment these once User and Complaint models are built)
    # ---------------------------------------------------------
    # complaint = relationship("Complaint", back_populates="assignments")
    # worker = relationship("User", back_populates="assignments")