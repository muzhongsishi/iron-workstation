import sys
import os
import re
from sqlmodel import Session, select

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine
from backend.models import Workstation

def parse_block(block: str):
    info = {
        "name": None,
        "room": "Unknown Room",
        "cpu_info": None,
        "core_count": None,
        "memory_gb": 0,
        "os_info": None,
        "admin_name": None
    }
    
    # 1. Hostname
    # Try 【主机名】
    name_match = re.search(r'【主机名】\s*[:：]\s*(?P<val>.*)', block)
    if name_match:
        info["name"] = name_match.group('val').strip()
    else:
        # Try cluster pattern
        cluster_match = re.search(r'(集群\d+)\s*节点', block)
        if cluster_match:
            info["name"] = cluster_match.group(1).strip()
            
    # 2. Room
    room_match = re.search(r'(位置|地点)\s*[:：]?\s*(?P<val>.*)', block)
    if room_match:
        # Extract just the room text, sometimes it includes user name "船池401-1 冯世超工位"
        # We might want to keep it all or clean it. User probably wants the location.
        info["room"] = room_match.group('val').strip()
    elif "集群" in block:
         info["room"] = "集群小屋"
         
    # 3. Admin
    admin_match = re.search(r'(管理员|负责人|使用人)\s*[:：]?\s*(?P<val>.*)', block)
    if admin_match:
        val = admin_match.group('val').strip()
        # Clean up potential "【主机名】" trailing if on same line (though unlikely with regex)
        if "【" in val: val = val.split('【')[0].strip()
        info["admin_name"] = val
        
    # 4. CPU & Cores
    # Handle messy shell output lines by ignoring lines with <font
    clean_block = "\n".join([line for line in block.split('\n') if "<font" not in line])
    
    cpu_match = re.search(r'【CPU型号】\s*[:：]\s*(?P<val>.*)', clean_block)
    if cpu_match:
        info["cpu_info"] = cpu_match.group('val').strip()
        
    # parse core count
    # Priority 1: 【物理核心】 : 12 核
    phy_core_match = re.search(r'【物理核心】\s*[:：]\s*(?P<val>.*)', clean_block)
    if phy_core_match:
        info["core_count"] = phy_core_match.group('val').strip()
    else:
        # Priority 2: 48核心
        short_core_match = re.search(r'(\d+核心)', block)
        if short_core_match:
            info["core_count"] = short_core_match.group(1)
            
    # 5. Memory
    mem_match = re.search(r'【内存大小】\s*[:：]\s*(?P<val>.*)', clean_block)
    if mem_match:
        val = mem_match.group('val').strip()
        num = re.search(r'(\d+)', val)
        if num:
            info["memory_gb"] = int(num.group(1))
    
    # 6. OS
    os_match = re.search(r'【操作系统】\s*[:：]\s*(?P<val>.*)', clean_block)
    if os_match:
         info["os_info"] = os_match.group('val').strip()
    elif "Linux" in block:
         info["os_info"] = "Linux"
         
    # Cleanups
    if info["name"] == "lx (宵站)" or info["name"] == "lx":
        info["name"] = "lx (宵站)"
        if not info["cpu_info"]: info["cpu_info"] = "AMD EPYC 7T83 64-Core"
        if not info["memory_gb"]: info["memory_gb"] = 256 
        info["room"] = "集群小屋"
        if not info["core_count"]: info["core_count"] = "64 核" # guess

    if info["name"] == "lg":
         # lg in file (15号) has cpu info
         pass
         
    return info

def main():
    file_path = "硬件信息.md"
    if not os.path.exists(file_path):
        print(f"File {file_path} not found")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Split by "X号"
    # We use lookahead
    blocks = re.split(r'(?=\n\d+号)', "\n" + content)
    
    synced_count = 0
    
    with Session(engine) as session:
        # Clear existing data to fix IDs and duplicates
        session.exec(select(Workstation)).all() # load all
        session.query(Workstation).delete() # using sqlalchemy delete
        # SQLModel doesn't have direct delete_all, use standard SQL or delete loop
        # Check if we can use delete()
        from sqlmodel import delete
        session.exec(delete(Workstation))
        session.commit()
        print("Cleared existing workstations.")

        for block in blocks:
            if not block.strip():
                continue
                
            info = parse_block(block)
            
            if not info["name"]:
                continue
            
            # Since we cleared, we just insert
            # Check for duplicates WITHIN the file (e.g. 12号 appearing twice)
            existing_in_session = session.exec(select(Workstation).where(Workstation.name == info["name"])).first()
            
            if existing_in_session:
                # Update it
                 existing_in_session.room = info["room"]
                 existing_in_session.cpu_info = info["cpu_info"]
                 existing_in_session.core_count = info["core_count"]
                 existing_in_session.memory_gb = info["memory_gb"]
                 existing_in_session.os_info = info["os_info"]
                 existing_in_session.admin_name = info["admin_name"]
                 session.add(existing_in_session)
                 print(f"Updated (In-File Dup): {info['name']}")
            else:
                ws = Workstation(**info)
                session.add(ws)
                print(f"Created: {info['name']}")
                
            synced_count += 1
            
        session.commit()
    
    print(f"Synced {synced_count} workstations.")

if __name__ == "__main__":
    main()
