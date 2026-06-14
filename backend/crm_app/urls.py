from django.urls import path, include
from rest_framework.routers import DefaultRouter
from crm_app.views import ShopperViewSet, OrderViewSet, CampaignViewSet, DeliveryLogViewSet, health_check

router = DefaultRouter()
router.register(r'shoppers', ShopperViewSet, basename='shopper')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'delivery-logs', DeliveryLogViewSet, basename='deliverylog')

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', include(router.urls)),
]

