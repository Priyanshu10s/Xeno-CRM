from django.contrib import admin
from crm_app.models import Shopper, Order, Campaign, DeliveryLog

@admin.register(Shopper)
class ShopperAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'phone', 'city', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'city')
    list_filter = ('city',)
    ordering = ('-created_at',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'shopper', 'amount', 'purchase_date', 'created_at')
    search_fields = ('shopper__email', 'shopper__first_name', 'shopper__last_name')
    list_filter = ('purchase_date',)
    ordering = ('-purchase_date',)

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'created_at', 'updated_at')
    search_fields = ('name',)
    list_filter = ('status',)
    ordering = ('-created_at',)

@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'campaign', 'shopper', 'status', 'sent_at', 'created_at')
    search_fields = ('campaign__name', 'shopper__email')
    list_filter = ('status', 'created_at')
    ordering = ('-created_at',)
