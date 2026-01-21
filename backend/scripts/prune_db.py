import sys
import os
import re
from sqlmodel import Session, select

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine
from backend.models import Workstation, Reservation
from backend.scripts.sync_hardware import parse_block

def main():
    file_path = "硬件信息.md"
    if not os.path.exists(file_path):
        print("File not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    blocks = re.split(r'(?=\n\d+号)', "\n" + content)
    valid_names = set()
    
    for block in blocks:
        if not block.strip(): continue
        info = parse_block(block)
        if info["name"]:
            valid_names.add(info["name"])
            
    print(f"Found {len(valid_names)} valid names in markdown: {valid_names}")
    
    with Session(engine) as session:
        all_ws = session.exec(select(Workstation)).all()
        deleted_count = 0
        for ws in all_ws:
            if ws.name not in valid_names:
                print(f"Deleting unknown workstation: {ws.name} (ID: {ws.id})")
                
                # Delete reservations first
                reservations = session.exec(select(Reservation).where(Reservation.workstation_id == ws.id)).all()
                for res in reservations:
                    session.delete(res)
                
                session.delete(ws)
                deleted_count += 1
                
        session.commit()
    
    print(f"Pruned {deleted_count} workstations. Kept {len(valid_names)}.")

if __name__ == "__main__":
    main()
