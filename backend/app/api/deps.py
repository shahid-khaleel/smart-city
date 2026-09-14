from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.user import User
from app.services.auth import SECRET_KEY, ALGORITHM

# This tells FastAPI's Swagger UI where to send login requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Dependency 1: Get a database session for a request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency 2: Read the JWT token and return the logged-in user
#
# BUG FIX: this used to look up the user by treating the JWT's "sub" claim as
# an email address. But the only login endpoint the frontend actually calls
# (/api/auth/login, in auth.py) issues tokens with sub=str(user.id) - a numeric
# ID, not an email. That mismatch meant every route depending on this function
# (routes_department.py, routes_worker.py, routes_citizen.py) rejected every
# real logged-in user with 401, regardless of role. Now matches app.api.auth's
# get_current_user, which is the implementation that has actually been working.
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode the token to see who it belongs to
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except (jwt.InvalidTokenError, ValueError):
        raise credentials_exception

    # Find the user in the database
    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if user is None:
        raise credentials_exception

    return user
