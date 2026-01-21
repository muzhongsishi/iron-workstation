import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import User
from ..schemas import LoginRequest, SetupUserRequest, AuthResponse, UserRead

router = APIRouter()

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

@router.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, session: Session = Depends(get_session)):
    # 1. Admin Login Check (Hardcoded as requested)
    if req.name == "admin" and req.pin == "010601":
        return AuthResponse(
            success=True, 
            message="Admin login successful", 
            user=UserRead(id=0, name="admin", grade="Administrator", has_pin=True, email="admin@localhost"),
            token="admin-token"
        )

    # 2. Normal User Login
    user = session.exec(select(User).where(User.name == req.name)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.hashed_pin:
        return AuthResponse(success=False, message="PIN not set. Please setup first.")
    
    if user.hashed_pin != hash_pin(req.pin):
        return AuthResponse(success=False, message="Invalid PIN")
        
    return AuthResponse(
        success=True, 
        message="Login successful", 
        user=UserRead(id=user.id, name=user.name, grade=user.grade, has_pin=True, email=user.email),
        token=f"mock-token-{user.id}"
    )

@router.post("/auth/setup", response_model=AuthResponse)
def setup_user(req: SetupUserRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.name == req.name)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.hashed_pin:
        return AuthResponse(success=False, message="PIN already set. Please login.")
    
    user.hashed_pin = hash_pin(req.pin)
    user.email = req.email
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return AuthResponse(
        success=True, 
        message="Setup successful", 
        user=UserRead(id=user.id, name=user.name, grade=user.grade, has_pin=True, email=user.email),
        token=f"mock-token-{user.id}"
    )
