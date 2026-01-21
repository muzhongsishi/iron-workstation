import sys
import os
sys.path.append(os.getcwd())
from sqlmodel import Session, select
from backend.database import engine
from backend.models import Workstation

def dump_workstations():
    with Session(engine) as session:
        workstations = session.exec(select(Workstation)).all()
        print(f"Total Workstations: {len(workstations)}")
        print(f"{'ID':<5} | {'Name':<20} | {'Room':<20} | {'Admin':<10}")
        print("-" * 60)
        for ws in workstations:
            print(f"{ws.id:<5} | {ws.name:<20} | {ws.room:<20} | {ws.admin_name or 'N/A':<10}")

if __name__ == "__main__":
    dump_workstations()
