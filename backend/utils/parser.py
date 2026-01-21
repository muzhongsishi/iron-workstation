import re
from typing import Dict, Any, List

def parse_workstation_block(content: str) -> List[Dict[str, Any]]:
    """
    Parses a markdown string containing one or more workstation blocks.
    Format expected:
    ## 机器名
    - 参数: 值
    """
    workstations = []
    
    # Split by level 2 headers
    # Logic similar to seeds.py but adapted for string input
    lines = content.split('\n')
    current_ws = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("## ") or "【主机名】" in line:
            # Save previous
            if current_ws:
                workstations.append(current_ws)
            
            # Start new
            # Handle both "## Name" and "【主机名】：Name"
            clean_line = line.replace("## ", "").replace("【主机名】", "").replace("：", "").replace(":", "").strip()
            name = clean_line
            
            current_ws = {
                "name": name,
                "room": "Default Room",
                "cpu_info": "Unknown",
                "memory_gb": 0,
                "gpu_info": None,
                "admin_name": None
            }
        
        # Check for key-value pairs (supports -, *, or just Key: Value)
        # We need a more robust split for Chinese colon "："
        elif ":" in line or "：" in line:
            if not current_ws and not workstations:
                 # If no header found yet, maybe create a temp one or skip?
                 # ideally we wait for a name. But specific text format might have name later?
                 # implied format is Name first.
                 pass

            if not current_ws:
                 continue

            separator = "：" if "：" in line else ":"
            parts = line.split(separator, 1)
            
            if len(parts) == 2:
                # Clean key: remove - * 【 】
                raw_key = parts[0].strip()
                key = re.sub(r'[-*【】]', '', raw_key).strip().lower()
                val = parts[1].strip()
                
                if "cpu" in key:
                    current_ws["cpu_info"] = val
                elif "内存" in key or "memory" in key:
                    mem_match = re.search(r'\d+', val)
                    if mem_match:
                        current_ws["memory_gb"] = int(mem_match.group())
                elif "gpu" in key or "显卡" in key:
                    current_ws["gpu_info"] = val
                elif "管理员" in key or "admin" in key:
                    current_ws["admin_name"] = val
                elif "位置" in key or "room" in key or "location" in key:
                    current_ws["room"] = val
    
    # thorough put
    if current_ws:
        workstations.append(current_ws)
        
    return workstations
