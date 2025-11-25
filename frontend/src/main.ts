
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/bpmn-app.component';

main();
async function main() {
  bootstrapApplication(AppComponent).catch(err => console.error(err));
}
