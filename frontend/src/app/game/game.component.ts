import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../shared/services/game/game.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RoleService } from '../shared/services/role/role.service';
import { BehaviorSubject } from 'rxjs';
import { ClassNamePipe } from '../shared/pipes/class-name.pipe';
import { Roles } from '../../graphql/types';

@Component({
  selector: 'app-game',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, ClassNamePipe],
  templateUrl: './game.component.html',
})
export class GameComponent {
  router = inject(Router);
  gameService = inject(GameService);
  formBuilder = new FormBuilder().nonNullable;
  roleService = inject(RoleService);

  ordered = {
    [Roles.Guard]: 0,
    [Roles.Werewolf]: 1,
    [Roles.Seer]: 2,
    [Roles.Witch]: 3,
    [Roles.Hunter]: 4,
    [Roles.Villager]: -1,
  };

  set selectedTarget(v: string | null) {
    this.selectedTarget$.next(v);
  }
  get selectedTarget() {
    return this.selectedTarget$.value;
  }
  selectedTarget$ = new BehaviorSubject<string | null>(null);

  get currentTurn() {
    if (!this.gameService.currentGame) return null;
    const roles = this.gameService.currentGame.players.map((o) => o.role);
    const gameRoles = Array.from(new Set(roles.map((o) => o.enum)));
    const nightActions = this.ordered[gameRoles[0]];

    if (!this.gameService.currentAction) {
      return {
        turnOf: Roles.Guard,
        ability: this.gameService.currentGame?.abilities.find(
          (o) => o.ability.roleId
        ),
      };
    }
    return null;
  }

  ngOnInit() {
    if (!this.gameService.currentGame) {
      this.gameService.getCurrentGame$.subscribe((data) => {
        if (!data) {
          this.router.navigateByUrl('/');
        }
      });
    }
  }

  nextRound() {
    if (!this.gameService.currentGame) return;
    this.gameService.createRound$(this.gameService.currentGame.id).subscribe();
  }

  selectTarget(playerId: string) {
    if (this.selectedTarget === playerId) this.selectedTarget = null;
    else this.selectedTarget = playerId;
  }

  commitAction() {}
}
