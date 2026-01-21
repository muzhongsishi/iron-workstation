from typing import Optional, List
from datetime import date, datetime
from sqlmodel import Field, SQLModel, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    grade: str = Field(index=True)  # Year/Group from Excel
    email: Optional[str] = None
    hashed_pin: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    reservations: List["Reservation"] = Relationship(back_populates="user")

class Workstation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str  # Hostname or Display Name
    room: str = Field(index=True)
    
    # Hardware Specs
    cpu_info: Optional[str] = None
    core_count: Optional[str] = None
    gpu_info: Optional[str] = None  # Future proofing
    memory_gb: Optional[int] = None
    os_info: Optional[str] = None
    
    # Admin
    admin_name: Optional[str] = None
    
    reservations: List["Reservation"] = Relationship(back_populates="workstation")

class Reservation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    user_id: int = Field(foreign_key="user.id")
    workstation_id: int = Field(foreign_key="workstation.id")
    
    start_date: date
    end_date: date
    
    purpose: Optional[str] = None
    status: str = Field(default="active")  # active, cancelled
    
    created_at: datetime = Field(default_factory=datetime.now)
    last_renewed_at: datetime = Field(default_factory=datetime.now) # For heartbeat
    
    user: User = Relationship(back_populates="reservations")
    workstation: Workstation = Relationship(back_populates="reservations")
