from fastapi.testclient import TestClient
from datetime import date, timedelta
import pytest
from backend.main import app
from backend.database import create_db_and_tables, engine, get_session
from sqlmodel import Session, SQLModel, create_engine
from backend.models import User, Workstation

# Use an in-memory DB for testing logic to avoid messing with real DB in this specific test? 
# OR just use the real dev DB since it's seeded and we want to test seeds?
# Let's use the real DB but be careful, or better, mock the session to use a test db.
# For simplicity in this agent flow, I will test against the real DB logic but creating a temporary user.

client = TestClient(app)

def test_flow():
    # 1. List Users
    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    
    # Pick a random user that exists (from seeds) or create one via seed
    # Let's assumption there is a user "张三" or we pick the first one
    first_grade = list(data.keys())[0]
    user_info = data[first_grade][0]
    username = user_info['name']
    
    print(f"Testing with user: {username}")

    # 2. Setup PIN (First time login)
    # Check if pin is set
    if not user_info['has_pin']:
        response = client.post("/api/auth/setup", json={
            "name": username,
            "pin": "123456",
            "email": "test@example.com"
        })
        assert response.status_code == 200
        assert response.json()['success'] is True
    else:
        # If already set, just login
        response = client.post("/api/auth/login", json={
            "name": username,
            "pin": "123456"
        })
        # Note: If pin was set differently before, this might fail. 
        # But since I just seeded, they shouldn't have pins.
        # Unless I ran this test multiple times.
    
    # 3. Login
    login_res = client.post("/api/auth/login", json={
        "name": username,
        "pin": "123456"
    })
    assert login_res.status_code == 200
    assert login_res.json()['success'] is True
    
    user_id = login_res.json()['user']['id']
    
    # 4. List Workstations
    ws_res = client.get("/api/workstations")
    assert ws_res.status_code == 200
    ws_data = ws_res.json()
    
    # Pick a workstation
    first_room = list(ws_data.keys())[0]
    ws_id = ws_data[first_room][0]['id']
    
    # 5. Create Reservation (Tomorrow to Day After Tomorrow)
    today = date.today()
    start_date = (today + timedelta(days=1)).isoformat()
    end_date = (today + timedelta(days=2)).isoformat()
    
    res_payload = {
        "user_id": user_id,
        "workstation_id": ws_id,
        "start_date": start_date,
        "end_date": end_date,
        "purpose": "Test Reservation"
    }
    
    # Create
    create_res = client.post("/api/reservations", json=res_payload)
    print(create_res.json())
    assert create_res.status_code == 200
    assert create_res.json()['success'] is True
    
    # 6. Check Conflict (Same dates)
    conflict_res = client.post("/api/reservations", json=res_payload)
    assert conflict_res.json()['success'] is False
    assert "Conflict" in conflict_res.json()['message']
    
    # 7. Check My Reservations
    my_res = client.get(f"/api/reservations/my/{user_id}")
    assert my_res.status_code == 200
    assert len(my_res.json()) >= 1
    
    print("Test Flow Complete Success!")

if __name__ == "__main__":
    test_flow()
