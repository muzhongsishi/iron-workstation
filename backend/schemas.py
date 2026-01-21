from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class UserRead(BaseModel):
    id: int
    name: str
    grade: str
    has_pin: bool  # To tell frontend if strict login is needed or setup
    email: Optional[str] = None

class LoginRequest(BaseModel):
    name: str
    pin: str

class SetupUserRequest(BaseModel):
    name: str
    pin: str
    email: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserRead] = None
    token: Optional[str] = None # Simple Mock Token for now

class WorkstationRead(BaseModel):
    id: int
    name: str
    room: str
    cpu_info: Optional[str]
    memory_gb: Optional[int]
    os_info: Optional[str]
    status: str = "idle" # idle, busy
    current_user_name: Optional[str] = None
    admin_name: Optional[str] = None
    core_count: Optional[str] = None
    
class ReservationCreate(BaseModel):
    workstation_id: int
    user_id: int
    start_date: date
    end_date: date
    purpose: str
