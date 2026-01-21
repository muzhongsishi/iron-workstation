import requests
import json

# ================= 配置区域 =================
# 您的 Hugging Face 后端地址 (注意末尾没有 /)
API_BASE_URL = "https://muzhongsishi-iron-workstation.hf.space"

# 要添加的学生列表
USERS = [
    {"name": "Student A", "grade": "Grade 10", "email": "studentA@example.com"},
    {"name": "Student B", "grade": "Grade 10", "email": "studentB@example.com"},
    {"name": "Student C", "grade": "Grade 11", "email": "studentC@example.com"},
    {"name": "Student D", "grade": "Grade 11", "email": "studentD@example.com"},
    {"name": "Student E", "grade": "Grade 12", "email": "studentE@example.com"},
    # 在这里添加更多...
]
# ==========================================

def add_user(user):
    url = f"{API_BASE_URL}/api/admin/users/add"
    try:
        print(f"Adding user: {user['name']}...", end=" ")
        resp = requests.post(url, json=user, headers={"Content-Type": "application/json"})
        if resp.status_code == 200 or resp.status_code == 201:
            data = resp.json()
            if data.get("success"):
                print("✅ Success")
            else:
                print(f"❌ Failed: {data.get('message')}")
        else:
            print(f"❌ HTTP Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    print(f"Target API: {API_BASE_URL}")
    print(f"Total Users to add: {len(USERS)}")
    print("-" * 30)
    
    for user in USERS:
        add_user(user)
        
    print("-" * 30)
    print("Done. Please refresh your Admin Panel.")
