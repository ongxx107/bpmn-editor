import json
import uuid

from channels.generic.websocket import AsyncWebsocketConsumer

DIAGRAM_STATE = {}

DEFAULT_BPMN_XML = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                xmlns:camunda="http://camunda.org/schema/1.0/bpmn" 
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" 
                id="Definitions_1eul5m6" 
                targetNamespace="http://bpmn.io/schema/bpmn" 
                exporter="Camunda Modeler" 
                exporterVersion="4.9.0">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:task id="Task_1" name="Do something"/>
    <bpmn:endEvent id="EndEvent_1"/>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="250" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="390" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint xmlns:di="http://www.omg.org/spec/DD/20100524/DI" x="209" y="120" />
        <di:waypoint xmlns:di="http://www.omg.org/spec/DD/20100524/DI" x="250" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint xmlns:di="http://www.omg.org/spec/DD/20100524/DI" x="350" y="120" />
        <di:waypoint xmlns:di="http://www.omg.org/spec/DD/20100524/DI" x="390" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
"""


class DiagramConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.group_name = f"diagram_{self.room_name}"
        self.user_id = uuid.uuid4().hex

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        room = DIAGRAM_STATE.setdefault(
            self.room_name,
            {
                "bpmn_xml": DEFAULT_BPMN_XML,
                "users": set(),
                "locks": {},
            },
        )

        room["users"].add(self.user_id)

        await self.send(
            text_data=json.dumps(
                {
                    "type": "init",
                    "self_id": self.user_id,
                    "bpmn_xml": room["bpmn_xml"],
                    "users_count": len(room["users"]),
                    "locks": room["locks"],
                }
            )
        )

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "users_update",
                "users_count": len(room["users"]),
            },
        )

    async def disconnect(self, close_code):
        room = DIAGRAM_STATE.get(self.room_name)
        if room:
            room["users"].discard(self.user_id)

            to_remove = [
                element_id
                for element_id, uid in room["locks"].items()
                if uid == self.user_id
            ]
            for element_id in to_remove:
                del room["locks"][element_id]

            if to_remove:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "bulk_unlock",
                        "element_ids": to_remove,
                    },
                )

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "users_update",
                    "users_count": len(room["users"]),
                },
            )

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data is None:
            return

        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "update_diagram":
            await self._handle_update_diagram(data)
        elif msg_type == "lock_element":
            await self._handle_lock_element(data)
        elif msg_type == "unlock_element":
            await self._handle_unlock_element(data)

    async def _handle_update_diagram(self, data):
        xml = data.get("bpmn_xml")
        if not xml:
            return

        room = DIAGRAM_STATE.setdefault(
            self.room_name,
            {"bpmn_xml": DEFAULT_BPMN_XML, "users": set(), "locks": {}},
        )
        room["bpmn_xml"] = xml

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "diagram_update",
                "bpmn_xml": xml,
                "user_id": self.user_id,
                "locks": room["locks"],
            },
        )

    async def _handle_lock_element(self, data):
        element_id = data.get("element_id")
        if not element_id:
            return

        room = DIAGRAM_STATE.setdefault(
            self.room_name,
            {"bpmn_xml": DEFAULT_BPMN_XML, "users": set(), "locks": {}},
        )

        room["locks"][element_id] = self.user_id

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "lock_element",
                "element_id": element_id,
                "user_id": self.user_id,
            },
        )

    async def _handle_unlock_element(self, data):
        element_id = data.get("element_id")
        if not element_id:
            return

        room = DIAGRAM_STATE.setdefault(
            self.room_name,
            {"bpmn_xml": DEFAULT_BPMN_XML, "users": set(), "locks": {}},
        )

        if room["locks"].get(element_id) == self.user_id:
            del room["locks"][element_id]

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "unlock_element",
                    "element_id": element_id,
                },
            )

    async def diagram_update(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "diagram_update",
                    "bpmn_xml": event["bpmn_xml"],
                    "user_id": event["user_id"],
                    "locks": event.get("locks", {}),
                }
            )
        )

    async def users_update(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "users",
                    "users_count": event["users_count"],
                }
            )
        )

    async def lock_element(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "lock",
                    "element_id": event["element_id"],
                    "user_id": event["user_id"],
                }
            )
        )

    async def unlock_element(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "unlock",
                    "element_id": event["element_id"],
                }
            )
        )

    async def bulk_unlock(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "bulk_unlock",
                    "element_ids": event["element_ids"],
                }
            )
        )
