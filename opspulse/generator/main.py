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

    # Base values and parameters for ARMA(1, 1) and drift
    cpu_base = 30.0
    mem_base = 40.0
    db_base = 50.0

    # ARMA(1, 1) noise process memory terms
    cpu_noise = 0.0
    cpu_eps_prev = 0.0
    
    mem_noise = 0.0
    mem_eps_prev = 0.0
    
    db_noise = 0.0
    db_eps_prev = 0.0

    # Anomaly Engine state
    in_anomaly = False
    anomaly_step = 0
    anomaly_duration = 0
    
    # Initialize dynamic cycle targets (next anomaly in 20-30 cycles)
    cycles_since_anomaly = 0
    next_anomaly_target = np.random.randint(20, 31)

    try:
        t = 0
        while True:
            t += 1

            # Check if we should trigger an anomaly
            if not in_anomaly:
                cycles_since_anomaly += 1
                if cycles_since_anomaly >= next_anomaly_target:
                    in_anomaly = True
                    anomaly_step = 0
                    anomaly_duration = np.random.randint(4, 6) # lasts 4 to 5 steps

            # Generate normal ARMA(1, 1) component
            # White noise generation
            cpu_eps = np.random.normal(0, 2.0)
            mem_eps = np.random.normal(0, 0.4)
            db_eps = np.random.normal(0, 2.5)

            # ARMA(1, 1) updates:
            # X_t = phi * X_{t-1} + eps_t + theta * eps_{t-1}
            cpu_noise = 0.92 * cpu_noise + cpu_eps - 0.3 * cpu_eps_prev
            cpu_eps_prev = cpu_eps

            mem_noise = 0.98 * mem_noise + mem_eps - 0.2 * mem_eps_prev
            mem_eps_prev = mem_eps

            db_noise = 0.85 * db_noise + db_eps - 0.4 * db_eps_prev
            db_eps_prev = db_eps

            # Seasonality and Server Spin-Up Curve
            spin_up_factor = 1.0 - np.exp(-t / 30.0)
            
            cpu_seasonality = 10.0 * np.sin(t * 0.05) + 3.0 * np.cos(t * 0.12)
            mem_seasonality = 4.0 * np.cos(t * 0.01)
            db_seasonality = 15.0 * np.sin(t * 0.05)

            normal_cpu = (cpu_base + cpu_seasonality) * spin_up_factor + cpu_noise
            normal_mem = (mem_base + mem_seasonality) * spin_up_factor + mem_noise
            normal_db = (db_base + db_seasonality) * spin_up_factor + db_noise

            if in_anomaly:
                # Anomaly event triggered: exponential decay from peak to normal
                # Decay multipliers
                i_cpu = 0.35 ** anomaly_step
                i_db = 0.50 ** anomaly_step
                i_mem = 0.70 ** anomaly_step

                # Peak targets
                target_cpu = 96.0 + np.random.normal(0, 0.5)
                target_db = 750
                target_mem = 92.0 + np.random.normal(0, 0.2)

                # Blended values
                cpu_val = normal_cpu * (1.0 - i_cpu) + target_cpu * i_cpu
                mem_val = normal_mem * (1.0 - i_mem) + target_mem * i_mem
                db_val = normal_db * (1.0 - i_db) + target_db * i_db

                anomaly_step += 1
                if anomaly_step >= anomaly_duration:
                    in_anomaly = False
                    cycles_since_anomaly = 0
                    next_anomaly_target = np.random.randint(20, 31)
            else:
                cpu_val = normal_cpu
                mem_val = normal_mem
                db_val = normal_db

            # Clamping to valid physical ranges
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
