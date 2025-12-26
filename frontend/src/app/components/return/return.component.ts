import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-return',
  imports: [],
  templateUrl: './return.component.html',
  styleUrl: './return.component.scss'
})
export class ReturnComponent {

  constructor(
    private location: Location,
  ) { }

  navigateBack(): void {
    this.location.back();
  }
}
