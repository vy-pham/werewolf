import { Component, inject } from '@angular/core';
import { HeaderService } from './header.service';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';
import { InputComponent } from '../input/input.component';
import { CommonModule } from '@angular/common';

@Component({
  imports: [ButtonComponent, ModalComponent, InputComponent, CommonModule],
  providers: [HeaderService],
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
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
