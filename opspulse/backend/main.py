import asyncio
import logging
import random
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from engine.forecaster import ResourceForecaster

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

# Global state for computation
history_buffer = []
MAX_HISTORY = 100
forecast_counter = 0

latest_forecasts = {
    'cpu_usage': {"values": [], "lower": [], "upper": []},
    'memory_usage': {"values": [], "lower": [], "upper": []},
    'db_connections': {"values": [], "lower": [], "upper": []}
}

forecaster = ResourceForecaster()

# Direct Background Engine: Broadcasts mock data every 1 second directly to synced sockets
async def start_force_telemetry_broadcast():
    global history_buffer, forecast_counter, latest_forecasts
    logger.info("🚀 BYPASS ENGINE: Direct telemetry loop active...")
    t = 0
    while True:
        try:
            await asyncio.sleep(1) # Frequency locked to 1Hz
            t += 1

            # Simulate periodic spikes of varying severity
            cpu_spike = False
            cpu_spike_val = 0.0
            if (t // 30) % 3 == 0 and (t % 30 < 5): # Warning CPU spike
                cpu_spike = True
                cpu_spike_val = random.uniform(62.0, 72.0)
            elif (t // 30) % 3 == 1 and (t % 30 < 5): # Critical CPU spike
                cpu_spike = True
                cpu_spike_val = random.uniform(76.0, 86.0)
            elif (t // 30) % 3 == 2 and (t % 30 < 5): # Danger CPU spike
                cpu_spike = True
                cpu_spike_val = random.uniform(91.0, 98.0)

            mem_spike = False
            mem_spike_val = 0.0
            if (t // 45) % 3 == 0 and (t % 45 < 5): # Warning Memory spike
                mem_spike = True
                mem_spike_val = random.uniform(62.0, 72.0)
            elif (t // 45) % 3 == 1 and (t % 45 < 5): # Critical Memory spike
                mem_spike = True
                mem_spike_val = random.uniform(76.0, 85.0)
            elif (t // 45) % 3 == 2 and (t % 45 < 5): # Danger Memory spike
                mem_spike = True
                mem_spike_val = random.uniform(91.0, 97.0)

            db_spike = False
            db_spike_val = 0
            if (t // 60) % 3 == 0 and (t % 60 < 5): # Warning DB spike
                db_spike = True
                db_spike_val = random.randint(280, 360)
            elif (t // 60) % 3 == 1 and (t % 60 < 5): # Critical DB spike
                db_spike = True
                db_spike_val = random.randint(480, 560)
            elif (t // 60) % 3 == 2 and (t % 60 < 5): # Danger DB spike
                db_spike = True
                db_spike_val = random.randint(670, 760)

            # Define base values or spiked values
            if cpu_spike:
                cpu = round(cpu_spike_val, 2)
            else:
                cpu = round(random.uniform(20.0, 45.0), 2)

            if mem_spike:
                mem = round(mem_spike_val, 2)
            else:
                mem = round(random.uniform(35.0, 55.0), 2)

            if db_spike:
                db = db_spike_val
            else:
                db = random.randint(15, 45)

            current_point = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cpu_usage": cpu,
                "memory_usage": mem,
                "db_connections": db
            }

            # Add to local rolling history
            history_buffer.append(current_point)
            if len(history_buffer) > MAX_HISTORY:
                history_buffer.pop(0)

            # Anomaly Detection: 3-Sigma mathematical drift check
            anomalies = {
                'cpu_usage': False,
                'memory_usage': False,
                'db_connections': False
            }
            alerts = []

            if len(history_buffer) >= 15:
                for key in ['cpu_usage', 'memory_usage', 'db_connections']:
                    vals = [h[key] for h in history_buffer]
                    mean = sum(vals) / len(vals)
                    variance = sum((v - mean) ** 2 for v in vals) / len(vals)
                    std = variance ** 0.5
                    
                    val = current_point[key]
                    if std > 0.1:
                        z_score = abs(val - mean) / std
                        if z_score > 3.0:
                            anomalies[key] = True
                            alerts.append({
                                'metric': key,
                                'message': f"3σ Drift: {key.replace('_', ' ').title()} spiked to {val:.1f} (μ: {mean:.1f}, σ: {std:.1f})",
                                'timestamp': datetime.now(timezone.utc).isoformat()
                            })

            # Rolling Autoregressive Forecast: run every 20 ticks
            forecast_counter += 1
            if forecast_counter >= 20 and len(history_buffer) >= 20:
                forecast_counter = 0
                for key in ['cpu_usage', 'memory_usage', 'db_connections']:
                    vals = [h[key] for h in history_buffer]
                    try:
                        latest_forecasts[key] = forecaster.forecast(vals, 15)
                    except Exception as e:
                        logger.error(f"Error forecasting {key}: {e}")

            # Package payload
            payload = {
                **current_point,
                'anomalies': anomalies,
                'alerts': alerts,
                'predictions': latest_forecasts
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
        # Send current history_buffer and latest_forecasts immediately on connection
        if history_buffer:
            initial_payload = {
                "type": "history",
                "data": history_buffer,
                "alerts": [],
                "predictions": latest_forecasts
            }
            await websocket.send_text(json.dumps(initial_payload))
            
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