from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Import settings to securely get the DATABASE_URL
from app.core.config import settings

# 1. Create the SQLAlchemy Engine
# Automatically add SQLite-specific multi-threading thread check bypass if using SQLite
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# 2. Create a SessionLocal class
# Each instance of this class will be an actual database session.
# We disable autocommit and autoflush so we can control when data is saved.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create a Base class
# All of our database models (tables) will inherit from this Base class.
Base = declarative_base()

# 4. Create the get_db Dependency
# This function creates a new database session for each request and closes it afterward.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()