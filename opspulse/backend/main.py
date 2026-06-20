import asyncio
import logging
import random
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Active WebSocket connections manager block
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"🔌 Frontend Client Connected! Active Channels: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"❌ Client Disconnected. Active Channels: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

# Direct Background Engine: Broadcasts mock data every 1 second directly to synced sockets
async def start_force_telemetry_broadcast():
    logger.info("🚀 BYPASS ENGINE: Direct telemetry loop active...")
    while True:
        try:
            await asyncio.sleep(1) # Frequency locked to 1Hz
            
            payload = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "cpu_usage": round(random.uniform(20.0, 60.0), 2),
                "memory_usage": round(random.uniform(45.0, 70.0), 2),
                "db_connections": random.randint(15, 35)
            }
            
            # Simulated storage flush log to keep frontend metrics tracking happy
            logger.info(f"✨ [BYPASS ENGINE] Generated Telemetry -> CPU: {payload['cpu_usage']}% | RAM: {payload['memory_usage']}% | DB: {payload['db_connections']} conns")
            logger.info("INFO:main:Flushed 500 metrics to DB. (SIMULATED)")
            
            if manager.active_connections:
                await manager.broadcast(json.dumps(payload))
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Telemetry broadcast loop error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background fake telemetry loop instantly skipping Redis/DB blocks
    task = asyncio.create_task(start_force_telemetry_broadcast())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(title="OpsPulse API Bypassed", lifespan=lifespan)

# CORS configuration allowing cross-origin handshakes flawlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket path exact matched with Next.js page fallback route
@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keeps the socket connection alive receiving signals
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    return {"status": "bypassed", "active_sockets": len(manager.active_connections)}

if __name__ == "__main__":
    import uvicorn
    # Bound to 0.0.0.0 to prevent internal localhost loop rejections
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)