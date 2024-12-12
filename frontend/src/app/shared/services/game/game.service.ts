import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  CREATE_ACTION,
  CREATE_GAME_MUTATION,
  CURRENT_GAME_QUERY,
  MUTATION_CREATE_ROUND,
} from './game.queries';
import type {
  CreateGameMutation,
  CreateGameMutationVariables,
  CreateGameRoundActionMutation,
  CreateGameRoundActionMutationVariables,
  CreateRoundMutation,
  CreateRoundMutationVariables,
  CurrentGameQuery,
} from '../../../../graphql/queries';
import { BehaviorSubject, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import type { ExtractDataType } from '../../entities/utils.entities';
import { Roles, type GameRoundActionInput } from '../../../../graphql/types';

type CurrentGame = ExtractDataType<CreateGameMutation['createGame']>;
type CurrentRound = ExtractDataType<CreateRoundMutation['createRound']>;

@Injectable({ providedIn: 'root' })
export class GameService {
  apollo = inject(Apollo);
  toastr = inject(ToastrService);
  ordered = [
    Roles.Guard,
    Roles.Werewolf,
    Roles.Seer,
    Roles.Witch,
    Roles.Hunter,
  ];

  set currentGame(v: CurrentGame | null) {
    this.currentGame$.next(v);
  }
  get currentGame() {
    return this.currentGame$.value;
  }
  currentGame$ = new BehaviorSubject<null | CurrentGame>(null);

  set currentRound(v: CurrentRound | null) {
    this.currentRound$.next(v);
  }
  get currentRound() {
    return this.currentRound$.value;
  }
  currentRound$ = new BehaviorSubject<null | CurrentRound>(null);

  set actions(v: { type: Roles }[]) {
    this.actions$.next(v);
  }
  get actions() {
    return this.actions$.value;
  }
  actions$ = new BehaviorSubject<{ type: Roles }[]>([]);

  get lastAction() {
    return this.actions[this.actions.length - 1];
  }
  get currentAction() {
    if (!this.lastAction) {
      return this.ordered[0];
    } else {
      const index = this.ordered.findIndex((o) => o === this.lastAction.type);
      return this.ordered[index];
    }
  }

  get nextAction() {
    if (!this.lastAction) {
      return this.ordered[1];
    } else {
      const index = this.ordered.findIndex((o) => o === this.lastAction.type);
      return this.ordered[index + 1];
    }
  }

  getCurrentGame$ = this.apollo
    .query<CurrentGameQuery>({
      query: CURRENT_GAME_QUERY,
    })
    .pipe(
      map(({ data }) => {
        if (data.currentGame?.__typename === 'GameModel_Single') {
          this.currentGame = data.currentGame.data || null;
          this.currentRound =
            data.currentGame.data.rounds[
              data.currentGame.data.rounds.length - 1
            ] || null;
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
            return true;
          } else {
            this.toastr.error(data?.createRound.message || 'Unknown Error');
            return false;
          }
        })
      );
  }

  createAction$(input: GameRoundActionInput) {
    return this.apollo.mutate<
      CreateGameRoundActionMutation,
      CreateGameRoundActionMutationVariables
    >({
      mutation: CREATE_ACTION,
      variables: { input },
    });
  }
}
