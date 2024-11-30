import { Component, inject } from '@angular/core';
import { RoomService } from '../shared/services/room/room.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../shared/components/button/button.component';
import { InputComponent } from '../shared/components/input/input.component';
import {
  FormBuilder,
  ReactiveFormsModule,
  type FormArray,
} from '@angular/forms';
import { GetRoleNamePipe } from '../shared/pipes/get-role-name.pipe';
import { RoomType } from '../../graphql/types';
import { map, switchMap } from 'rxjs';
import { GameService } from '../shared/services/game/game.service';

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
  gameService = inject(GameService);
  roomType = RoomType;
  formTempPlayers = this.formBuilder.group({
    tempPlayers: this.formBuilder.array<string>([]),
  });
  virtualPlayers$ = this.roomService.currentRoom$.pipe(
    map((room) => {
      return room?.players.filter((o) => o.virtual) || [];
    })
  );
  get tempPlayers(): FormArray {
    return this.formTempPlayers.get('tempPlayers') as FormArray;
  }
  ngOnInit() {
    if (!this.roomService.currentRoom) {
      this.roomService.getCurrentRoom$.subscribe((result) => {
        if (!result) this.router.navigateByUrl('/');
      });
    }
    this.virtualPlayers$.subscribe((players) => {
      this.tempPlayers.clear();
      players.forEach((player) =>
        this.tempPlayers.push(this.formBuilder.control(player.virtual))
      );
    });
  }
  addTempPlayer() {
    this.tempPlayers.push(this.formBuilder.control(''));
  }

  addPlayer() {
    if (this.roomService.currentRoom) {
      this.formTempPlayers.markAsUntouched();
      this.roomService
        .updateRoomPlayers$({
          roomId: this.roomService.currentRoom.id,
          virtualPlayers:
            this.formTempPlayers.controls.tempPlayers.value.filter((o) => o),
        })
        .pipe(switchMap(() => this.roomService.getCurrentRoom$))
        .subscribe();
    }
  }

  onUpdate() {
    const { rolesConfig, name, werewolfQuantity } = this.roomService.form.value;
    if (
      this.roomService.form.valid &&
      this.roomService.currentRoom &&
      werewolfQuantity &&
      rolesConfig &&
      name
    ) {
      this.roomService
        .updateRoom$({
          id: this.roomService.currentRoom.id,
          name,
          rolesConfig: rolesConfig
            .filter((o) => o.checked)
            .map((o) => o.roleId!),
          werewolfQuantity,
        })
        .subscribe();
    }
  }

  startGame() {
    if (this.roomService.currentRoom) {
      this.gameService
        .createGame$(this.roomService.currentRoom.id)
        .subscribe((success) => {
          if (success) {
            this.router.navigateByUrl('/game');
          }
        });
    }
  }
}
