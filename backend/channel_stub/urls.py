from django.urls import path
from channel_stub.views import ChannelSendMessageView

urlpatterns = [
    path('send/', ChannelSendMessageView.as_view(), name='channel-send-message'),
]
