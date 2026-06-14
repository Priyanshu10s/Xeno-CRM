import os
import json
import logging
import requests
from decimal import Decimal
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework import serializers

from crm_app.models import Shopper, Order, Campaign, DeliveryLog

logger = logging.getLogger(__name__)

# ==========================================
# SERIALIZERS
# ==========================================

class ShopperSerializer(serializers.ModelSerializer):
    total_spend = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Shopper
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'city', 'total_spend', 'order_count', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    shopper_email = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = Order
        fields = ['id', 'shopper', 'shopper_email', 'amount', 'purchase_date', 'created_at']
        extra_kwargs = {
            'shopper': {'required': False}
        }

    def create(self, validated_data):
        try:
            shopper_email = validated_data.pop('shopper_email', None)
            if shopper_email:
                shopper = Shopper.objects.get(email__iexact=shopper_email)
                validated_data['shopper'] = shopper
            return super().create(validated_data)
        except Shopper.DoesNotExist:
            raise serializers.ValidationError({"shopper_email": f"Shopper with email '{shopper_email}' does not exist."})
        except Exception as e:
            logger.error(f"Error creating Order: {e}", exc_info=True)
            raise serializers.ValidationError({"non_field_errors": str(e)})


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ['id', 'name', 'segment_rules', 'message_template', 'status', 'created_at', 'updated_at']


class DeliveryLogSerializer(serializers.ModelSerializer):
    shopper_name = serializers.SerializerMethodField()
    shopper_email = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryLog
        fields = ['id', 'campaign', 'shopper', 'shopper_name', 'shopper_email', 'status', 'message_content', 'sent_at', 'created_at', 'updated_at']

    def get_shopper_name(self, obj):
        return f"{obj.shopper.first_name} {obj.shopper.last_name}"

    def get_shopper_email(self, obj):
        return obj.shopper.email


# ==========================================
# AI INTEGRATION HELPERS & FALLBACKS
# ==========================================

def _call_openai_api(messages):
    """
    HTTP requester contacting OpenAI API directly using requests to bypass SDK dependency issues.
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not configured.")
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=10.0)
    response.raise_for_status()
    result = response.json()
    return result['choices'][0]['message']['content']


def _local_fallback_nlp_parser(query):
    """
    Deterministic rule-based backup regex parser if OpenAI connection fails or is unconfigured.
    Reference system date: June 2026.
    """
    query_lower = query.lower()
    filters = {}
    explanation = "Local Fallback Engine: "

    if 'delhi' in query_lower:
        filters['city__iexact'] = 'Delhi'
        explanation += "City is Delhi. "
    elif 'mumbai' in query_lower:
        filters['city__iexact'] = 'Mumbai'
        explanation += "City is Mumbai. "

    if 'vip' in query_lower or '5000' in query_lower:
        filters['total_spend__gte'] = 5000
        explanation += "Spend >= $5000. "
    elif '1000' in query_lower:
        filters['total_spend__gte'] = 1000
        explanation += "Spend >= $1000. "

    if 'inactive' in query_lower or 'old' in query_lower:
        # Resolve reference date boundary
        filters['orders__purchase_date__lte'] = "2026-05-12T00:00:00Z"
        explanation += "Purchased before May 12, 2026. "
    elif 'recent' in query_lower or 'new' in query_lower:
        filters['orders__purchase_date__gte'] = "2026-05-12T00:00:00Z"
        explanation += "Purchased after May 12, 2026. "

    if not filters:
        return {}, "", "OpenAI API offline and local fallback could not interpret keywords."

    return filters, explanation.strip(), None


def _validate_and_translate_filters(raw_filters):
    """
    Ensures arbitrary values generated by LLM compile safely into whitelisted Django ORM fields.
    """
    translated = {}
    errors = []

    allowed_mapping = {
        'city__iexact': 'city__iexact',
        'city__icontains': 'city__icontains',
        'email__iexact': 'email__iexact',
        'phone': 'phone',
        'total_spend__gte': 'calculated_spend__gte',
        'total_spend__lte': 'calculated_spend__lte',
        'order_count__gte': 'calculated_orders__gte',
        'order_count__lte': 'calculated_orders__lte',
        'orders__purchase_date__gte': 'orders__purchase_date__gte',
        'orders__purchase_date__lte': 'orders__purchase_date__lte',
    }

    for key, val in raw_filters.items():
        if key not in allowed_mapping:
            errors.append(f"Field '{key}' is not allowed in query generation schema.")
            continue

        target_key = allowed_mapping[key]

        try:
            if 'spend' in target_key:
                translated[target_key] = Decimal(str(val))
            elif 'orders' in target_key and 'purchase_date' not in target_key:
                translated[target_key] = int(val)
            elif 'purchase_date' in target_key:
                parsed_dt = parse_datetime(val)
                if parsed_dt:
                    translated[target_key] = parsed_dt
                else:
                    errors.append(f"Malformed date parameter for '{key}': {val}")
            else:
                translated[target_key] = str(val).strip()
        except Exception as e:
            errors.append(f"Parsing parameter '{key}' value failed: {e}")

    return translated, errors


def _get_fallback_copies(segment_name, average_spend, top_product, channel, tone_type):
    """
    Static copywriting variations matching tone requirements.
    """
    tone = str(tone_type).lower()
    ch = str(channel).lower()

    if 'vip' in tone:
        if 'whatsapp' in ch or 'sms' in ch:
            return [
                f"Hi [first_name], as a VIP customer in [city], we're giving you exclusive early access to the new {top_product} line! Code: VIP20",
                f"Hello [first_name], thank you for your loyalty. Book your private concierge service in [city] today!"
            ]
        else:
            return [
                f"Dear [first_name],\n\nWe sincerely appreciate your support as a top customer. Enjoy exclusive access to our premium collection in [city].\n\nBest regards,\nXeno team",
                f"Dear [first_name],\n\nAs a token of our appreciation for your average spend of ${average_spend}, we have credited a luxury voucher to your email [email].\n\nSincerely,\nXeno team"
            ]
    else:
        if 'whatsapp' in ch or 'sms' in ch:
            return [
                f"Hi [first_name], we miss you! Get 15% off your next {top_product} order. Use code: COMEBACK15",
                f"Hello [first_name], don't miss out! Special discount active in [city] for this week only."
            ]
        else:
            return [
                f"Dear [first_name],\n\nWe haven't seen you in a while! Here is a special 15% discount code for your next order: COMEBACK15.\n\nBest regards,\nXeno team",
                f"Hi [first_name],\n\nDon't miss out on your favorite items. Get a special discount in [city] today only.\n\nBest regards,\nXeno team"
            ]


# ==========================================
# HELPERS
# ==========================================

def _dispatch_to_stub(log_id, shopper_id, message_content):
    """
    HTTP client dispatching message sending requests to the channel stub microservice.
    """
    try:
        stub_url = getattr(settings, 'CHANNEL_STUB_URL', 'http://127.0.0.1:8000/api/channel-stub/send/')
        payload = {
            "delivery_log_id": str(log_id),
            "shopper_id": str(shopper_id),
            "message_content": message_content
        }
        logger.info(f"[CRM Dispatcher] Calling channel stub API at {stub_url} for Log={log_id}")
        response = requests.post(stub_url, json=payload, timeout=5.0)
        logger.info(f"[CRM Dispatcher] Stub response: status={response.status_code}")
    except Exception as e:
        logger.error(f"[CRM Dispatcher] Failed to post dispatch call for Log {log_id} to stub: {e}", exc_info=True)


def _evaluate_campaign_completion(campaign_id):
    """
    Verifies if all campaign logs have finished processing, and completes campaign status.
    """
    try:
        campaign = Campaign.objects.select_for_update().get(id=campaign_id)
        has_pending = DeliveryLog.objects.filter(campaign=campaign, status='PENDING').exists()
        if not has_pending:
            campaign.status = 'COMPLETED'
            campaign.save()
            logger.info(f"[Campaign Engine] Campaign {campaign_id} fully processed. Status marked: COMPLETED")
    except Exception as e:
        logger.error(f"[Campaign Engine] Error auditing completion for Campaign {campaign_id}: {e}", exc_info=True)


# ==========================================
# VIEWSETS
# ==========================================

class ShopperViewSet(viewsets.ModelViewSet):
    queryset = Shopper.objects.all().order_by('-created_at')
    serializer_class = ShopperSerializer

    @action(detail=False, methods=['post'], url_path='bulk_ingest')
    def bulk_ingest(self, request):
        shoppers_data = request.data
        if not isinstance(shoppers_data, list):
            return Response({"error": "Payload must be a list of shoppers"}, status=status.HTTP_400_BAD_REQUEST)

        success_count = 0
        skipped_count = 0
        errors = []

        try:
            with transaction.atomic():
                for index, item in enumerate(shoppers_data):
                    try:
                        email = item.get('email')
                        if not email:
                            errors.append(f"Row {index}: Email field is required.")
                            skipped_count += 1
                            continue
                        
                        shopper, created = Shopper.objects.update_or_create(
                            email__iexact=email,
                            defaults={
                                'first_name': item.get('first_name', ''),
                                'last_name': item.get('last_name', ''),
                                'email': email,
                                'phone': item.get('phone', ''),
                                'city': item.get('city', ''),
                            }
                        )
                        success_count += 1
                    except Exception as row_error:
                        logger.error(f"Error ingesting shopper at row {index}: {row_error}", exc_info=True)
                        errors.append(f"Row {index}: {str(row_error)}")
                        skipped_count += 1
            
            return Response({
                "message": "Bulk shopper ingestion completed.",
                "success_count": success_count,
                "skipped_count": skipped_count,
                "errors": errors
            }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)
        except Exception as transaction_error:
            logger.critical(f"Critical error during shopper database transaction: {transaction_error}", exc_info=True)
            return Response({"error": "Transaction failed: " + str(transaction_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    @action(detail=False, methods=['post'], url_path='bulk_ingest')
    def bulk_ingest(self, request):
        orders_data = request.data
        if not isinstance(orders_data, list):
            return Response({"error": "Payload must be a list of orders"}, status=status.HTTP_400_BAD_REQUEST)

        success_count = 0
        skipped_count = 0
        errors = []

        try:
            with transaction.atomic():
                for index, item in enumerate(orders_data):
                    try:
                        email = item.get('shopper_email')
                        amount = item.get('amount')
                        
                        if not email or amount is None:
                            errors.append(f"Row {index}: Missing 'shopper_email' or 'amount'")
                            skipped_count += 1
                            continue

                        shopper = Shopper.objects.filter(email__iexact=email).first()
                        if not shopper:
                            errors.append(f"Row {index}: Shopper with email '{email}' does not exist.")
                            skipped_count += 1
                            continue
                        
                        Order.objects.create(
                            shopper=shopper,
                            amount=amount,
                            purchase_date=item.get('purchase_date', timezone.now())
                        )
                        success_count += 1
                    except Exception as row_error:
                        logger.error(f"Error ingesting order at row {index}: {row_error}", exc_info=True)
                        errors.append(f"Row {index}: {str(row_error)}")
                        skipped_count += 1

            return Response({
                "message": "Bulk order ingestion completed.",
                "success_count": success_count,
                "skipped_count": skipped_count,
                "errors": errors
            }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)
        except Exception as transaction_error:
            logger.critical(f"Critical error during order database transaction: {transaction_error}", exc_info=True)
            return Response({"error": "Transaction failed: " + str(transaction_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-created_at')
    serializer_class = CampaignSerializer

    @action(detail=False, methods=['post'], url_path='estimate_segment')
    def estimate_segment(self, request):
        try:
            rules = request.data
            temp_campaign = Campaign(segment_rules=rules)
            shoppers = temp_campaign.evaluate_segment()
            return Response({"matched_count": shoppers.count()}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error estimating segment size: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='send')
    def send_campaign(self, request, pk=None):
        try:
            campaign = self.get_object()
            if campaign.status == 'RUNNING':
                return Response({"error": "Campaign is already running."}, status=status.HTTP_400_BAD_REQUEST)

            campaign.status = 'RUNNING'
            campaign.save()

            shoppers = campaign.evaluate_segment()
            total_customers = shoppers.count()

            if total_customers == 0:
                campaign.status = 'COMPLETED'
                campaign.save()
                return Response({"message": "No shoppers matched this segment. Campaign completed automatically."}, status=status.HTTP_200_OK)

            delivery_logs_created = 0
            duplicate_skips = 0

            # Atomic transaction context block to isolate delivery log inserts
            with transaction.atomic():
                for shopper in shoppers:
                    message = campaign.message_template
                    message = message.replace('[first_name]', shopper.first_name)
                    message = message.replace('[last_name]', shopper.last_name)
                    message = message.replace('[city]', shopper.city)
                    message = message.replace('[email]', shopper.email)

                    try:
                        log_entry = DeliveryLog.objects.create(
                            campaign=campaign,
                            shopper=shopper,
                            status='PENDING',
                            message_content=message
                        )
                        delivery_logs_created += 1
                        
                        # Post HTTP request to stub only AFTER transaction commits
                        # to prevent race condition before database record is persisted
                        transaction.on_commit(
                            lambda log_id=log_entry.id, sh_id=shopper.id, msg=message:
                            _dispatch_to_stub(log_id, sh_id, msg)
                        )
                    except IntegrityError:
                        duplicate_skips += 1
                        continue

            return Response({
                "message": f"Campaign execution started. Target: {total_customers} shoppers.",
                "logs_created": delivery_logs_created,
                "duplicate_skips": duplicate_skips,
                "status": campaign.status
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Failed to execute campaign send action {pk}: {e}", exc_info=True)
            return Response({"error": f"Failed to execute campaign: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        try:
            campaign = self.get_object()
            logs = campaign.delivery_logs.all()
            total = logs.count()
            delivered = logs.filter(status='DELIVERED').count()
            read = logs.filter(status='READ').count()
            failed = logs.filter(status='FAILED').count()
            pending = logs.filter(status='PENDING').count()

            # Success implies DELIVERED or READ
            success_count = delivered + read
            success_rate = (success_count / total * 100) if total > 0 else 0

            return Response({
                "campaign_id": campaign.id,
                "campaign_name": campaign.name,
                "campaign_status": campaign.status,
                "total_sent": total,
                "delivered": delivered,
                "read": read,
                "failed": failed,
                "pending": pending,
                "success_rate_percentage": round(success_rate, 2)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching campaign stats for {pk}: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='nlp_segment')
    def nlp_segment(self, request):
        """
        Translates Natural Language queries (Hinglish/English) into database segments.
        Verifies values, resolves time windows based on reference June 2026 date, and computes DB results.
        """
        query = request.data.get('query')
        if not query:
            return Response({"error": "Missing parameter: 'query'"}, status=status.HTTP_400_BAD_REQUEST)

        system_prompt = (
            "You are a database segment compiler translating natural language to Django ORM filters.\n"
            "Valid filters: city__iexact, city__icontains, email__iexact, phone, "
            "total_spend__gte, total_spend__lte, order_count__gte, order_count__lte, "
            "orders__purchase_date__gte, orders__purchase_date__lte.\n"
            "Reference date: June 12, 2026. Translate relative dates into absolute ISO strings.\n"
            "Return STRICT JSON structure:\n"
            "{\n"
            "  \"filters\": {},\n"
            "  \"explanation\": \"summary of filters applied\",\n"
            "  \"error\": null\n"
            "}\n"
            "If invalid/unsupported criteria is passed, return error message in 'error' field."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]

        raw_filters = {}
        explanation = ""
        error_msg = None

        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            try:
                response_text = _call_openai_api(messages)
                parsed = json.loads(response_text)
                raw_filters = parsed.get('filters', {})
                explanation = parsed.get('explanation', '')
                error_msg = parsed.get('error')
            except Exception as e:
                logger.error(f"OpenAI error in NLP Segmentation view: {e}", exc_info=True)
                raw_filters, explanation, error_msg = _local_fallback_nlp_parser(query)
        else:
            logger.info("OPENAI_API_KEY not configured. Invoking rule-based fallback.")
            raw_filters, explanation, error_msg = _local_fallback_nlp_parser(query)

        if error_msg:
            return Response({
                "filters": {},
                "explanation": "",
                "matched_count": 0,
                "error": error_msg
            }, status=status.HTTP_200_OK)

        # Sanitize and compile to safe Django lookup fields
        translated_filters, validation_errors = _validate_and_translate_filters(raw_filters)
        if validation_errors:
            return Response({
                "filters": raw_filters,
                "explanation": "Validation of generated filters failed.",
                "matched_count": 0,
                "error": f"Validation issues: {', '.join(validation_errors)}"
            }, status=status.HTTP_200_OK)

        try:
            shoppers = Shopper.objects.all()
            if any(k.startswith('calculated_') for k in translated_filters):
                shoppers = shoppers.with_aggregates()

            shoppers = shoppers.filter(**translated_filters).distinct()
            matched_count = shoppers.count()

            return Response({
                "filters": raw_filters,
                "translated_filters": {k: str(v) for k, v in translated_filters.items()},
                "explanation": explanation,
                "matched_count": matched_count,
                "error": None
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Database translation execution failure: {e}", exc_info=True)
            return Response({
                "filters": raw_filters,
                "explanation": "Generated filters caused database query faults.",
                "matched_count": 0,
                "error": f"Execution error: {e}"
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='generate_copy')
    def generate_copy(self, request):
        """
        Generates 2 to 3 marketing copy variations using OpenAI completions,
        incorporating context, tone rules, and database placeholders.
        """
        tone = request.data.get('tone', 'VIP')
        product_category = request.data.get('product_category', 'Products')

        system_prompt = (
            "You are an expert copywriter inside a CRM engine.\n"
            "Formulate 2 to 3 marketing templates matching the user's demographic stats.\n"
            "Output must be STRICT JSON format:\n"
            "{\n"
            "  \"variations\": [\"Template 1\", \"Template 2\"]\n"
            "}\n"
            "Incorporate these placeholders: [first_name], [last_name], [city], [email]. Do not output markdown codeblocks."
        )

        user_content = (
            f"Please generate marketing copy templates.\n"
            f"Product Category: {product_category}\n"
            f"Tone: {tone}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        variations = []
        api_key = os.getenv('OPENAI_API_KEY')

        if api_key:
            try:
                response_text = _call_openai_api(messages)
                parsed = json.loads(response_text)
                variations = parsed.get('variations', [])
            except Exception as e:
                logger.error(f"OpenAI error in copywriter view: {e}", exc_info=True)
                variations = _get_fallback_copies('General Audience', '0', product_category, 'WhatsApp', tone)
        else:
            logger.info("OPENAI_API_KEY not configured. Resolving copywriting fallbacks.")
            variations = _get_fallback_copies('General Audience', '0', product_category, 'WhatsApp', tone)

        return Response({"variations": variations}, status=status.HTTP_200_OK)


class DeliveryLogViewSet(viewsets.ModelViewSet):
    queryset = DeliveryLog.objects.all().order_by('-created_at')
    serializer_class = DeliveryLogSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        campaign_id = self.request.query_params.get('campaign_id', None)
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        return queryset

    @action(detail=False, methods=['post'], url_path='webhook')
    def webhook(self, request):
        """
        Webhook Callback Receiver from channel_stub.
        Implements Pessimistic Row-Level Locking via select_for_update() to prevent race conditions.
        """
        # Validate webhook authenticity signature
        signature = request.headers.get('X-Webhook-Signature')
        expected_signature = getattr(settings, 'CRM_WEBHOOK_SIGNATURE', 'crm_internal_secret_token_signature')
        if signature != expected_signature:
            logger.warning(f"[Webhook Callback] Rejecting unauthorized call. Signature: {signature}")
            return Response({"error": "Unauthorized signature"}, status=status.HTTP_401_UNAUTHORIZED)

        delivery_log_id = request.data.get('delivery_log_id')
        outcome = request.data.get('status')

        logger.info(
            f"--- WEBHOOK CALLBACK RECEIVED ---\n"
            f"Delivery Log ID: {delivery_log_id}\n"
            f"Reported Status: {outcome}\n"
            f"---------------------------------"
        )

        if not delivery_log_id or not outcome:
            logger.error(f"[Webhook Callback] Malformed payload received: {request.data}")
            return Response({"error": "Missing delivery_log_id or status parameters"}, status=status.HTTP_400_BAD_REQUEST)

        outcome_upper = str(outcome).upper()
        valid_statuses = dict(DeliveryLog.STATUS_CHOICES)

        try:
            # Atomic context block to enforce exclusive locking
            with transaction.atomic():
                # .select_for_update() locks the row in the DB until transaction commits
                # preventing competing webhook requests or background threads from causing database race conditions
                try:
                    log_entry = DeliveryLog.objects.select_for_update().get(id=delivery_log_id)
                except DeliveryLog.DoesNotExist as exc:
                    logger.error(f"[Webhook Callback] Database Record Not Found for ID: {delivery_log_id}. Exception: {exc}")
                    return Response({"error": f"DeliveryLog with id {delivery_log_id} does not exist."}, status=status.HTTP_404_NOT_FOUND)

                # Intercept structural failures (either explicitly passed as FAILED status or invalid status payload)
                if outcome_upper == 'FAILED' or outcome_upper not in valid_statuses:
                    error_msg = f"Simulated carrier delivery failure or invalid status payload: {outcome}"
                    logger.warning(
                        f"[Webhook Callback] [FAILURE INTERCEPTED] Log ID: {delivery_log_id}.\n"
                        f"Footprint: {error_msg}\n"
                        f"Updating record status to FAILED cleanly."
                    )
                    log_entry.status = 'FAILED'
                    log_entry.save()
                    _evaluate_campaign_completion(log_entry.campaign_id)
                    return Response({"status": "Failed State Resolved", "message": "Delivery log marked as FAILED cleanly."}, status=status.HTTP_200_OK)

                # Prevent rewriting terminal statuses
                if log_entry.status in ['DELIVERED', 'READ'] and outcome_upper == 'DELIVERED':
                    # Skip redundantly setting read back to delivered
                    pass
                else:
                    log_entry.status = outcome_upper
                    if outcome_upper in ['DELIVERED', 'READ']:
                        log_entry.sent_at = timezone.now()
                    log_entry.save()

                logger.info(f"[Webhook Callback] Successfully updated DeliveryLog {delivery_log_id} to status {outcome_upper}.")
                
                # Check campaign overall completion state inside locked scope
                _evaluate_campaign_completion(log_entry.campaign_id)

            return Response({"status": "Success", "message": "Log state updated successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.critical(
                f"[Webhook Callback] [CRITICAL TRANSACTION EXCEPTION] Failed to process status update for Log {delivery_log_id}.\n"
                f"Error Footprint: {e}",
                exc_info=True
            )
            return Response({"error": "Internal processing error: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def health_check(request):
    return Response({"status": "OK", "timestamp": timezone.now()})

