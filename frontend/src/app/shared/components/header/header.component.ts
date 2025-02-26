import { Component, inject } from '@angular/core';
import { HeaderService } from './header.service';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../input/input.component';

@Component({
  imports: [
    ButtonComponent,
    ModalComponent,
    CommonModule,
    ReactiveFormsModule,
    InputComponent,
  ],
  providers: [HeaderService],
  selector: 'app-header',
  templateUrl: './header.component.html',
  standalone: true,
})
export class HeaderComponent {
  headerService = inject(HeaderService);
  openModal() {
    this.headerService.isShowModal = true;
  }

  onClose() {
    this.headerService.isShowModal = false;
  }
}
