import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { HomeService } from './home.service';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { InputComponent } from '../shared/components/input/input.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonComponent, ModalComponent, CommonModule, InputComponent],
  providers: [HomeService],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeService = inject(HomeService);
}
