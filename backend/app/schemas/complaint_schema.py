from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional
from datetime import datetime, timezone

# 1. Base Schema: Properties shared across multiple schemas
class ComplaintBase(BaseModel):
    title: str
    description: str
    category: str
    location: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    image_url: Optional[str] = None

# 2. Create Schema: Properties required when a user creates a new complaint
class ComplaintCreate(ComplaintBase):
    # We leave out image_url and category here because they are handled
    # separately via Form Data and UploadFile in the API route.
    pass

# 3. Update Schema: Properties allowed when updating a complaint (e.g., by an official)
class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    worker_id: Optional[int] = None
    department_id: Optional[int] = None

# 4. Response Schema: Properties to return to the frontend client
class ComplaintResponse(ComplaintBase):
    id: int
    category: str
    status: str
    
    # UI Badge Fields
    severity: Optional[str] = None
    priority: Optional[str] = "Medium"
    
    image_url: Optional[str] = None
    user_id: int
    
    # --- PHASE 4 HIERARCHY & CLUSTERING DATA ---
    department_id: Optional[int] = None
    municipality_id: Optional[int] = None
    parent_id: Optional[int] = None
    report_count: int = 1
    
    worker_id: Optional[int] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    # This tells Pydantic to read the data even if it is an SQLAlchemy model,
    # converting the database object into a dictionary automatically.
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def _serialize_as_utc(self, dt: Optional[datetime], _info):
        # SQLite/func.now() stores a naive timestamp that's actually UTC, with
        # no timezone marker attached. Without this, the frontend's
        # `new Date(isoString)` treats it as LOCAL time instead of UTC and
        # every displayed timestamp is off by the viewer's UTC offset.
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()