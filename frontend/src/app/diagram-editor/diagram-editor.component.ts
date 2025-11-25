import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import Modeler from 'bpmn-js/dist/bpmn-modeler.production.min.js';

type LocksMap = Record<string, string>;

@Component({
  selector: 'app-diagram-editor',
  standalone: true,
  templateUrl: './diagram-editor.component.html',
  styleUrls: ['./diagram-editor.component.scss'],
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ref', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;

  roomName = this.getInitialRoomName();
  onlineUsers = 0;

  private bpmnModeler!: Modeler;
  private socket?: WebSocket;
  private selfId: string | null = null;
  private myLockedElementId: string | null = null;

  ngAfterViewInit(): void {
    this.bpmnModeler = new Modeler({
      container: this.canvasRef.nativeElement,
    });
    this.bpmnModeler.get('canvas').zoom('fit-viewport');

    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.close();
    }
    if (this.bpmnModeler) {
      this.bpmnModeler.destroy();
    }
  }

  // Public UI actions
  async undo() {
    const commandStack = this.bpmnModeler.get('commandStack');
    commandStack.undo();
  }

  async redo() {
    const commandStack = this.bpmnModeler.get('commandStack');
    commandStack.redo();
  }

  async onImportBPMN(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = async (e) => {
      const xml = e.target?.result;
      if (typeof xml !== 'string') {
        return;
      }

      try {
        await this.bpmnModeler.importXML(xml);

        // Clear any existing locks on import
        this.applyLocks({});

        // Broadcast the new diagram to other users
        await this.broadcastDiagramUpdate();
      } catch (err) {
        console.error('Error importing BPMN file', err);
      }
    };

    reader.readAsText(file);

    // Allow selecting the same file again
    input.value = '';
  }

  async downloadBPMN() {
    try {
      const { xml } = await this.bpmnModeler.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.roomName || 'diagram'}.bpmn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting BPMN XML', err);
    }
  }

  // Get path name /diagram/<roomName>
  private getInitialRoomName(): string {
    const path = window.location.pathname;

    const match = path.match(/^\/diagram\/([^/]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    // Rewrite URL to /diagram/default
    if (path === '/' || path === '') {
      const newPath = '/diagram/default';

      window.history.replaceState({}, '', newPath);
    }

    return 'default';
  }

  // WebSocket setup
  private connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.hostname}:8000/ws/diagram/${this.roomName}/`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onclose = () => {
      console.log('WebSocket closed, trying to reconnect in 3s...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.socket.onmessage = async (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data);
      const type = data.type as string;

      if (type === 'init') {
        this.selfId = data.self_id;
        this.onlineUsers = data.users_count ?? 1;

        try {
          await this.bpmnModeler.importXML(data.bpmn_xml);
          this.applyLocks(data.locks as LocksMap);
          this.attachModelerEvents();
        } catch (err) {
          console.error('Error importing initial BPMN XML', err);
        }
      } else if (type === 'users') {
        this.onlineUsers = data.users_count ?? 1;
      } else if (type === 'diagram_update') {
        if (data.user_id === this.selfId) return;
        try {
          await this.bpmnModeler.importXML(data.bpmn_xml);
          this.applyLocks(data.locks as LocksMap);
        } catch (err) {
          console.error('Error updating diagram from server', err);
        }
      } else if (type === 'lock') {
        const { element_id, user_id } = data;
        const canvas = this.bpmnModeler.get('canvas');
        if (user_id !== this.selfId) {
          canvas.addMarker(element_id, 'locked-by-other');
        }
      } else if (type === 'unlock') {
        const { element_id } = data;
        const canvas = this.bpmnModeler.get('canvas');
        canvas.removeMarker(element_id, 'locked-by-other');
      } else if (type === 'bulk_unlock') {
        const { element_ids } = data;
        const canvas = this.bpmnModeler.get('canvas');
        (element_ids as string[]).forEach((eid) =>
          canvas.removeMarker(eid, 'locked-by-other'),
        );
      }
    };
  }

  // Helper methods
  private applyLocks(locks: LocksMap | null | undefined) {
    if (!locks) return;
    const canvas = this.bpmnModeler.get('canvas');
    Object.entries(locks).forEach(([elementId, userId]) => {
      if (userId !== this.selfId) {
        canvas.addMarker(elementId, 'locked-by-other');
      }
    });
  }

  private attachModelerEvents() {
    const eventBus = this.bpmnModeler.get('eventBus');

    const sendDiagramUpdate = this.debounce(async () => {
      await this.broadcastDiagramUpdate();
    }, 400);

    eventBus.on('commandStack.changed', () => {
      sendDiagramUpdate();
    });

    eventBus.on('selection.changed', (event: any) => {
      const newSelection = event.newSelection || [];
      const newElement = newSelection[0] || null;
      const newId: string | null = newElement ? newElement.id : null;

      if (newId && newId !== this.myLockedElementId) {
        if (this.myLockedElementId) {
          this.sendUnlock(this.myLockedElementId);
        }
        this.myLockedElementId = newId;
        this.sendLock(newId);
      } else if (!newId && this.myLockedElementId) {
        this.sendUnlock(this.myLockedElementId);
        this.myLockedElementId = null;
      }
    });
  }

  private async broadcastDiagramUpdate() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const { xml } = await this.bpmnModeler.saveXML({ format: true });
      this.socket.send(
        JSON.stringify({
          type: 'update_diagram',
          bpmn_xml: xml,
        }),
      );
    } catch (err) {
      console.error('Error sending full diagram to server', err);
    }
  }

  private sendLock(elementId: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'lock_element',
        element_id: elementId,
      }),
    );
  }

  private sendUnlock(elementId: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'unlock_element',
        element_id: elementId,
      }),
    );
  }

  private debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timer: any = null;
    return ((...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }) as T;
  }
}
