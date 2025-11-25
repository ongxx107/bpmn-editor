from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/diagram/(?P<room_name>\w+)/$", consumers.DiagramConsumer.as_asgi()),
]
