import { Component } from '@angular/core';
import { DiagramEditorComponent } from './diagram-editor/diagram-editor.component';

@Component({
  selector: 'bpmn-app-root',
  standalone: true,
  imports: [DiagramEditorComponent],
  template: '<app-diagram-editor></app-diagram-editor>'
})
export class AppComponent {}
