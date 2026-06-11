import redis.asyncio as redis
import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_STREAM = 'metrics_stream'

# Global redis connection pool
redis_pool = None

async def init_redis():
    global redis_pool
    redis_pool = redis.ConnectionPool(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

async def close_redis():
    if redis_pool:
        await redis_pool.disconnect()

def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=redis_pool)
