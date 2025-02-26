import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  Host,
  Input,
  Optional,
  SkipSelf,
  type OnInit,
} from '@angular/core';
import { ClassNamePipe } from '../../pipes/class-name.pipe';
import {
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  AbstractControl,
  ControlContainer,
} from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule, CommonModule, ClassNamePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  templateUrl: './input.component.html',
  standalone: true,
})
export class InputComponent implements ControlValueAccessor, OnInit {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type = 'text';
  @Input() errorMessage = '';
  @Input() formControlName!: string | number;
  @Input() control!: AbstractControl<any, any>;

  value: any = '';
  isDisabled: boolean = false;

  constructor(
    @Optional()
    @Host()
    @SkipSelf()
    private controlContainer: ControlContainer
  ) {}
  ngOnInit() {
    if (this.controlContainer) {
      if (this.formControlName !== undefined) {
        this.control = this.controlContainer.control!.get<string>(
          this.formControlName.toString()
        )!;
      } else {
        console.warn(
          'Missing FormControlName directive from host element of the component'
        );
      }
    }
  }

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onInput(event: any) {
    let value = event.target.value;
    if (this.type === 'number') {
      value = Number(value);
    }
    this.value = value;
    this.onChange(this.value);
  }

  onBlur() {
    this.onTouched();
  }
}
