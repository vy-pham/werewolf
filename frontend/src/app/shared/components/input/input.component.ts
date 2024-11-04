import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './input.component.html',
})
export class InputComponent {
  @Input() formControl!: FormControl<any>;
  @Input() type = 'text';
  @Input() placeholder = '';
}
