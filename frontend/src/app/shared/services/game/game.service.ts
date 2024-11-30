import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { CREATE_GAME_MUTATION, CURRENT_GAME_QUERY } from './game.queries';
import type {
  CreateGameMutation,
  CreateGameMutationVariables,
  CurrentGameQuery,
} from '../../../../graphql/queries';
import { BehaviorSubject, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import type { ExtractDataType } from '../../entities/utils.entities';

type CurrentGame = ExtractDataType<CreateGameMutation['createGame']>;

@Injectable({ providedIn: 'root' })
export class GameService {
  apollo = inject(Apollo);
  toastr = inject(ToastrService);

  set currentGame(v: CurrentGame | null) {
    this.currentGame$.next(v);
  }
  get currentGame() {
    return this.currentGame$.value;
  }
  currentGame$ = new BehaviorSubject<null | CurrentGame>(null);
  getCurrentGame$ = this.apollo
    .query<CurrentGameQuery>({
      query: CURRENT_GAME_QUERY,
    })
    .pipe(
      map(({ data }) => {
        if (data.currentGame?.__typename === 'GameModel_Single') {
          this.currentGame = data.currentGame.data || null;
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
}
