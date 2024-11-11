import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { HomeService } from './home.service';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { InputComponent } from '../shared/components/input/input.component';
import { RoleService } from '../shared/services/role/role.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    ModalComponent,
    InputComponent,
    ReactiveFormsModule,
  ],
  providers: [HomeService],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeService = inject(HomeService);
  roleService = inject(RoleService);
}
