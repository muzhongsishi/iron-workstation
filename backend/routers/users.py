from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List, Dict

from ..database import get_session
from ..models import User
from ..schemas import UserRead

router = APIRouter()

@router.get("/users", response_model=Dict[str, List[UserRead]])
def get_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    # Group by grade
    grouped = {}
    for user in users:
        u_read = UserRead(
            id=user.id, 
            name=user.name, 
            grade=user.grade, 
            has_pin=bool(user.hashed_pin),
            email=user.email
        )
        if user.grade not in grouped:
            grouped[user.grade] = []
        grouped[user.grade].append(u_read)
    return grouped
