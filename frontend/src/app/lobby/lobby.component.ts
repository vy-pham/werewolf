import { Component, inject } from '@angular/core';
import { RoomService } from '../shared/services/room/room.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../shared/components/button/button.component';
import { InputComponent } from '../shared/components/input/input.component';
import {
  FormBuilder,
  ReactiveFormsModule,
  type FormControl,
  type FormGroup,
} from '@angular/forms';
import { GameStatus, RoomType } from '../../graphql/types';
import { map, switchMap } from 'rxjs';
import { GameService } from '../shared/services/game/game.service';
import { SelectComponent } from '../shared/components/select/select.component';
import { RoleService } from '../shared/services/role/role.service';

@Component({
  selector: 'app-lobby',
  imports: [
    CommonModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    ReactiveFormsModule,
  ],
  providers: [RoomService],
  templateUrl: './lobby.component.html',
  standalone: true,
})
export class LobbyComponent {
  formBuilder = new FormBuilder().nonNullable;
  roomService = inject(RoomService);
  router = inject(Router);
  gameService = inject(GameService);
  roleService = inject(RoleService);
  roomType = RoomType;
  gameStatus = GameStatus;
  tempPlayers = this.formBuilder.array<
    FormGroup<{
      virtual: FormControl<string>;
      roleId: FormControl<string>;
      id: FormControl<string>;
    }>
  >([]);
  virtualPlayers$ = this.roomService.currentRoom$.pipe(
    map((room) => {
      return room?.players.filter((o) => o.virtual) || [];
    })
  );

  roles$ = this.roleService.roles$.pipe(
    map((roles) =>
      roles.map((role) => ({
        label: role.name,
        value: role.id,
      }))
    )
  );

  ngOnInit() {
    if (!this.roomService.currentRoom) {
      this.roomService.getCurrentRoom$.subscribe((result) => {
        if (!result) return this.router.navigateByUrl('/');
        return this.gameService.getCurrentGame$.subscribe();
      });
    }
    this.virtualPlayers$.subscribe((players) => {
      this.tempPlayers.clear();
      players.forEach((player) => {
        const groupPlayer = this.formBuilder.group({
          virtual: player.virtual || '',
          roleId: player.role?.id || '',
          id: player.id,
        });
        this.tempPlayers.push(groupPlayer);
      });
    });
  }
  addTempPlayer() {
    const groupPlayer = this.formBuilder.group({
      virtual: '',
      roleId: '',
      id: '-1',
    });
    this.tempPlayers.push(groupPlayer);
  }

  addPlayer() {
    if (this.roomService.currentRoom) {
      this.tempPlayers.markAsUntouched();
      this.roomService
        .updateRoomPlayers$({
          roomId: this.roomService.currentRoom.id,
          data: this.tempPlayers.value.map((o) => ({
            id: o.id,
            roleId: o.roleId!,
            virtual: o.virtual!,
          })),
        })
        .pipe(switchMap(() => this.roomService.getCurrentRoom$))
        .subscribe();
    }
  }

  onUpdate() {
    const { name, werewolfQuantity } = this.roomService.form.value;
    if (
      this.roomService.form.valid &&
      this.roomService.currentRoom &&
      werewolfQuantity &&
      name
    ) {
      this.roomService
        .updateRoom$({
          id: this.roomService.currentRoom.id,
          name,
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
