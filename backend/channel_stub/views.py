import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from channel_stub.tasks import send_campaign_message_task

logger = logging.getLogger(__name__)

class ChannelSendMessageView(APIView):
    """
    Isolated, production-grade microservice endpoint to ingest message dispatch payloads.
    Triggers asynchronous Celery worker execution and returns a 202 Accepted response immediately.
    """
    def post(self, request):
        try:
            delivery_log_id = request.data.get('delivery_log_id')
            shopper_id = request.data.get('shopper_id')
            message_content = request.data.get('message_content')

            # Strict validation of required payload fields
            if not delivery_log_id or not shopper_id or not message_content:
                missing_fields = []
                if not delivery_log_id: missing_fields.append('delivery_log_id')
                if not shopper_id: missing_fields.append('shopper_id')
                if not message_content: missing_fields.append('message_content')
                
                logger.warning(f"[Ingestion Gateway] Validation failed. Missing fields: {missing_fields}")
                return Response(
                    {"error": f"Missing required parameters: {', '.join(missing_fields)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            logger.info(f"[Ingestion Gateway] Ingested log: {delivery_log_id}. Dispatching task asynchronously.")

            # Trigger background task asynchronously via Celery (non-blocking)
            send_campaign_message_task.delay(delivery_log_id, shopper_id, message_content)

            # Return 202 Accepted instantly for zero-latency client UI performance
            return Response(
                {
                    "status": "Accepted",
                    "message": "Message delivery task has been queued for execution.",
                    "delivery_log_id": delivery_log_id
                },
                status=status.HTTP_202_ACCEPTED
            )

        except Exception as e:
            logger.error(f"[Ingestion Gateway] Critical failure in ingestion endpoint: {e}", exc_info=True)
            return Response(
                {"error": "An internal server error occurred while queuing the delivery task."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
