from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import jwt
import uuid

# Import database dependency
from app.db.database import get_db

# Import models and schemas
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserResponse, Token

# Import your Security Engine and Email Service
from app.services import auth as auth_service
from app.services import email_service

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------------------------------------------------------
# 2FA LOGIN OTP STORAGE
# ---------------------------------------------------------
OTP_STORE = {}

class OTPVerifyRequest(BaseModel):
    email: str
    otp_code: str

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Security guard that intercepts requests, reads JWT, and fetches the user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pw = auth_service.get_password_hash(user.password)
    
    new_user = User(
        email=user.email,
        hashed_password=hashed_pw,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        department_id=user.department_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Find user by email OR phone number
    user = db.query(User).filter(
        (User.email == form_data.username) | (User.phone_number == form_data.username)
    ).first()
    
    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # --- 2FA INTERCEPTOR (CITIZENS ONLY) ---
    if user.role.lower() == "citizen" and user.email != "citizen@smartcity.com":
        otp_code = email_service.generate_otp()
        
        # FIX: Store using user.email as the consistent key, 
        # but return user.email to the frontend so it knows where to route the OTP verification step
        OTP_STORE[user.email] = {
            "code": otp_code,
            "expires_at": datetime.utcnow() + timedelta(minutes=5)
        }
        
        print(f"--- ⚠️ DEV MODE: Generated OTP for {user.email} is {otp_code} ---")
        email_service.send_otp_email(user.email, otp_code)
        
        return {
            "message": "2FA Verification Required",
            "require_2fa": True,
            "email": user.email  # Frontend uses this email for the verify-otp payload
        }

    # --- IMMEDIATE ACCESS ---
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role, "full_name": user.full_name}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/verify-otp", response_model=Token)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Step 2 of 2FA Login"""
    # request.email here corresponds to the email sent back from the login interceptor
    stored_data = OTP_STORE.get(request.email)
    
    if not stored_data:
        raise HTTPException(status_code=400, detail="OTP expired or no active request found.")
        
    if datetime.utcnow() > stored_data["expires_at"]:
        del OTP_STORE[request.email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please log in again.")
        
    if stored_data["code"] != request.otp_code:
        raise HTTPException(status_code=401, detail="Invalid verification code.")
        
    del OTP_STORE[request.email]
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User registry conflict.")
        
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role, "full_name": user.full_name}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ---------------------------------------------------------
# PROFILE MANAGEMENT
# ---------------------------------------------------------
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    password: Optional[str] = None

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me")
def update_current_user_profile(
    update_data: ProfileUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if update_data.full_name: current_user.full_name = update_data.full_name
    if update_data.phone: current_user.phone_number = update_data.phone
    if update_data.city and hasattr(current_user, 'city'): current_user.city = update_data.city
    if update_data.state and hasattr(current_user, 'state'): current_user.state = update_data.state
    if update_data.password: 
        current_user.hashed_password = auth_service.get_password_hash(update_data.password)
    
    db.commit()

    # --- ONE-TIME UNLOCK FIX ---
    # Automatically consume (delete) the approved request so the user's form locks again immediately
    global EDIT_REQUESTS_DB
    EDIT_REQUESTS_DB = [req for req in EDIT_REQUESTS_DB if not (req["user_id"] == current_user.id and req["status"] == "Approved")]

    return {"message": "Identity Profile Successfully Updated"}

# ---------------------------------------------------------
# PROFILE EDIT AUTHORIZATION REQUESTS (LIVE IN-MEMORY STORE)
# ---------------------------------------------------------
EDIT_REQUESTS_DB = []

class EditRequestCreate(BaseModel):
    reason: str

# 1. WORKER/DEPT SENDS REQUEST
@router.post("/request-edit")
def submit_edit_request(
    request: EditRequestCreate, 
    current_user: User = Depends(get_current_user)
):
    new_request = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "user_name": current_user.full_name or "Unknown User",
        "role": current_user.role.lower(),
        "reason": request.reason,
        "status": "Pending",
        "created_at": datetime.utcnow()
    }
    # Optional: Delete any old pending requests for this user so they don't spam the inbox
    global EDIT_REQUESTS_DB
    EDIT_REQUESTS_DB = [req for req in EDIT_REQUESTS_DB if req["user_id"] != current_user.id]
    
    EDIT_REQUESTS_DB.append(new_request)
    return {"message": "Authorization Request Transmitted"}

# 2. WORKER CHECKS THEIR OWN REQUEST STATUS
@router.get("/edit-request/status")
def check_my_edit_status(current_user: User = Depends(get_current_user)):
    user_requests = [req for req in EDIT_REQUESTS_DB if req["user_id"] == current_user.id]
    if not user_requests:
        return {"status": "None"}
    
    # Get their most recent request
    latest_req = sorted(user_requests, key=lambda x: x["created_at"], reverse=True)[0]
    
    # Expire pending requests after 24 hours
    now = datetime.utcnow()
    if latest_req["status"] == "Pending" and (now - latest_req["created_at"]).total_seconds() >= 86400:
        return {"status": "None"}
        
    return {"status": latest_req["status"]}

# 3. ADMIN FETCHES ALL PENDING REQUESTS
@router.get("/edit-requests")
def get_edit_requests(current_user: User = Depends(get_current_user)):
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    now = datetime.utcnow()
    active_requests = []
    
    for req in EDIT_REQUESTS_DB:
        age_seconds = (now - req["created_at"]).total_seconds()
        if req["status"] == "Pending" and age_seconds < 86400:
            active_requests.append(req)
            
    return active_requests

# 4. ADMIN APPROVES OR DENIES REQUEST
@router.put("/edit-requests/{req_id}")
def process_edit_request(
    req_id: str, 
    action: str, 
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    for req in EDIT_REQUESTS_DB:
        if req["id"] == req_id:
            req["status"] = "Approved" if action == "approve" else "Denied"
            return {"message": f"Request {req['status']}"}
            
    raise HTTPException(status_code=404, detail="Request not found")

# ---------------------------------------------------------
# PASSWORD RECOVERY SYSTEM
# ---------------------------------------------------------
otp_vault = {} 

class PasswordRecoveryRequest(BaseModel):
    email: str

class RecoveryOTPVerifyRequest(BaseModel):
    email: str
    otp: str

@router.post("/forgot-password")
def forgot_password(request: PasswordRecoveryRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    
    if user:
        otp = email_service.generate_otp()
        otp_vault[request.email] = otp
        
        print(f"--- ⚠️ DEV MODE: Generated Password Recovery OTP for {user.email} is {otp} ---")
        try:
            email_service.send_otp_email(user.email, otp)
        except Exception as e:
            print(f"🚨 Email Delivery Failed: {str(e)}")
    
    return {"message": "Protocol Dispatched"}

class PasswordResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    valid_otp = otp_vault.get(request.email)
    
    if not valid_otp or valid_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid or expired secure code."
        )
        
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in registry.")
        
    user.hashed_password = auth_service.get_password_hash(request.new_password)
    db.commit()
    
    del otp_vault[request.email]
    
    return {"message": "Passcode successfully updated", "status": "success"}