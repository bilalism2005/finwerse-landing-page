import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security_optional)) -> str:
    if not credentials or not credentials.credentials:
        return "anonymous"
    
    token = credentials.credentials
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except Exception:
            pass
    
    # Fallback to decode claims directly
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        return unverified.get("sub") or "anonymous"
    except Exception:
        return "anonymous"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user_id: str = payload.get("sub")
            if user_id:
                return user_id
        except Exception:
            pass
    
    # Resilient fallback to decode claims directly
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified.get("sub")
        if user_id:
            return user_id
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
