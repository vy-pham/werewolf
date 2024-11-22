import { Component, inject } from '@angular/core';
import { RoomService } from '../shared/services/room/room.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../shared/components/button/button.component';
import { InputComponent } from '../shared/components/input/input.component';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { GetRoleNamePipe } from '../shared/pipes/get-role-name.pipe';
import { RoomType } from '../../graphql/types';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    InputComponent,
    ReactiveFormsModule,
    GetRoleNamePipe,
  ],
  providers: [RoomService],
  templateUrl: './lobby.component.html',
})
export class LobbyComponent {
  formBuilder = new FormBuilder().nonNullable;
  roomService = inject(RoomService);
  router = inject(Router);
  roomType = RoomType;

  tempPlayers = this.formBuilder.array<FormControl<string>>([]);

  ngOnInit() {
    if (!this.roomService.currentRoom) {
      this.roomService.getCurrentRoom$.subscribe((result) => {
        if (!result) this.router.navigateByUrl('/');
      });
    }
  }

  addPlayer() {
    this.tempPlayers.controls.push(this.formBuilder.control(''));
    this.tempPlayers.markAllAsTouched();
    this.tempPlayers.touched;
  }

  onUpdate() {
    const { rolesConfig, name } = this.roomService.form.value;
    if (
      this.roomService.form.valid &&
      rolesConfig &&
      this.roomService.currentRoom &&
      name
    ) {
      console.log(rolesConfig);

      this.roomService
        .updateRoom$({
          id: this.roomService.currentRoom.id,
          name,
          rolesConfig: rolesConfig
            .filter((o) => o.checked)
            .map((o) => o.roleId!),
          type: RoomType.Support,
        })
        .subscribe();
    }
  }
}
