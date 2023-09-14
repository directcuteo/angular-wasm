import { Component } from '@angular/core';
import { SmartContract } from 'o1js';

/* Commenting next line will stop the error */
class TestContract extends SmartContract {}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-wasm';
}
