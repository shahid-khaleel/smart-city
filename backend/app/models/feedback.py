from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

# Import the Base class from database.py
from app.db.database import Base

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to the resolved complaint and the citizen who submitted the feedback
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # The actual feedback data (e.g., a 1-5 star rating and optional text)
    rating = Column(Integer, nullable=False)
    comments = Column(String, nullable=True)
    
    # Timestamp for when the feedback was submitted
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---------------------------------------------------------
    # Relationships (Uncomment once User and Complaint models are built)
    # ---------------------------------------------------------
    # complaint = relationship("Complaint", back_populates="feedbacks")
    # user = relationship("User", back_populates="feedbacks")