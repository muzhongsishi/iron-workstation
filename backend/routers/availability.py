from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date, timedelta
from typing import List, Dict

from ..database import get_session
from ..models import Reservation, User

router = APIRouter()

@router.get("/reservations/availability/{workstation_id}")
def get_workstation_availability(
    workstation_id: int, 
    days: int = 30,
    session: Session = Depends(get_session)
):
    """
    Get reservation status for the next N days for a specific workstation.
    Returns a list of daily statuses.
    """
    today = date.today()
    end_date = today + timedelta(days=days)
    
    # Get all active reservations overlapping with the range
    stmt = select(Reservation).where(
        (Reservation.workstation_id == workstation_id) &
        (Reservation.status == "active") &
        (Reservation.end_date >= today) & 
        (Reservation.start_date <= end_date)
    )
    reservations = session.exec(stmt).all()
    
    # Map dates to status
    availability_map = {}
    
    # Default to available
    current = today
    while current <= end_date:
        availability_map[current] = {"date": current, "status": "available", "user": None, "purpose": None}
        current += timedelta(days=1)
        
    for res in reservations:
        # Iterate through reservation dates
        # Max(today, start) to Min(end, end_range)
        s = max(today, res.start_date)
        e = min(end_date, res.end_date)
        
        curr = s
        while curr <= e:
            availability_map[curr] = {
                "date": curr,
                "status": "busy",
                "user": res.user.name if res.user else "Unknown",
                "purpose": res.purpose
            }
            curr += timedelta(days=1)
            
    return list(availability_map.values())
