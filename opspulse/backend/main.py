import math
import asyncio
import logging
import random
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from engine.forecaster import ResourceForecaster
from engine.action_router import ActionRouter

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

# Active WebSocket connections manager block
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
action_router = ActionRouter()

# Direct Background Engine: Broadcasts mock data every 1 second directly to synced sockets
async def start_force_telemetry_broadcast():
    global history_buffer, forecast_counter, latest_forecasts
    logger.info("🚀 BYPASS ENGINE: Direct telemetry loop active...")
    t = 0
    
    # State variables for ARMA(1, 1) and drift
    cpu_base = 30.0
    mem_base = 40.0
    db_base = 50.0

    cpu_noise = 0.0
    cpu_eps_prev = 0.0
    
    mem_noise = 0.0
    mem_eps_prev = 0.0
    
    db_noise = 0.0
    db_eps_prev = 0.0

    in_anomaly = False
    anomaly_step = 0
    anomaly_duration = 0
    
    cycles_since_anomaly = 0
    next_anomaly_target = random.randint(20, 30)

    while True:
        try:
            await asyncio.sleep(1) # Frequency locked to 1Hz
            t += 1

            # Check if we should trigger an anomaly
            if not in_anomaly:
                cycles_since_anomaly += 1
                if cycles_since_anomaly >= next_anomaly_target:
                    in_anomaly = True
                    anomaly_step = 0
                    anomaly_duration = random.randint(4, 5) # lasts 4 to 5 steps

            # Generate normal ARMA(1, 1) component
            # random.normalvariate yields Gaussian/normal distribution
            cpu_eps = random.normalvariate(0, 2.0)
            mem_eps = random.normalvariate(0, 0.4)
            db_eps = random.normalvariate(0, 2.5)

            cpu_noise = 0.92 * cpu_noise + cpu_eps - 0.3 * cpu_eps_prev
            cpu_eps_prev = cpu_eps

            mem_noise = 0.98 * mem_noise + mem_eps - 0.2 * mem_eps_prev
            mem_eps_prev = mem_eps

            db_noise = 0.85 * db_noise + db_eps - 0.4 * db_eps_prev
            db_eps_prev = db_eps

            # Seasonality and Server Spin-Up Curve
            spin_up_factor = 1.0 - math.exp(-t / 30.0)
            
            cpu_seasonality = 10.0 * math.sin(t * 0.05) + 3.0 * math.cos(t * 0.12)
            mem_seasonality = 4.0 * math.cos(t * 0.01)
            db_seasonality = 15.0 * math.sin(t * 0.05)

            normal_cpu = (cpu_base + cpu_seasonality) * spin_up_factor + cpu_noise
            normal_mem = (mem_base + mem_seasonality) * spin_up_factor + mem_noise
            normal_db = (db_base + db_seasonality) * spin_up_factor + db_noise

            if in_anomaly:
                # Anomaly event triggered: exponential decay from peak to normal
                i_cpu = 0.35 ** anomaly_step
                i_db = 0.50 ** anomaly_step
                i_mem = 0.70 ** anomaly_step

                # Peak targets
                target_cpu = 96.0 + random.normalvariate(0, 0.5)
                target_db = 750
                target_mem = 92.0 + random.normalvariate(0, 0.2)

                # Blended values
                cpu_val = normal_cpu * (1.0 - i_cpu) + target_cpu * i_cpu
                mem_val = normal_mem * (1.0 - i_mem) + target_mem * i_mem
                db_val = normal_db * (1.0 - i_db) + target_db * i_db

                anomaly_step += 1
                if anomaly_step >= anomaly_duration:
                    in_anomaly = False
                    cycles_since_anomaly = 0
                    next_anomaly_target = random.randint(20, 30)
            else:
                cpu_val = normal_cpu
                mem_val = normal_mem
                db_val = normal_db

            # Clamping
            cpu = round(max(0.0, min(100.0, cpu_val)), 2)
            mem = round(max(0.0, min(100.0, mem_val)), 2)
            db = max(0, int(db_val))

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

            # Run Automated Action Router to check anomalies/thresholds and simulate healing actions
            action_logs = action_router.process_metrics(cpu, mem, db, anomalies)

            # Package payload
            payload = {
                **current_point,
                'anomalies': anomalies,
                'alerts': alerts,
                'predictions': latest_forecasts,
                'action_logs': action_logs
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
                "predictions": latest_forecasts,
                "action_logs": action_router.all_logs
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