import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.db import init_db, AsyncSessionLocal, Metric
from core.redis_client import init_redis, close_redis, get_redis, REDIS_STREAM
from api.websockets import router as websocket_router, stream_metrics
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Background task to flush metrics to TimescaleDB
async def flush_metrics_to_db():
    r = get_redis()
    last_id = '0'
    while True:
        try:
            # Flush every 5 seconds
            await asyncio.sleep(5)
            
            messages = await r.xread({REDIS_STREAM: last_id}, count=500)
            if messages:
                async with AsyncSessionLocal() as session:
                    total_flushed = 0
                    for stream_name, stream_messages in messages:
                        for message_id, message_data in stream_messages:
                            last_id = message_id
                            
                            # Parse timestamp properly
                            ts_str = message_data.get('timestamp')
                            if not ts_str:
                                continue
                            if ts_str.endswith('Z'):
                                ts_str = ts_str[:-1] + '+00:00'
                            
                            metric = Metric(
                                timestamp=datetime.fromisoformat(ts_str),
                                cpu_usage=float(message_data.get('cpu_usage', 0)),
                                memory_usage=float(message_data.get('memory_usage', 0)),
                                db_connections=int(message_data.get('db_connections', 0))
                            )
                            session.add(metric)
                            total_flushed += 1
                    
                    await session.commit()
                logger.info(f"Flushed {total_flushed} metrics to DB.")
                
                # Trim the stream to keep memory usage low (keep last 2000 items)
                await r.xtrim(REDIS_STREAM, maxlen=2000)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"DB Flush error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up AnomaLog Backend...")
    try:
        logger.info("Initializing database connection with a 12-second timeout guard...")
        await asyncio.wait_for(init_db(), timeout=12.0)
    except asyncio.TimeoutError:
        logger.error(
            "Database initialization TIMEOUT: Failed to initialize database within 12 seconds. "
            "Continuing startup without database initialization.",
            exc_info=True
        )
    except Exception as e:
        logger.error(
            f"Database initialization ERROR: Failed to initialize database ({e}). "
            "Continuing startup without database initialization.",
            exc_info=True
        )
    await init_redis()
    
    # Start background tasks
    task_stream = asyncio.create_task(stream_metrics())
    task_flush = asyncio.create_task(flush_metrics_to_db())
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    task_stream.cancel()
    task_flush.cancel()
    await close_redis()

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
    return {"status": "ok", "service": "OpsPulse API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# opspulse/backend/main.py ke bilkul niche yeh block hona chahiye:

if __name__ == "__main__":
    import uvicorn
    # Tumhaara consumer loop agar thread mein nahi hai, toh uvicorn start nahi ho pata.
    # Ensure karo ki uvicorn server explicitly port 8000 par launch ho:
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)