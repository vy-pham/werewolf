import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../shared/services/game/game.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RoleService } from '../shared/services/role/role.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './game.component.html',
})
export class GameComponent {
  router = inject(Router);
  gameService = inject(GameService);
  formBuilder = new FormBuilder().nonNullable;
  roleService = inject(RoleService);

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
}
