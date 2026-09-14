from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func

# Import the Base class from database.py
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication and Contact Information
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    
    # Role-Based Access Control (e.g., "Citizen", "Admin", "Worker", "Official")
    role = Column(String, default="Citizen", index=True, nullable=False)
    
    # --- PHASE 4: HIERARCHICAL RBAC (Role-Based Access Control) ---
    # Zone link (Applicable for Officials and Field Workers to limit their jurisdiction)
    municipality_id = Column(Integer, ForeignKey("municipalities.id"), nullable=True)
    
    # Department link (Applicable only for Officials and Field Workers)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Account status and creation timestamp
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---------------------------------------------------------
    # Relationships 
    # ---------------------------------------------------------
    # department = relationship("Department", back_populates="users")
    # municipality = relationship("Municipality") # Uncomment when needed
    # complaints_submitted = relationship("Complaint", foreign_keys="[Complaint.user_id]", back_populates="user")
    # complaints_assigned = relationship("Complaint", foreign_keys="[Complaint.worker_id]", back_populates="worker")
    # assignments = relationship("Assignment", back_populates="worker")
    # feedbacks = relationship("Feedback", back_populates="user")
    # resolutions = relationship("Resolution", back_populates="worker")