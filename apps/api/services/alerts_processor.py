import logging
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date
import httpx
import models

logger = logging.getLogger(__name__)

class AlertsProcessor:
    def __init__(self, db: Session):
        self.db = db
        
    def _send_push_notifications(self, notifications: list):
        """
        Sends push notifications via Expo API.
        notifications: list of dicts with 'to', 'title', 'body', 'data'
        """
        if not notifications:
            return
            
        url = "https://exp.host/--/api/v2/push/send"
        
        # In a production app, we would batch these (max 100 per request)
        # and handle the Expo Access Token if configured.
        try:
            # Synchronous post since this runs in a batch script
            response = httpx.post(url, json=notifications, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"Failed to send push notifications: {response.text}")
            else:
                logger.info(f"Successfully sent {len(notifications)} push notifications.")
        except Exception as e:
            logger.error(f"Exception sending push notifications: {e}")

    def run(self):
        logger.info("Starting Alerts Processor...")
        active_alerts = self.db.query(models.Alert).filter(models.Alert.status == 'active').all()
        
        if not active_alerts:
            logger.info("No active alerts found. Exiting.")
            return

        # Fetch all current scores to minimize DB queries
        all_scores = self.db.query(models.StockScore).all()
        scores_map = {score.stock_symbol: score for score in all_scores}
        
        # Fetch all user push tokens
        devices = self.db.query(models.UserDevice).all()
        token_map = {}
        for d in devices:
            if d.user_id not in token_map:
                token_map[d.user_id] = []
            token_map[d.user_id].append(d.expo_push_token)

        notifications_to_send = []
        today = date.today()

        for alert in active_alerts:
            triggered_symbols = []
            
            def check_condition(score_record):
                # Dynamically get the right score attribute based on score_type and timeframe
                attr_name = f"{alert.score_type}_score_{alert.timeframe}"
                val = getattr(score_record, attr_name, None)
                if val is None or val == "Not Available":
                    return False
                
                try:
                    val = float(val)
                except ValueError:
                    return False

                if alert.direction == 'above':
                    return val > alert.threshold_value
                else:
                    return val < alert.threshold_value

            if alert.alert_type == 'universe_wide':
                for symbol, score in scores_map.items():
                    if check_condition(score):
                        triggered_symbols.append(symbol)
                        
            elif alert.alert_type == 'specific_stock':
                score = scores_map.get(alert.stock_symbol)
                if score and check_condition(score):
                    triggered_symbols.append(alert.stock_symbol)
                    
            elif alert.alert_type == 'portfolio_only':
                holdings = self.db.query(models.PortfolioHolding).filter(
                    models.PortfolioHolding.user_id == alert.user_id,
                    models.PortfolioHolding.status == 'held'
                ).all()
                for h in holdings:
                    score = scores_map.get(h.stock_symbol)
                    if score and check_condition(score):
                        triggered_symbols.append(h.stock_symbol)

            # If triggered, update the alert and prepare notification
            if triggered_symbols:
                alert.status = 'triggered'
                alert.triggered_date = today
                # Store the primary triggering symbol (if universe_wide, we just store the first one or a comma list)
                alert.triggered_symbol = ",".join(triggered_symbols[:3]) + ("..." if len(triggered_symbols) > 3 else "")
                
                self.db.add(alert)
                
                # Prepare push notifications for this user
                tokens = token_map.get(alert.user_id, [])
                for token in tokens:
                    if alert.alert_type == 'specific_stock':
                        body = f"{alert.stock_symbol} crossed {alert.direction} {alert.threshold_value} on the {alert.timeframe} {alert.score_type} score."
                    else:
                        body = f"An alert triggered on {len(triggered_symbols)} stock(s) including {triggered_symbols[0]}!"
                        
                    notifications_to_send.append({
                        "to": token,
                        "title": "Finwerse Alert Triggered 🚨",
                        "body": body,
                        "data": {"alert_id": str(alert.id)}
                    })

        # Commit DB updates
        self.db.commit()
        
        # Dispatch notifications
        self._send_push_notifications(notifications_to_send)
        logger.info(f"Alerts Processor complete. Triggered {len(notifications_to_send)} alerts.")
