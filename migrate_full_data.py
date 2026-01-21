import sqlite3
import requests
import json
import time

# ================= 配置 =================
LOCAL_DB_PATH = "database.db"
REMOTE_API_BASE = "https://muzhongsishi-iron-workstation.hf.space"
# =======================================

def get_local_data(table_name):
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def migrate():
    print(f"🚀 Starting Migration to {REMOTE_API_BASE}")
    print("Ensure your local database.db is in the same folder.")
    print("-" * 40)

    # 1. Migrate Users
    print("\n📦 Migrating Users...")
    users = get_local_data("user")
    user_id_map = {} # old_id -> new_id

    for u in users:
        # Admin is usually pre-created or handled specially
        if u['name'] == 'admin':
            print(f"  Start Skipping admin (Built-in)...")
            # Assuming remote admin has ID 0 or we don't map it for reservations usually? 
            # Actually admin reservations might exist.
            # Let's assume admin on remote is ID 0 or found by name.
            # For simplicity, we skip creating admin but we need to map if admin made reservations.
            continue

        payload = {
            "name": u['name'],
            "grade": u['grade'],
            "email": u['email']
        }
        
        try:
            # Check if exists first or just add? add_user handles duplicate check
            resp = requests.post(f"{REMOTE_API_BASE}/api/admin/users/add", json=payload)
            if resp.status_code in [200, 201]:
                res_data = resp.json()
                if res_data.get("success"):
                    new_id = res_data['user']['id']
                    user_id_map[u['id']] = new_id
                    print(f"  ✅ User {u['name']}: Mapped {u['id']} -> {new_id}")
                else:
                    print(f"  ⚠️  User {u['name']} Skipped: {res_data.get('message')}")
                    # If user exists, we need to find their ID to map? 
                    # Complex. For now assume empty DB.
            else:
                print(f"  ❌ Error {u['name']}: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ Exception: {e}")

    # 2. Migrate Workstations
    print("\n📦 Migrating Workstations...")
    workstations = get_local_data("workstation")
    ws_id_map = {}

    for w in workstations:
        payload = {
            "name": w['name'],
            "room": w['room'],
            "admin_name": w['admin_name'] or "Unknown",
            "cpu_info": w['cpu_info'] or "Unknown",
            "core_count": w['core_count'] or "Unknown",
            "memory_gb": w['memory_gb'] or 16,
            "os_info": w['os_info'] or "Windows"
        }
        
        try:
            resp = requests.post(f"{REMOTE_API_BASE}/api/admin/workstations/add", json=payload)
            if resp.status_code in [200, 201]:
                res_data = resp.json()
                if res_data.get("success"):
                    new_id = res_data['workstation']['id']
                    ws_id_map[w['id']] = new_id
                    print(f"  ✅ WS {w['name']}: Mapped {w['id']} -> {new_id}")
                else:
                    print(f"  ⚠️  WS {w['name']} Skipped: {res_data.get('message')}")
            else:
                print(f"  ❌ Error {w['name']}: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ Exception: {e}")

    # 3. Migrate Reservations
    print("\n📦 Migrating Reservations...")
    reservations = get_local_data("reservation")
    
    for r in reservations:
        if r['status'] != 'active':
            continue # Only migrate active
            
        old_uid = r['user_id']
        old_wid = r['workstation_id']
        
        new_uid = user_id_map.get(old_uid)
        new_wid = ws_id_map.get(old_wid)
        
        if not new_uid or not new_wid:
            print(f"  ⚠️  Skipping Reservation {r['id']}: Missing map (User:{old_uid}->{new_uid}, WS:{old_wid}->{new_wid})")
            continue
            
        payload = {
            "workstation_id": new_wid,
            "user_id": new_uid,
            "start_date": r['start_date'],
            "end_date": r['end_date'],
            "purpose": r['purpose'] or "Migrated",
            "force": True # Force to bypass conflicts during migration
        }
        
        try:
            resp = requests.post(f"{REMOTE_API_BASE}/api/admin/reservations", json=payload)
            if resp.status_code in [200, 201]:
                res_data = resp.json()
                if res_data.get("success"):
                     print(f"  ✅ Res {r['start_date']}~{r['end_date']}: Imported")
                else:
                    print(f"  ❌ Failed: {res_data.get('message')}")
            else:
                 print(f"  ❌ HTTP Error: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ Exception: {e}")

    print("-" * 40)
    print("Migration Complete!")

if __name__ == "__main__":
    migrate()
