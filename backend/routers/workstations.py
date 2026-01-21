from datetime import date
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, col

from ..database import get_session
from ..models import Workstation, Reservation
from ..schemas import WorkstationRead

router = APIRouter()

@router.get("/workstations", response_model=Dict[str, List[WorkstationRead]])
def get_workstations(session: Session = Depends(get_session)):
    workstations = session.exec(select(Workstation)).all()
    
    # Get active reservations for TODAY
    today = date.today()
    # Query reservations where start <= today <= end and status == 'active'
    active_res = session.exec(
        select(Reservation).where(
            (Reservation.start_date <= today) & 
            (Reservation.end_date >= today) & 
            (Reservation.status == "active")
        )
    ).all()
    
    # Map workstation_id to reservation/user
    busy_map = {r.workstation_id: r.user.name for r in active_res}
    
    # Group by Room
    grouped = {}
    
    for ws in workstations:
        ws_read = WorkstationRead(
            id=ws.id,
            name=ws.name,
            room=ws.room,
            cpu_info=ws.cpu_info,
            memory_gb=ws.memory_gb,
            os_info=ws.os_info,
            status="busy" if ws.id in busy_map else "idle",
            current_user_name=busy_map.get(ws.id),
            admin_name=ws.admin_name,
            core_count=ws.core_count
        )
        
        if ws.room not in grouped:
            grouped[ws.room] = []
        grouped[ws.room].append(ws_read)
        
    return grouped
