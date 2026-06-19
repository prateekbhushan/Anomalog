import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, Float, DateTime, text
from datetime import datetime, timezone

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
DB_NAME = os.getenv("DB_NAME", "anomalog")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_timeout=10,
    pool_recycle=3600
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

Base = declarative_base()

class Metric(Base):
    __tablename__ = "metrics"
    
    # We use a composite primary key or just standard timescaledb conventions
    # Timescale hypertables often don't strictly require an artificial primary key if 'timestamp' is used.
    # To keep SQLAlchemy happy and avoid complex primary key scenarios with chunking, 
    # we'll just have timestamp + id.
    timestamp = Column(DateTime(timezone=True), primary_key=True, default=lambda: datetime.now(timezone.utc))
    id = Column(Integer, primary_key=True, autoincrement=True)
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    db_connections = Column(Integer)

async def init_db():
    import traceback
    import sys
    print("Database init: Starting initialization sequence...", flush=True)
    try:
        print(f"Database init: Attempting to connect to TimescaleDB at {DB_HOST}:{DB_PORT}...", flush=True)
        # Create tables
        async with engine.begin() as conn:
            print("Database init: Connection established. Creating extension and tables if not exist...", flush=True)
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            await conn.run_sync(Base.metadata.create_all)
            print("Database init: Extension and tables verified/created.", flush=True)
            
            # Turn it into a hypertable
            try:
                print("Database init: Transforming 'metrics' table into a TimescaleDB hypertable...", flush=True)
                await conn.execute(text("SELECT create_hypertable('metrics', 'timestamp', if_not_exists => TRUE);"))
                print("Database init: Hypertable transformation completed successfully.", flush=True)
            except Exception as e:
                print(f"Database init Warning: Hypertable creation note: {e}", flush=True)
                traceback.print_exc(file=sys.stdout)
    except Exception as e:
        print("Database init ERROR: Failed during init_db operation!", flush=True)
        traceback.print_exc(file=sys.stdout)
        raise e
