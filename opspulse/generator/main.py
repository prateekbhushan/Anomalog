import asyncio
import json
import logging
import time
from datetime import datetime, timezone
import numpy as np
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Redis configuration
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_STREAM = 'metrics_stream'

async def generate_metrics():
    """Simulates high-velocity system metrics using random walks and sine waves."""
    pool = redis.ConnectionPool(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
    r = redis.Redis(connection_pool=pool)

    logger.info("Connected to Redis. Starting telemetry generation...")

    # Base values
    cpu_base = 30.0
    mem_base = 40.0
    db_base = 50

    try:
        t = 0
        while True:
            t += 1
            # Add seasonality and random noise
            cpu_val = cpu_base + 10 * np.sin(t * 0.1) + np.random.normal(0, 5)
            mem_val = mem_base + 5 * np.cos(t * 0.05) + np.random.normal(0, 2)
            
            # Simulate occasional massive spikes (1 in 100 chance)
            if np.random.rand() < 0.01:
                cpu_val += np.random.uniform(30, 50)
                db_base += 100
            
            # Decay DB connections slowly back to 50
            if db_base > 50:
                db_base -= 5
                
            db_val = db_base + int(np.random.normal(0, 5))

            # Clamp values
            cpu_usage = max(0.0, min(100.0, float(cpu_val)))
            mem_usage = max(0.0, min(100.0, float(mem_val)))
            db_connections = max(0, int(db_val))

            metric_payload = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'cpu_usage': round(cpu_usage, 2),
                'memory_usage': round(mem_usage, 2),
                'db_connections': db_connections
            }

            # Push to Redis Stream
            await r.xadd(REDIS_STREAM, metric_payload)
            
            # Print occasionally so we know it's alive
            if t % 50 == 0:
                logger.info(f"Generated 50 metrics. Current CPU: {cpu_usage:.1f}%")

            # High velocity: 100ms
            await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        logger.info("Telemetry generation stopped.")
    except Exception as e:
        logger.error(f"Error generating metrics: {e}")
    finally:
        await r.close()

if __name__ == "__main__":
    try:
        asyncio.run(generate_metrics())
    except KeyboardInterrupt:
        logger.info("Shutting down generator.")
