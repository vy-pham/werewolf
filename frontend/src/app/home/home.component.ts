import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { HomeService } from './home.service';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { RoleService } from '../shared/services/role/role.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../shared/components/input/input.component';
import { GetRoleNamePipe } from '../shared/pipes/get-role-name.pipe';
import { RoomService } from '../shared/services/room/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    ModalComponent,
    ReactiveFormsModule,
    FormsModule,
    InputComponent,
    GetRoleNamePipe,
  ],
  providers: [HomeService],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeService = inject(HomeService);
  roomService = inject(RoomService);
  roleService = inject(RoleService);
}
