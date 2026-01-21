from datetime import date, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Reservation, User, Workstation
from ..schemas import ReservationCreate

router = APIRouter()

@router.post("/reservations")
def create_reservation(req: ReservationCreate, session: Session = Depends(get_session)):
    # 1. Validate User
    user = session.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Validate Workstation
    ws = session.get(Workstation, req.workstation_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workstation not found")
        
    # 3. Validate Dates
    if req.end_date < req.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    if req.start_date < date.today():
         raise HTTPException(status_code=400, detail="Cannot book in the past")

    # 4. Conflict Check
    # Overlap logic: (StartA <= EndB) and (EndA >= StartB)
    stmt = select(Reservation).where(
        (Reservation.workstation_id == req.workstation_id) &
        (Reservation.status == "active") &
        (Reservation.start_date <= req.end_date) &
        (Reservation.end_date >= req.start_date)
    )
    conflicts = session.exec(stmt).all()
    
    if conflicts:
        conflict_msg = f"Conflict with existing reservation by {conflicts[0].user.name} ({conflicts[0].start_date} to {conflicts[0].end_date})"
        return {"success": False, "message": conflict_msg}
        
    # 5. Create
    reservation = Reservation(
        user_id=req.user_id,
        workstation_id=req.workstation_id,
        start_date=req.start_date,
        end_date=req.end_date,
        purpose=req.purpose,
        status="active"
    )
    session.add(reservation)
    session.commit()
    
    return {"success": True, "message": "Reservation created successfully"}

@router.get("/reservations/my/{user_id}")
def get_my_reservations(user_id: int, session: Session = Depends(get_session)):
    # Return active or future reservations with Workstation Name manually attached
    today = date.today()
    stmt = select(Reservation, Workstation.name).join(Workstation).where(
        (Reservation.user_id == user_id) &
        (Reservation.end_date >= today) & 
        (Reservation.status == "active")
    ).order_by(Reservation.start_date)
    
    results = session.exec(stmt).all()
    
    # Format response: flatten tuple (Reservation, ws_name)
    reservations = []
    for res, ws_name in results:
        # We can attach attribute dynamically or convert to dict
        res_dict = res.model_dump()
        res_dict["workstation_name"] = ws_name
        reservations.append(res_dict)
        
    return reservations

@router.post("/reservations/{res_id}/renew")
def renew_reservation(res_id: int, session: Session = Depends(get_session)):
    res = session.get(Reservation, res_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    res.last_renewed_at = datetime.now()
    session.add(res)
    session.commit()
    return {"success": True, "message": "Reservation renewed"}
