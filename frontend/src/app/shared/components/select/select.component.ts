import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output,
  ElementRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
} from '@angular/forms';
import { ClassNamePipe } from '../../pipes/class-name.pipe';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, ClassNamePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  templateUrl: './select.component.html',
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: { label: string; value: string }[] = [];
  @Output() selectedValueChange = new EventEmitter<any>();
  selectedLabel: string | undefined;
  selectedValue: string | undefined;
  onChange: any = () => {};
  onTouched: any = () => {};
  showDropdown = false;

  constructor(private el: ElementRef) {}
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  writeValue(value: any): void {
    this.selectedLabel = this.options.find((o) => o.value === value)?.label;
    this.selectedValue = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {}

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  onSelectionChange(value: string) {
    this.selectedValue = value;
    this.selectedLabel = this.options.find((o) => o.value === value)?.label;
    this.onChange(value);
    this.onTouched();
    this.selectedValueChange.emit(value);
  }
}
