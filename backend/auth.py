import os
from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Constants
SECRET_KEY = os.getenv("SECRET_KEY", "yoursecretkeyhere")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        role: str = payload.get("role")
        if phone is None or role is None:
            raise credentials_exception
        return {"phone": phone, "role": role}
    except jwt.PyJWTError:
        raise credentials_exception

async def get_current_user(token_data: dict = Depends(verify_token)):
    if token_data["role"] != "user":
        raise HTTPException(status_code=403, detail="Not authorized. Requires user role.")
    return token_data

async def get_current_mechanic(token_data: dict = Depends(verify_token)):
    if token_data["role"] != "mechanic":
        raise HTTPException(status_code=403, detail="Not authorized. Requires mechanic role.")
    return token_data

async def get_current_admin(token_data: dict = Depends(verify_token)):
    if token_data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized. Requires admin role.")
    return token_data

async def get_current_tow_truck(token_data: dict = Depends(verify_token)):
    if token_data["role"] != "tow_truck":
        raise HTTPException(status_code=403, detail="Not authorized. Requires tow_truck role.")
    return token_data

async def get_any_authenticated_user(token_data: dict = Depends(verify_token)):
    """Allows any valid authenticated role (user, mechanic, admin, tow_truck)."""
    return token_data
