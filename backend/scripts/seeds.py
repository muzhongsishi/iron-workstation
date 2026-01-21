import sys
import os
import re
import pandas as pd
from sqlmodel import Session, select

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine, create_db_and_tables
from backend.models import User, Workstation

def import_users():
    print("--- Importing Users ---")
    file_path = "名单.xlsx"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    df = pd.read_excel(file_path)
    
    with Session(engine) as session:
        # Check if users exist to avoid duplicates (naive check)
        existing_users = session.exec(select(User)).all()
        existing_names = {u.name for u in existing_users}

        count = 0
        for grade in df.columns:
            # Skip if column name is explicitly unnamed or empty
            if "Unnamed" in str(grade): 
                continue
                
            names = df[grade].dropna().tolist()
            for name in names:
                name = str(name).strip()
                if name and name not in existing_names:
                    user = User(name=name, grade=str(grade))
                    session.add(user)
                    count += 1
                    existing_names.add(name)
        
        session.commit()
        print(f"Imported {count} new users.")

def parse_workstation_block(block):
    """
    Parse a text block to extract workstation info.
    Returns a dictionary or None.
    """
    lines = block.strip().split('\n')
    if not lines:
        return None
    
    info = {}
    full_text = block
    
    # Defaults
    info['name'] = "Unknown"
    info['room'] = "Unknown"
    
    # Regex Patterns
    
    # Position/Location
    room_match = re.search(r'(位置|地点)\s*[:：]?\s*(?P<val>.*)', full_text)
    if room_match:
        info['room'] = room_match.group('val').strip()
    else:
        # Check for Cluster pattern
        if "集群小屋" in full_text:
            info['room'] = "集群小屋"
            
    # Admin/User
    admin_match = re.search(r'(管理员|负责人|使用人)\s*[:：]?\s*(?P<val>.*)', full_text)
    if admin_match:
        info['admin_name'] = admin_match.group('val').strip()

    # Hostname (Standard)
    host_match = re.search(r'【主机名】\s*[:：]\s*(?P<val>.*)', full_text)
    if host_match:
        info['name'] = host_match.group('val').strip()
    
    # Hostname (Cluster)
    cluster_match = re.search(r'(集群\d+)\s*节点', full_text)
    if cluster_match:
        info['name'] = cluster_match.group(1).strip()
    
    # CPU
    cpu_match = re.search(r'【CPU型号】\s*[:：]\s*(?P<val>.*)', full_text)
    if cpu_match:
        info['cpu_info'] = cpu_match.group('val').strip()
    else:
        # Cluster CPU check
        core_match = re.search(r'(\d+核心)', full_text)
        if core_match:
            info['cpu_info'] = core_match.group(1)

    # Memory
    mem_match = re.search(r'【内存大小】\s*[:：]\s*(?P<val>.*)', full_text)
    if mem_match:
        val = mem_match.group('val').strip()
        # Extract number
        num_match = re.search(r'(\d+)', val)
        if num_match:
            info['memory_gb'] = int(num_match.group(1))
            
    # OS
    os_match = re.search(r'【操作系统】\s*[:：]\s*(?P<val>.*)', full_text)
    if os_match:
        info['os_info'] = os_match.group('val').strip()
    else:
        sys_match = re.search(r'系统\s+(Linux|Windows)', full_text, re.IGNORECASE)
        if sys_match:
            info['os_info'] = sys_match.group(0)

    # Clean Name if it's empty or still unknown but we have room
    if info['name'] == "Unknown" and info['room'] != "Unknown":
         # Maybe derive from admin?
         if 'admin_name' in info:
             info['name'] = f"{info['admin_name']}的工作站"
    
    # Specific fix for "lx" station which has irregular format
    if "lianxiao@lx" in full_text:
        info['name'] = "lx (宵站)"
        if not info.get('cpu_info'):
            info['cpu_info'] = "AMD EPYC 7T83 64-Core"
        if not info.get('memory_gb'):
            # The file text actually has empty Memory value for this one in some lines, but check if we can find it
            pass
            
    return info

def import_workstations():
    print("--- Importing Workstations ---")
    file_path = "硬件信息.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by double newlines or similar delimiters to get blocks
    # Looking at the file, entries seem separated by multiple newlines
    blocks = re.split(r'\n\s*\n\s*\n', content) 
    # Also try splitting by "位置" if blocks are not clean
    if len(blocks) < 5:
        # Fallback split strategy
        blocks = re.split(r'\n(?=位置|地点|集群)', content)

    with Session(engine) as session:
        existing_ws = session.exec(select(Workstation)).all()
        existing_ids = {w.name for w in existing_ws} # Use Name as logical ID for now
        
        count = 0
        for block in blocks:
            if not block.strip():
                continue
                
            info = parse_workstation_block(block)
            if not info:
                continue
                
            name = info.get('name')
            if not name or name == "Unknown":
                continue
                
            if name in existing_ids:
                continue
                
            ws = Workstation(
                name=name,
                room=info.get('room', 'Unknown'),
                cpu_info=info.get('cpu_info'),
                memory_gb=info.get('memory_gb'),
                os_info=info.get('os_info'),
                admin_name=info.get('admin_name')
            )
            session.add(ws)
            count += 1
            existing_ids.add(name)
            
        session.commit()
        print(f"Imported {count} new workstations.")

def main():
    create_db_and_tables()
    import_users()
    import_workstations()

if __name__ == "__main__":
    main()
