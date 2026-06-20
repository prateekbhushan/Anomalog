import asyncio
import logging
import random
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.websockets import router as websocket_router
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FAKE TELEMETRY INGESTION: Force metrics to terminal and broadcast directly without DB
async def force_mock_telemetry_loop():
    logger.info("🚀 TARGET BYPASS ACTIVE: Initializing dynamic mock stream loop...")
    while True:
        try:
            await asyncio.sleep(1) # Har 1 second mein mock data wave throw karega
            
            # Simulated Telemetry Data
            cpu = round(random.uniform(15.0, 65.0), 2)
            mem = round(random.uniform(40.0, 75.0), 2)
            db_conn = random.randint(12, 45)
            
            # Print loop logs loudly to confirm background thread activity
            logger.info(f"✨ [BYPASS ENGINE] Generated Telemetry -> CPU: {cpu}% | RAM: {mem}% | DB: {db_conn} conns")
            logger.info("INFO:main:Flushed 500 metrics to DB. (SIMULATED)")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Telemetry loop exception: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Completely skipped blocking init_db() and init_redis()
    logger.info("🚀 Starting up AnomaLog Backend with clean execution mode...")
    
    # Start the standalone metric push loop
    task_flush = asyncio.create_task(force_mock_telemetry_loop())
    
    yield
    
    logger.info("Shutting down bypass engine...")
    task_flush.cancel()

app = FastAPI(title="AnomaLog API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"status": "ok", "service": "OpsPulse API (Bypass Mode)"}

if __name__ == "__main__":
    import uvicorn
    # Localhost 127.0.0.1 grid sync logic lock
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)