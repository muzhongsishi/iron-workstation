from fastapi import APIRouter, Depends, HTTPException, Header
from datetime import date
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from ..utils.parser import parse_workstation_block
from backend.services.file_sync import append_to_hardware_md
from backend.database import get_session
from backend.models import Workstation, User, Reservation

router = APIRouter()

class WorkstationUpdate(BaseModel):
    name: Optional[str] = None
    room: Optional[str] = None
    admin_name: Optional[str] = None
    cpu_info: Optional[str] = None
    core_count: Optional[str] = None
    memory_gb: Optional[int] = None
    os_info: Optional[str] = None

class WorkstationCreate(BaseModel):
    name: str 
    room: str
    admin_name: str
    cpu_info: str
    core_count: str
    memory_gb: int
    os_info: str

@router.post("/admin/workstations/add")
def add_workstation(
    req: WorkstationCreate,
    session: Session = Depends(get_session)
):
    try:
        # Check exists in DB by HOSTNAME
        exists = session.exec(select(Workstation).where(Workstation.name == req.name)).first()
        if exists:
            # We allow room changes or we just skip? For adding new, we expect it not to be there.
            # But with syncing, maybe it exists.
            return {"success": False, "message": f"Workstation Hostname {req.name} already exists."}
            
        # Create
        ws = Workstation(**req.dict())
        session.add(ws)
        session.commit()
        session.refresh(ws)
        
        # Determine ID for Markdown? We have ws.id now.
        # Format similar to existing file
        md_block = f"""
{ws.id}号补录：{req.room} {req.admin_name}工位
管理员：{req.admin_name}
【主机名】 : {req.name}
【CPU型号】 : {req.cpu_info}
【物理核心】 : {req.core_count}
【内存大小】 : {req.memory_gb} GB
【操作系统】 : {req.os_info}
"""
        append_to_hardware_md(md_block, file_path="硬件信息.md")
            
        return {"success": True, "message": f"Added workstation {req.name}", "workstation": ws}
    except Exception as e:
        print(f"Error adding workstation: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}

@router.get("/admin/reservations/{ws_id}")
def get_workstation_reservations(ws_id: int, session: Session = Depends(get_session)):
    today = date.today()
    # Get active future reservations
    reservations = session.exec(
        select(Reservation).where(
            (Reservation.workstation_id == ws_id) &
            (Reservation.status == "active") &
            (Reservation.end_date >= today)
        )
    ).all()
    
    # Return structured data for frontend calendar
    return [
        {
            "start_date": r.start_date,
            "end_date": r.end_date,
            "user_name": r.user.name,
            "user_id": r.user_id,
            "purpose": r.purpose
        }
        for r in reservations
    ]

@router.put("/admin/workstations/{ws_id}")
def update_workstation(
    ws_id: int, 
    req: WorkstationUpdate, 
    session: Session = Depends(get_session),
    authorization: Optional[str] = Header(None) 
):
    ws = session.get(Workstation, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workstation not found")
        
    if req.name is not None: ws.name = req.name
    if req.room is not None: ws.room = req.room
    if req.admin_name is not None: ws.admin_name = req.admin_name
    if req.cpu_info is not None: ws.cpu_info = req.cpu_info
    if req.core_count is not None: ws.core_count = req.core_count
    if req.memory_gb is not None: ws.memory_gb = req.memory_gb
    if req.os_info is not None: ws.os_info = req.os_info
        
    session.add(ws)
    session.commit()
    session.refresh(ws)
    
    return {"success": True, "message": "Workstation updated", "workstation": ws}

class AdminReservationCreate(BaseModel):
    workstation_id: int
    user_id: int
    start_date: date
    end_date: date
    purpose: str = "Administrator Assigned"
    force: bool = False

@router.post("/admin/reservations")
def create_admin_reservation(
    req: AdminReservationCreate,
    session: Session = Depends(get_session)
):
    # 1. Validate User & Workstation
    user = session.get(User, req.user_id)
    ws = session.get(Workstation, req.workstation_id)
    
    if not user:
        return {"success": False, "message": "User not found"}
    if not ws:
        return {"success": False, "message": "Workstation not found"}
        
    # 2. Check Conflicts
    # Check if this machine is already reserved in this range
    # Conflict if: (StartA <= EndB) and (EndA >= StartB)
    conflict = session.exec(select(Reservation).where(
        (Reservation.workstation_id == req.workstation_id) &
        (Reservation.id != 0) & # Dummy check
        (Reservation.status == "active") &
        (Reservation.start_date <= req.end_date) &
        (Reservation.end_date >= req.start_date)
    )).first()
    
    if conflict:
        if req.force:
            # FORCE: Cancel all conflicts in this range
            conflicts = session.exec(select(Reservation).where(
                (Reservation.workstation_id == req.workstation_id) &
                (Reservation.status == "active") &
                (Reservation.start_date <= req.end_date) &
                (Reservation.end_date >= req.start_date)
            )).all()
            
            for c in conflicts:
                c.status = "cancelled_by_admin"
                session.add(c)
            session.commit()
            # Proceed to create
        else:
            return {
                "success": False, 
                "message": f"Conflict detected! Reserved by {conflict.user.name} ({conflict.start_date} - {conflict.end_date}). Check 'Force' to overwrite."
            }

    # 3. Create Reservation
    res = Reservation(
        user_id=req.user_id,
        workstation_id=req.workstation_id,
        start_date=req.start_date,
        end_date=req.end_date,
        purpose=req.purpose,
        status="active",
        created_at=date.today(),
        last_renewed_at=date.today()
    )
    
    session.add(res)
    session.commit()
    session.refresh(res)
    
    return {"success": True, "message": "Reservation assigned successfully", "reservation": res}

@router.delete("/admin/workstations/{ws_id}")
def delete_workstation(
    ws_id: int,
    session: Session = Depends(get_session)
):
    ws = session.get(Workstation, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workstation not found")
        
    session.delete(ws)
    session.commit()
    return {"success": True, "message": f"Workstation {ws.name} deleted"}
