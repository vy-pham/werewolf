import { Component, inject } from '@angular/core';
import { RoomService } from '../shared/services/room/room.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../shared/components/button/button.component';
import { CreateArrayPipe } from '../shared/pipes/create-array.pipe';
import { InputComponent } from '../shared/components/input/input.component';
import { ReactiveFormsModule } from '@angular/forms';
import { GetRoleNamePipe } from '../shared/pipes/get-role-name.pipe';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CreateArrayPipe,
    InputComponent,
    ReactiveFormsModule,
    GetRoleNamePipe,
  ],
  providers: [RoomService],
  templateUrl: './lobby.component.html',
})
export class LobbyComponent {
  roomService = inject(RoomService);
  router = inject(Router);

  ngOnInit() {
    if (!this.roomService.currentRoom) {
      this.roomService.getCurrentRoom$.subscribe((result) => {
        if (!result) this.router.navigateByUrl('/');
      });
    }
  }
}
