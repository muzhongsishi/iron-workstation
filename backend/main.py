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

from fastapi.middleware.cors import CORSMiddleware

# Enable CORS for Hybrid Deployment (Cloudflare Frontend -> Home Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Security Note: restrict this in production if domain is known
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import users, auth, workstations, reservations, admin, availability
app.include_router(users.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(workstations.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(availability.router, prefix="/api")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# ... routes ...

# Mount static files (Frontend Build)
# Check if frontend/dist exists (Production Mode)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API requests are already handled above by include_router
        # If file exists in dist, serve it (e.g. vite.svg)
        potential_file = os.path.join(frontend_dist, full_path)
        if os.path.isfile(potential_file):
            return FileResponse(potential_file)
            
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(frontend_dist, "index.html"))

@app.get("/")
def read_root():
    # If dist exists, serve index.html
    if os.path.exists(frontend_dist):
         return FileResponse(os.path.join(frontend_dist, "index.html"))
    return {"message": "Welcome to Iron Workstation API (Frontend not built)"}
