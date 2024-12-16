import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../shared/services/game/game.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RoleService } from '../shared/services/role/role.service';
import { BehaviorSubject } from 'rxjs';
import { ClassNamePipe } from '../shared/pipes/class-name.pipe';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, ClassNamePipe],
  templateUrl: './game.component.html',
})
export class GameComponent {
  router = inject(Router);
  gameService = inject(GameService);
  formBuilder = new FormBuilder().nonNullable;
  roleService = inject(RoleService);

  set selectedTarget(v: string | null) {
    this.selectedTarget$.next(v);
  }
  get selectedTarget() {
    return this.selectedTarget$.value;
  }
  selectedTarget$ = new BehaviorSubject<string | null>(null);

  ngOnInit() {
    if (!this.gameService.currentGame) {
      this.gameService.getCurrentGame$.subscribe((data) => {
        if (!data) {
          this.router.navigateByUrl('/');
        }
        console.log(this.gameService.currentRound);
      });
    }
  }

  nextRound() {
    if (!this.gameService.currentGame) return;
    this.gameService.createRound$(this.gameService.currentGame.id).subscribe();
  }

  // nextAction() {
  //   this.gameService.actions = [
  //     ...this.gameService.actions,
  //     { type: this.gameService.ordered[1] },
  //   ];
  // }

  selectTarget(playerId: string) {
    if (this.selectedTarget === playerId) this.selectedTarget = null;
    else this.selectedTarget = playerId;
  }

  commitAction() {}
}
