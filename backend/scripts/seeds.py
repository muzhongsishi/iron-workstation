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
    
    # Position/Location & Standardize Room Name
    room_match = re.search(r'(位置|地点|地点：|补录)\s*[:：]?\s*(?P<val>.*)', full_text)
    raw_room = ""
    if room_match:
        raw_room = room_match.group('val').strip()
    else:
        raw_room = lines[0] if lines else ""
        
    if "401" in raw_room or "401" in full_text:
        info['room'] = "401"
    elif "310" in raw_room or "310" in full_text:
        info['room'] = "310"
    elif "201" in raw_room or "201" in full_text:
        info['room'] = "201"
    elif "106" in raw_room or "106" in full_text:
        info['room'] = "106"
    elif "109" in raw_room or "109" in full_text:
        info['room'] = "109"
    elif "113" in raw_room or "113" in full_text:
        info['room'] = "113"
    elif "工程中心" in raw_room or "工程中心" in full_text:
        info['room'] = "工程中心"
    elif "集群" in raw_room or "集群" in full_text:
        info['room'] = "集群小屋"
    else:
        info['room'] = "Unknown"
            
    # Admin/User
    admin_match = re.search(r'(管理员|负责人|使用人)\s*[:：]?\s*(?P<val>.*)', full_text)
    if admin_match:
        # Extract name and clean any host suffix
        val = admin_match.group('val').strip()
        name_only_match = re.split(r'【主机名】', val)
        info['admin_name'] = name_only_match[0].strip().replace(":", "").replace("：", "")
    else:
        # Fallback for 'lx' cluster which has non-standard admin
        if "管理员：张少谦" in full_text:
            info['admin_name'] = "张少谦"

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
         if 'admin_name' in info:
             info['name'] = f"{info['admin_name']}的工作站"
    
    # Specific fix for "lx" station which has irregular format
    if "lianxiao@lx" in full_text or "宵站" in full_text:
        info['name'] = "lx (宵站)"
        info['room'] = "集群小屋"
        info['admin_name'] = "张少谦"
        info['cpu_info'] = "AMD EPYC 7T83 64-Core Processor"
        info['memory_gb'] = 256 # 补充缺少的内存值以展示

    return info

def import_workstations():
    print("--- Importing Workstations ---")
    file_path = "硬件信息.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Precise chunk split by newline followed by X号
    blocks = re.split(r'\n(?=\d+号)', content)

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
                
            ws_type = "cluster" if "集群" in name else "workstation"
            ws = Workstation(
                name=name,
                room=info.get('room', 'Unknown'),
                cpu_info=info.get('cpu_info'),
                memory_gb=info.get('memory_gb'),
                os_info=info.get('os_info'),
                admin_name=info.get('admin_name'),
                type=ws_type
            )
            session.add(ws)
            count += 1
            existing_ids.add(name)
            
        session.commit()
        print(f"Imported {count} new workstations.")

def import_laptops():
    print("--- Importing Laptops ---")
    laptops = [
        {"name": "联想小新new", "room": "公用笔记本", "cpu_info": "Intel i7 笔记本处理器", "memory_gb": 16, "os_info": "Windows 11", "admin_name": "关豪", "type": "laptop"},
        {"name": "联想小新old", "room": "公用笔记本", "cpu_info": "Intel i5 笔记本处理器", "memory_gb": 8, "os_info": "Windows 10", "admin_name": "admin", "type": "laptop"},
        {"name": "厚dell", "room": "公用笔记本", "cpu_info": "Intel i5 笔记本处理器", "memory_gb": 16, "os_info": "Windows 10", "admin_name": "admin", "type": "laptop"},
        {"name": "新Thinkpad-王志刚", "room": "公用笔记本", "cpu_info": "Intel i7 笔记本处理器", "memory_gb": 32, "os_info": "Windows 11", "admin_name": "王志刚", "type": "laptop"},
        {"name": "小dell", "room": "公用笔记本", "cpu_info": "Intel i5 笔记本处理器", "memory_gb": 16, "os_info": "Windows 11", "admin_name": "admin", "type": "laptop"}
    ]
    with Session(engine) as session:
        count = 0
        for lp in laptops:
            exists = session.exec(select(Workstation).where(Workstation.name == lp["name"])).first()
            if not exists:
                ws = Workstation(**lp)
                session.add(ws)
                count += 1
        session.commit()
        print(f"Imported {count} new laptops.")

def main():
    create_db_and_tables()
    import_users()
    import_workstations()
    import_laptops()

if __name__ == "__main__":
    main()
