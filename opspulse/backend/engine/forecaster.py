import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import logging

logger = logging.getLogger(__name__)

class ResourceForecaster:
    def __init__(self):
        pass

    def forecast(self, values: list, forecast_steps=15) -> dict:
        """
        Uses simple Exponential Smoothing to predict next N steps with confidence intervals.
        """
        if len(values) < 20:
            if not values:
                return {"values": [], "lower": [], "upper": []}
            last = values[-1]
            return {
                "values": [last] * forecast_steps,
                "lower": [last] * forecast_steps,
                "upper": [last] * forecast_steps
            }
            
        try:
            # We assume regular intervals for this simple model
            series = pd.Series(values)
            # Simple exponential smoothing
            model = ExponentialSmoothing(series, initialization_method="estimated")
            fit_model = model.fit()
            forecast = np.clip(fit_model.forecast(forecast_steps).values, 0, 100).tolist()
            
            # Simple residuals standard deviation
            residuals = fit_model.resid
            std_err = np.std(residuals) if len(residuals) > 0 else 2.0
            
            lower = []
            upper = []
            for i in range(1, forecast_steps + 1):
                margin = 1.96 * std_err * np.sqrt(i)
                lower.append(max(0.0, forecast[i-1] - margin))
                upper.append(min(100.0, forecast[i-1] + margin))
                
            return {
                "values": forecast,
                "lower": lower,
                "upper": upper
            }
        except Exception as e:
            logger.error(f"Error forecasting: {e}")
            last = values[-1]
            return {
                "values": [last] * forecast_steps,
                "lower": [last] * forecast_steps,
                "upper": [last] * forecast_steps
            }
