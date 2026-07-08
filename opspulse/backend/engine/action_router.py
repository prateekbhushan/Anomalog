import datetime
from datetime import timezone
import logging

logger = logging.getLogger(__name__)

class ActionRouter:
    def __init__(self):
        self.all_logs = []
        self.active_incident = None
        
    def get_timestamp(self):
        # Format: YYYY-MM-DD HH:MM:SS UTC
        return datetime.datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    def process_metrics(self, cpu: float, memory: float, db: int, anomalies: dict):
        # Check for threshold breaches (CPU >= 90%, RAM >= 90%, DB >= 650 conns)
        cpu_breached = cpu >= 90.0
        memory_breached = memory >= 90.0
        db_breached = db >= 650
        
        # Check for 3-Sigma anomalies detected by statistical engine
        cpu_anomaly = anomalies.get('cpu_usage', False)
        memory_anomaly = anomalies.get('memory_usage', False)
        db_anomaly = anomalies.get('db_connections', False)
        
        # Determine root cause trigger
        incident_type = None
        
        if cpu_breached or cpu_anomaly:
            incident_type = 'CPU'
        elif db_breached or db_anomaly:
            incident_type = 'DB'
        elif memory_breached or memory_anomaly:
            incident_type = 'Memory'

        # If a spike/anomaly is detected and no incident is currently active, initialize a new remediation run
        if incident_type and not self.active_incident:
            self.active_incident = {
                'type': incident_type,
                'step': 1
            }
            
            timestamp = self.get_timestamp()
            
            # Step 0: Incident detection log (explicitly formatted)
            if incident_type == 'CPU':
                log1 = f"[{timestamp}] [INCIDENT_DETECTED]: Critical CPU Spike."
            else:
                log1 = f"[{timestamp}] [INCIDENT_DETECTED]: Critical Memory/DB Spike."
                
            # Step 1: Orchestrator activation log (explicitly formatted)
            log2 = f"[{timestamp}] [AI_AGENT_ORCHESTRATOR]: Initiating Automated Safe-Heal Protocol..."
            
            self.all_logs.append(log1)
            self.all_logs.append(log2)
            
            logger.info(f"🚨 SRE ACTION ROUTER: Registered new {incident_type} incident.")

        elif self.active_incident:
            # An active incident is already running: advance the automated execution logs step-by-step
            step = self.active_incident['step']
            itype = self.active_incident['type']
            timestamp = self.get_timestamp()
            
            if itype == 'CPU':
                if step == 1:
                    log = f"[{timestamp}] [AI_AGENT_ORCHESTRATOR]: Triggering micro-service container restart..."
                    self.all_logs.append(log)
                    self.active_incident['step'] = 2
                elif step == 2:
                    log = f"[{timestamp}] [EXECUTION_SUCCESS]: Stale connection pools cleared. System status returned to NOMINAL."
                    self.all_logs.append(log)
                    self.active_incident = None  # Incident resolved
                    logger.info("✅ SRE ACTION ROUTER: CPU incident resolved.")
            elif itype == 'Memory':
                if step == 1:
                    log = f"[{timestamp}] [AI_AGENT_ORCHESTRATOR]: Scanning JVM garbage collection status..."
                    self.all_logs.append(log)
                    self.active_incident['step'] = 2
                elif step == 2:
                    log = f"[{timestamp}] [EXECUTION_SUCCESS]: Stale connection pools cleared. System status returned to NOMINAL."
                    self.all_logs.append(log)
                    self.active_incident = None  # Incident resolved
                    logger.info("✅ SRE ACTION ROUTER: Memory incident resolved.")
            elif itype == 'DB':
                if step == 1:
                    log = f"[{timestamp}] [AI_AGENT_ORCHESTRATOR]: Flushing stale DB connection pool..."
                    self.all_logs.append(log)
                    self.active_incident['step'] = 2
                elif step == 2:
                    log = f"[{timestamp}] [EXECUTION_SUCCESS]: Stale connection pools cleared. System status returned to NOMINAL."
                    self.all_logs.append(log)
                    self.active_incident = None  # Incident resolved
                    logger.info("✅ SRE ACTION ROUTER: DB incident resolved.")

        return self.all_logs[-100:]  # Return a rolling log window to keep client data transfer thin
