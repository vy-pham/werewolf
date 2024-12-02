import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../shared/services/game/game.service';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  type FormControl,
} from '@angular/forms';
import { InputComponent } from '../shared/components/input/input.component';
import { ButtonComponent } from '../shared/components/button/button.component';
import { SelectComponent } from '../shared/components/select/select.component';
import { RoleService } from '../shared/services/role/role.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    SelectComponent,
  ],
  templateUrl: './game.component.html',
})
export class GameComponent {
  router = inject(Router);
  gameService = inject(GameService);
  formBuilder = new FormBuilder().nonNullable;
  roleService = inject(RoleService);

  formPlayers = this.formBuilder.array<
    FormGroup<{
      id: FormControl<string>;
      roleId: FormControl<string>;
      virtual: FormControl<string>;
    }>
  >([]);

  roles$ = this.roleService.roles$.pipe(
    map((roles) => roles.map((role) => ({ value: role.id, label: role.name })))
  );

  ngOnInit() {
    if (!this.gameService.currentGame) {
      this.gameService.getCurrentGame$.subscribe((data) => {
        if (!data) {
          this.router.navigateByUrl('/');
        }
      });
    }

    this.gameService.currentGame$.subscribe((currentGame) => {
      if (!currentGame) return;
      const players = currentGame.players;
      players
        .filter((o) => o.virtual)
        .forEach((player) => {
          const formGroup = this.formBuilder.group({
            id: player.id,
            roleId: '',
            virtual: player.virtual || '',
          });
          this.formPlayers.push(formGroup);
        });
    });
  }

  startGame() {
    console.log(this.formPlayers.value);
  }
}
