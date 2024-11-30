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

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './game.component.html',
})
export class GameComponent {
  router = inject(Router);
  gameService = inject(GameService);
  formBuilder = new FormBuilder().nonNullable;

  // get players() {
  // return this.formPlayers.get()
  // }
  formPlayers = this.formBuilder.array<
    FormGroup<{ id: FormControl<string>; roleId: FormControl<string> }>
  >([]);

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
      players.forEach((player) => {
        const formGroup = this.formBuilder.group({
          id: player.id,
          roleId: '',
        });
        this.formPlayers.push(formGroup);
      });
    });
  }

  startGame() {
    console.log(this.formPlayers.value);
  }
}
