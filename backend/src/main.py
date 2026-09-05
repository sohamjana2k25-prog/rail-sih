from fastapi import FastAPI
from src.routers.telemetry import router as telemetry_router

app = FastAPI(title="RailSync Prototype - Telemetry")

app.include_router(telemetry_router)
