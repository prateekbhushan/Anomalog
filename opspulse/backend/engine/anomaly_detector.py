import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self, contamination=0.05):
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.is_fitted = False

    def fit(self, data: list[dict]):
        """
        Fits the Isolation Forest on a list of metric dictionaries.
        Expects keys: 'cpu_usage', 'memory_usage', 'db_connections'
        """
        if len(data) < 10:
            return # Not enough data
            
        X = np.array([[d['cpu_usage'], d['memory_usage'], d['db_connections']] for d in data])
        self.model.fit(X)
        self.is_fitted = True

    def predict(self, current_data: dict) -> bool:
        """
        Returns True if anomalous, False otherwise.
        """
        if not self.is_fitted:
            return False
            
        x = np.array([[
            current_data.get('cpu_usage', 0), 
            current_data.get('memory_usage', 0), 
            current_data.get('db_connections', 0)
        ]])
        
        # predict returns -1 for outliers, 1 for inliers
        prediction = self.model.predict(x)
        return prediction[0] == -1
