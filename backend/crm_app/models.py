import uuid
import logging
from django.db import models
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, InvalidOperation

# Set up database logger for performance auditing and tracing
logger = logging.getLogger(__name__)

class ShopperQuerySet(models.QuerySet):
    """
    Custom QuerySet providing high-performance, chainable queries for segment builder operations.
    """
    def with_aggregates(self):
        """
        Annotates total spend and total order counts on each Shopper.
        Uses Coalesce to default null aggregates to 0.00 / 0.
        """
        return self.annotate(
            calculated_spend=Coalesce(Sum('orders__amount'), Decimal('0.00')),
            calculated_orders=Count('orders')
        )

    def by_monetary_spend(self, threshold):
        """
        Filters shoppers whose total spending matches or exceeds the threshold.
        """
        try:
            val = Decimal(str(threshold))
            return self.with_aggregates().filter(calculated_spend__gte=val)
        except (ValueError, TypeError, InvalidOperation) as e:
            logger.error(f"Failed to filter Shoppers by monetary spend. Invalid threshold value: {threshold}. Error: {e}", exc_info=True)
            return self

    def by_purchase_frequency(self, min_orders):
        """
        Filters shoppers who have made at least the minimum number of orders.
        """
        try:
            val = int(min_orders)
            return self.with_aggregates().filter(calculated_orders__gte=val)
        except (ValueError, TypeError) as e:
            logger.error(f"Failed to filter Shoppers by purchase frequency. Invalid count: {min_orders}. Error: {e}", exc_info=True)
            return self

    def by_location(self, city):
        """
        Filters shoppers based on location, case-insensitive.
        """
        if not city:
            return self
        return self.filter(city__iexact=str(city).strip())

    def by_recency(self, max_inactive_days):
        """
        Filters shoppers who have made at least one purchase within the specified recency window.
        """
        try:
            days = int(max_inactive_days)
            limit_date = timezone.now() - timedelta(days=days)
            return self.filter(orders__purchase_date__gte=limit_date).distinct()
        except (ValueError, TypeError) as e:
            logger.error(f"Failed to filter Shoppers by recency. Invalid days: {max_inactive_days}. Error: {e}", exc_info=True)
            return self


class Shopper(models.Model):
    """
    Represents a Customer/Shopper in the CRM system.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    # email and city are db_index=True for rapid segment lookups and identity mapping
    email = models.EmailField(max_length=254, unique=True, db_index=True)
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ShopperQuerySet.as_manager()

    class Meta:
        verbose_name = "Shopper"
        verbose_name_plural = "Shoppers"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def total_spend(self):
        """
        Dynamically calculates the shopper's total spend from orders.
        """
        try:
            return self.orders.aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
        except Exception as e:
            logger.error(f"Error calculating total spend for shopper {self.id}: {e}", exc_info=True)
            return Decimal('0.00')

    @property
    def order_count(self):
        """
        Dynamically counts the shopper's total orders.
        """
        try:
            return self.orders.count()
        except Exception as e:
            logger.error(f"Error counting orders for shopper {self.id}: {e}", exc_info=True)
            return 0


class Order(models.Model):
    """
    Represents a purchase transaction made by a Shopper.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shopper = models.ForeignKey(Shopper, on_delete=models.CASCADE, related_name='orders')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    # purchase_date is indexed to optimize analytics queries and recency lookups
    purchase_date = models.DateTimeField(db_index=True, default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-purchase_date']
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"Order {self.id} | Amount: {self.amount} | Shopper: {self.shopper.email}"


class Campaign(models.Model):
    """
    Represents a marketing outreach campaign targeted at a specific segment.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    segment_rules = models.JSONField(default=dict, help_text="Rules representing target filters, e.g. min_spend, min_orders, city, max_inactive_days")
    message_template = models.TextField(help_text="Message template. Placeholders: [first_name], [last_name], [city], [email]")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Campaign"
        verbose_name_plural = "Campaigns"

    def __str__(self):
        return self.name

    def evaluate_segment(self):
        """
        Evaluates the campaign's segment rules and returns the matching Shoppers.
        This represents the Fat Model design pattern for segment generation.
        """
        try:
            shoppers = Shopper.objects.all()
            rules = self.segment_rules or {}

            if 'min_spend' in rules and rules['min_spend'] is not None:
                shoppers = shoppers.by_monetary_spend(rules['min_spend'])

            if 'min_orders' in rules and rules['min_orders'] is not None:
                shoppers = shoppers.by_purchase_frequency(rules['min_orders'])

            if 'city' in rules and rules['city']:
                shoppers = shoppers.by_location(rules['city'])

            if 'max_inactive_days' in rules and rules['max_inactive_days'] is not None:
                shoppers = shoppers.by_recency(rules['max_inactive_days'])

            return shoppers.distinct()
        except Exception as e:
            logger.error(f"Exception raised while evaluating segment for campaign {self.id}: {e}", exc_info=True)
            return Shopper.objects.none()


class DeliveryLog(models.Model):
    """
    Tracks the delivery status of campaign messages sent to individual shoppers.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('DELIVERED', 'Delivered'),
        ('READ', 'Read'),
        ('FAILED', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='delivery_logs')
    shopper = models.ForeignKey(Shopper, on_delete=models.CASCADE, related_name='delivery_logs')
    # status is indexed to speed up delivery status processing audits
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    message_content = models.TextField()
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Delivery Log"
        verbose_name_plural = "Delivery Logs"
        # Strict relational constraint: Prevent sending a message from the same campaign to the same shopper twice.
        constraints = [
            models.UniqueConstraint(
                fields=['campaign', 'shopper'],
                name='unique_campaign_shopper_delivery'
            )
        ]

    def __str__(self):
        return f"Log {self.id} | Campaign: {self.campaign.name} | Shopper: {self.shopper.email} | Status: {self.status}"
