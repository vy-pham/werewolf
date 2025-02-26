import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  CREATE_ACTION,
  CREATE_GAME_MUTATION,
  CURRENT_GAME_QUERY,
  MUTATION_CREATE_ROUND,
} from './game.queries';
import type {
  ActionFragment,
  CreateGameMutation,
  CreateGameMutationVariables,
  CreateGameRoundActionMutation,
  CreateGameRoundActionMutationVariables,
  CreateRoundMutation,
  CreateRoundMutationVariables,
  CurrentGameQuery,
  GameFragment,
  PlayerFragment,
  RoundFragment,
} from '../../../../graphql/queries';
import { BehaviorSubject, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Roles, type GameRoundActionInput } from '../../../../graphql/types';

@Injectable({ providedIn: 'root' })
export class GameService {
  apollo = inject(Apollo);
  toastr = inject(ToastrService);
  ordered = {
    [Roles.Guard]: 0,
    [Roles.Werewolf]: 1,
    [Roles.Seer]: 2,
    [Roles.Witch]: 3,
    [Roles.Hunter]: 4,
  };

  get players() {
    return this.players$.value;
  }
  set players(v: PlayerFragment[]) {
    this.players$.next(v);
  }
  players$ = new BehaviorSubject<PlayerFragment[]>([]);

  //====================================

  set currentGame(v: GameFragment | null) {
    this.currentGame$.next(v);
  }
  get currentGame() {
    return this.currentGame$.value;
  }
  currentGame$ = new BehaviorSubject<null | GameFragment>(null);

  //====================================

  set currentRound(v: RoundFragment | null) {
    this.currentRound$.next(v);
  }
  get currentRound() {
    return this.currentRound$.value;
  }
  currentRound$ = new BehaviorSubject<null | RoundFragment>(null);

  //====================================

  set currentAction(v: ActionFragment | null) {
    this.currentAction$.next(v);
  }
  get currentAction() {
    return this.currentAction$.value;
  }
  currentAction$ = new BehaviorSubject<null | ActionFragment>(null);

  //====================================

  get currentTurn() {
    if (!this.currentAction) {
      return {
        turnOf: Roles.Guard,
        ability: this.currentGame?.abilities.find((o) => o.ability.roleId),
      };
    }
    return null;
  }

  //====================================

  getCurrentGame$ = this.apollo
    .query<CurrentGameQuery>({
      query: CURRENT_GAME_QUERY,
    })
    .pipe(
      map(({ data }) => {
        if (data.currentGame?.__typename === 'GameModel_Single') {
          this.currentGame = data.currentGame.data || null;
          this.currentRound = this.currentGame.rounds.slice(-1)[0];
          this.currentAction = this.currentRound.actions.slice(-1)[0];
          this.players = this.currentGame.players;
        } else {
          this.currentGame = null;
        }
        return this.currentGame;
      })
    );

  createGame$(roomId: string) {
    return this.apollo
      .mutate<CreateGameMutation, CreateGameMutationVariables>({
        mutation: CREATE_GAME_MUTATION,
        variables: {
          input: { roomId: roomId },
        },
      })
      .pipe(
        map(({ data }) => {
          if (data?.createGame.__typename === 'GameModel_Mutation') {
            this.toastr.success(data.createGame.message);
            this.currentGame = data.createGame.data;
            this.currentRound = this.currentGame.rounds.slice(-1)[0];
            this.currentAction = this.currentRound.actions.slice(-1)[0];
            return true;
          } else {
            this.toastr.error(data?.createGame.message || 'Unknown Error');
            return false;
          }
        })
      );
  }

  createRound$(gameId: string) {
    return this.apollo
      .mutate<CreateRoundMutation, CreateRoundMutationVariables>({
        mutation: MUTATION_CREATE_ROUND,
        variables: {
          input: { gameId },
        },
      })
      .pipe(
        map(({ data }) => {
          if (data?.createRound.__typename === 'GameRoundModel_Mutation') {
            this.toastr.success(data.createRound.message);
            this.currentRound = data.createRound.data;
            this.currentAction = this.currentRound.actions.slice(-1)[0];
            return true;
          } else {
            this.toastr.error(data?.createRound.message || 'Unknown Error');
            return false;
          }
        })
      );
  }

  createAction$(input: GameRoundActionInput) {
    return this.apollo
      .mutate<
        CreateGameRoundActionMutation,
        CreateGameRoundActionMutationVariables
      >({
        mutation: CREATE_ACTION,
        variables: { input },
      })
      .pipe(
        map(({ data }) => {
          if (
            data?.createGameRoundAction.__typename ===
            'GameRoundActionModel_Mutation'
          ) {
            this.toastr.success(data.createGameRoundAction.message);
            this.currentAction = data.createGameRoundAction.data;
          } else {
            this.toastr.error(data?.createGameRoundAction.message);
          }
        })
      );
  }
}
