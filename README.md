# AnomaLog // Predictive Telemetry & Observability Platform

AnomaLog is a high-velocity, asynchronous telemetry ingestion pipeline and real-time observability platform. Built using a decoupled event-driven architecture, it processes continuous system metrics, detects statistical anomalies using z-score drift models, and projects future resource allocation paths utilizing Autoregressive Exponential Smoothing.

The front-end renders telemetry streams via a premium, cyberpunk-inspired glassmorphic console, locked at a hardware-accelerated 60 FPS.

---

## 🛠️ System Architecture

- **Ingestion & Buffer Layer:** Python-based simulation daemon piping live data packets sequentially to an in-memory **Redis Stream**.
- **Processing Backend:** FastAsynchronous API infrastructure powered by **FastAPI** utilizing a micro-batching persistence engine.
- **Time-Series Storage:** **TimescaleDB** (PostgreSQL extension optimized for fast analytics and time-series scale).
- **Forecasting & Statistical Modeling:** Embedded ML engine using `statsmodels` for computing prediction horizons and $3-\sigma$ (Sigma) standard deviations for active real-time anomalies.
- **Telemetry UI:** **Next.js** rendering ultra-low latency real-time data waves using **uPlot** canvas bindings.

---

## 🚀 Core Features

- **60 FPS High-Fidelity Rendering:** Bypasses standard DOM bloat by rendering dynamic streams directly onto HTML5 canvas using hardware acceleration (`transform: translateZ(0)`).
- **Real-Time 3-Sigma Glow Triggers:** Instantly triggers an active neon red visual indicator when backend z-scores pass threshold drift bounds ($> 3.0$) across CPU, Memory, or DB metrics.
- **Confidence Interval Horizons:** uPlot visual forecast zones displaying statistical boundaries alongside standard forecast projections.
- **Resilient Pipeline Setup:** Multi-threaded decoupled daemon tracking independent telemetry vectors without locking main application lifespans.

---

## 💻 Technical Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### Spin Up Protocol (Sequential Execution)

Open 4 separate terminal windows and run the following commands in sequence:

#### Terminal 1: Infrastructure Layer (Docker Compose)
Initialize the container stacks cleanly:
```bash
docker-compose down && docker-compose up -d
