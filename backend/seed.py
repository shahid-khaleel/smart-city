import os
import sys

# Force UTF-8 stdout so the emoji in this script's print() statements don't
# crash on Windows, where the default console encoding (cp1252) can't
# represent them (same fix as app/main.py).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.database import SessionLocal, engine, Base

# 1. CRITICAL: Import ALL models before calling create_all() so SQLAlchemy sees the relationships
from app.models.user import User
from app.models.complaint import Complaint
# Updated to import from our new Phase 4 file!
from app.models.jurisdiction import Municipality, Department 

# If you have these other models built, you can uncomment them:
# from app.models.assignment import Assignment
# from app.models.feedback import Feedback
# from app.models.resolution import Resolution

# Rebuild all database tables based on your models
print("🧹 Dropping old tables and resetting database for Phase 4...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Set up the password hasher (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_database():
    print("Connecting to the database...")
    db: Session = SessionLocal()
    
    try:
        # ---------------------------------------------------------
        # 1. SEED JURISDICTIONS (Phase 4 Hierarchy)
        # ---------------------------------------------------------
        print("\n🏢 Building Municipalities (Zones)...")
        zone_south = Municipality(name="Bengaluru South Zone", description="South district jurisdiction")
        db.add(zone_south)
        
        print("🚦 Building Departments...")
        # NOTE: these names must line up with the category strings the
        # frontend sends and app/api/routes_complaints.py's keyword-based
        # department router (create_complaint's search_keyword logic).
        dept_roads = Department(name="Roads & Infrastructure", description="Handles potholes, roads, and bridges")
        dept_water = Department(name="Water & Sanitation", description="Handles leaks, drainage, and sanitation")
        dept_electrical = Department(name="Electrical & Lighting", description="Handles streetlights and power issues")
        dept_safety = Department(name="Vandalism & Safety", description="Handles vandalism and public safety hazards")
        dept_environment = Department(name="Environment & Parks", description="Handles parks, trees, and environmental issues")
        dept_general = Department(name="General", description="Catch-all for unclassified reports")
        db.add_all([dept_roads, dept_water, dept_electrical, dept_safety, dept_environment, dept_general])

        db.commit()
        db.refresh(zone_south)
        db.refresh(dept_roads)

        # ---------------------------------------------------------
        # 2. SEED USERS (Role-Based Access Control)
        # ---------------------------------------------------------
        test_users = [
            {"email": "admin@smartcity.com", "full_name": "Admin User", "password": "password123", "role": "admin", "mun_id": None, "dep_id": None},
            # Official and Worker get assigned to the specific zone and department!
            {"email": "official@smartcity.com", "full_name": "City Official", "password": "password123", "role": "official", "mun_id": zone_south.id, "dep_id": dept_roads.id},
            {"email": "worker@smartcity.com", "full_name": "Field Worker", "password": "password123", "role": "worker", "mun_id": zone_south.id, "dep_id": dept_roads.id},
            {"email": "citizen@smartcity.com", "full_name": "Local Citizen", "password": "password123", "role": "citizen", "mun_id": None, "dep_id": None},
        ]

        # Dictionary to store created users so we can link complaints to them
        created_users = {}

        print("\n👥 Seeding users...")
        for user_data in test_users:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            display_name = user_data.get("full_name") or "System User"
            safe_hash = get_password_hash(user_data["password"])

            if not existing_user:
                new_user = User(
                    email=user_data["email"],
                    full_name=display_name,
                    hashed_password=safe_hash,
                    role=user_data["role"],
                    municipality_id=user_data["mun_id"], # Phase 4 connection
                    department_id=user_data["dep_id"]    # Phase 4 connection
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                created_users[user_data["role"]] = new_user
                print(f"  [+] Created {user_data['role']}: {user_data['email']}")
                
            else:
                existing_user.hashed_password = safe_hash
                existing_user.full_name = display_name
                existing_user.role = user_data["role"]
                existing_user.municipality_id = user_data["mun_id"]
                existing_user.department_id = user_data["dep_id"]
        
                db.commit()
                db.refresh(existing_user)
                created_users[user_data["role"]] = existing_user
                print(f"  [*] Repaired & Updated {user_data['role']}: {user_data['email']}")

        # ---------------------------------------------------------
        # 3. SEED COMPLAINTS (AI Triage Examples)
        # ---------------------------------------------------------
        citizen_id = created_users["citizen"].id

        test_complaints = [
            {
                "title": "Massive pothole on 5th Avenue",
                "description": "There is a deep pothole in the right lane causing traffic slowdowns and vehicle damage.",
                "category": "Roads & Infrastructure", # Updated to match department perfectly     
                "severity": "High",                
                "status": "Open",
                "user_id": citizen_id,
                "municipality_id": zone_south.id,  
                "department_id": dept_roads.id,
                
                # --- NEW: ADDING GPS DATA SO THE ENGINE CAN FIND IT ---
                "location_lat": 12.9716, 
                "location_lng": 77.5946,
                "address": "Central Bengaluru"
            },
            {
                "title": "Broken streetlights in park",
                "description": "Three consecutive streetlights are out in the north end of the city park, creating a safety hazard.",
                "category": "Electrical & Lighting",
                "severity": "Medium",
                "status": "Assigned",
                "user_id": citizen_id,
                "municipality_id": zone_south.id,
                "department_id": dept_electrical.id,
            },
            {
                "title": "Graffiti on bus stop",
                "description": "Someone spray-painted the glass at the main street bus shelter.",
                "category": "Vandalism & Safety",
                "severity": "Low",
                "status": "Resolved",
                "user_id": citizen_id,
                "municipality_id": zone_south.id,
                "department_id": dept_safety.id,
            }
        ]

        print("\n📝 Seeding complaints...")
        for complaint_data in test_complaints:
            existing_complaint = db.query(Complaint).filter(Complaint.title == complaint_data["title"]).first()
            if not existing_complaint:
                new_complaint = Complaint(**complaint_data)
                db.add(new_complaint)
                print(f"  [+] Created complaint: {complaint_data['title']}")
            else:
                print(f"  [-] Complaint '{complaint_data['title']}' already exists, skipping.")
        
        db.commit()
        print("\n✅ Phase 4 Database Seeding Completed Successfully!")

    except Exception as e:
        print(f"\n❌ An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()