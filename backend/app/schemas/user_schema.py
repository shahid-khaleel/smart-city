from pydantic import BaseModel, EmailStr, ConfigDict, field_serializer
from typing import Optional
from datetime import datetime, timezone

# 1. Base Schema: Properties shared across multiple schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    role: Optional[str] = "Citizen"
    department_id: Optional[int] = None

# 2. Create Schema: Properties required for user registration
class UserCreate(UserBase):
    password: str

# 3. Update Schema: Properties allowed when updating a user profile
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None

# 4. Response Schema: Properties to return to the frontend client
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    # This tells Pydantic to read the data even if it is an SQLAlchemy model,
    # converting the database object into a dictionary automatically.
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def _serialize_as_utc(self, dt: datetime, _info):
        # See ComplaintResponse._serialize_as_utc - same naive-UTC issue.
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class Token(BaseModel):
    access_token: str
    token_type: str