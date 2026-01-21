from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import create_db_and_tables
from .scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    start_scheduler()
    yield

app = FastAPI(lifespan=lifespan, title="Iron Workstation API")

from .routers import users, auth, workstations, reservations, admin, availability
app.include_router(users.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(workstations.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(availability.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Iron Workstation Reservation System"}
