import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.redis_client import get_redis, REDIS_STREAM
from engine.anomaly_detector import AnomalyDetector
from engine.forecaster import ResourceForecaster

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")

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

# Background task to read from Redis stream and broadcast
async def stream_metrics():
    global history_buffer, forecast_counter, latest_forecasts
    r = get_redis()
    last_id = '0'  # Read from the beginning of the stream to populate history
    while True:
        try:
            # Block for up to 1 second waiting for new metrics
            messages = await r.xread({REDIS_STREAM: last_id}, count=100, block=1000)
            if messages:
                for stream_name, stream_messages in messages:
                    for message_id, message_data in stream_messages:
                        last_id = message_id
                        
                        # Parse metric values
                        try:
                            cpu = float(message_data.get('cpu_usage', 0))
                            mem = float(message_data.get('memory_usage', 0))
                            db = int(message_data.get('db_connections', 0))
                            ts = message_data.get('timestamp')
                        except Exception:
                            continue

                        current_point = {
                            'timestamp': ts,
                            'cpu_usage': cpu,
                            'memory_usage': mem,
                            'db_connections': db
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

                        # Rolling Autoregressive Forecast: run every 20 ticks (2 seconds)
                        forecast_counter += 1
                        if forecast_counter >= 20 and len(history_buffer) >= 20:
                            forecast_counter = 0
                            for key in ['cpu_usage', 'memory_usage', 'db_connections']:
                                vals = [h[key] for h in history_buffer]
                                latest_forecasts[key] = forecaster.forecast(vals, 15)

                        # Package payload
                        payload = {
                            **current_point,
                            'anomalies': anomalies,
                            'alerts': alerts,
                            'predictions': latest_forecasts
                        }

                        if manager.active_connections:
                            await manager.broadcast(json.dumps(payload))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error reading from Redis Stream: {e}")
            await asyncio.sleep(1)

@router.websocket("/ws")
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
            # Keep alive / listen for client messages
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

