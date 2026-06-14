import time
import random
import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=5, default_retry_delay=5)
def send_campaign_message_task(self, delivery_log_id, shopper_id, message_content):
    """
    Asynchronous Celery task implementing the message delivery simulation loop.
    Enforces simulation latency, categorizes status based on defined probabilities,
    and updates the main CRM system via a webhook callback with a retry block.
    """
    logger.info(
        f"\n=========================================\n"
        f"[Celery Task Initiated] Task UUID: {self.request.id}\n"
        f"Delivery Log: {delivery_log_id} | Shopper: {shopper_id}\n"
        f"Retry Attempt: {self.request.retries}/{self.max_retries}\n"
        f"========================================="
    )

    try:
        # Simulate a 10% network carrier drop failure rate
        if random.random() < 0.10:
            logger.warning(f"[Celery Task] simulated 10% carrier drop encountered for Log: {delivery_log_id}.")
            raise requests.exceptions.ConnectionError("Simulated carrier pipeline network failure.")

        # Enforce strict 2-second simulation delay to mimic real-world external API latency
        time.sleep(2)

        # Probabilistic Engine using random.random()
        # 75% -> DELIVERED, 15% -> READ, 10% -> FAILED
        roll = random.random()
        if roll < 0.75:
            resolved_status = 'DELIVERED'
        elif roll < 0.90:
            resolved_status = 'READ'
        else:
            resolved_status = 'FAILED'

        logger.info(f"[Celery Task] Log: {delivery_log_id} resolved to status: {resolved_status}")

        # Webhook Callback Dispatch Setup
        webhook_url = getattr(settings, 'CRM_WEBHOOK_URL', 'http://127.0.0.1:8000/api/delivery-logs/webhook/')
        callback_payload = {
            "delivery_log_id": str(delivery_log_id),
            "status": resolved_status
        }
        callback_headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": getattr(settings, 'CRM_WEBHOOK_SIGNATURE', 'crm_internal_secret_token_signature')
        }

        # Robust HTTP retry loop for webhook transmission
        max_http_attempts = 3
        http_backoff_seconds = 2
        success = False

        for attempt in range(1, max_http_attempts + 1):
            try:
                # Add a 10% timeout failure simulation within the webhook post itself
                if random.random() < 0.10:
                    raise requests.exceptions.Timeout("Simulated webhook callback payload dispatch timeout.")

                logger.info(f"[Celery Task] Posting callback to CRM (Attempt {attempt}/{max_http_attempts}) at {webhook_url}")
                response = requests.post(
                    webhook_url,
                    json=callback_payload,
                    headers=callback_headers,
                    timeout=5.0
                )
                
                # Check for successful response
                if response.status_code in [200, 201, 202]:
                    logger.info(f"[Celery Task] Webhook callback successful for log {delivery_log_id} on attempt {attempt}.")
                    success = True
                    break
                else:
                    logger.warning(
                        f"[Celery Task] Webhook callback responded with error status {response.status_code} "
                        f"on attempt {attempt}."
                    )
            except requests.RequestException as req_err:
                logger.warning(f"[Celery Task] Network exception during webhook on attempt {attempt}: {req_err}")
            
            # Apply backoff before retrying
            if attempt < max_http_attempts:
                time.sleep(http_backoff_seconds * attempt)

        if not success:
            raise requests.exceptions.RequestException("Webhook callback dispatch failed after all internal retries.")

        logger.info(f"[Celery Task] Finished successfully. Log: {delivery_log_id} completed.")
        return f"Status {resolved_status} sent to CRM"

    except Exception as exc:
        # Exponential backoff countdown: 2 ** retries
        backoff_countdown = 2 ** self.request.retries
        logger.error(
            f"[Celery Task] Error encountered: {exc}. "
            f"Scheduling retry with exponential backoff (countdown={backoff_countdown}s, retries={self.request.retries}/{self.max_retries}).",
            exc_info=True
        )
        try:
            # Re-queue the task in Celery if failure occurs
            self.retry(exc=exc, countdown=backoff_countdown)
        except self.MaxRetriesExceededError:
            logger.critical(f"[Celery Task] Max Celery task retries exceeded for log {delivery_log_id}. Discarding task.")
            return "Failed: Max retries exceeded"
