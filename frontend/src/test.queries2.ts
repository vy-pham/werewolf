import { gql } from 'apollo-angular';

const ABC = gql`
  query Query {
    quests {
      ... on ErrorOutput {
        message
      }
      ... on QuestModelList {
        data {
          bannerUrl
        }
        message
        statusCode
      }
    }
  }
`;

const DEF = gql`
  query Query2 {
    quest {
      ... on ErrorOutput {
        message
      }
      ... on QuestModelSingle {
        data {
          bannerUrl
        }
        message
        statusCode
      }
    }
  }
`;

export type CreateGameMutation = {
  __typename?: 'Mutation';
  createGame:
    | { __typename?: 'ErrorOutput'; message: string }
    | {
        __typename?: 'GameModel_Mutation';
        message: string;
        data: {
          __typename?: 'GameModel';
          id: string;
          roomId: number;
          players: Array<{
            __typename?: 'GamePlayerModel';
            id: string;
            virtual?: string | null;
            role: {
              __typename?: 'RoleModel';
              description: string;
              id: string;
              name: string;
              point: number;
            };
          }>;
          rounds: Array<{
            __typename?: 'GameRoundModel';
            id: string;
            sequence: number;
            actions: Array<{
              __typename?: 'GameRoundActionModel';
              booleanResult?: boolean | null;
              id: string;
              target: {
                __typename?: 'GamePlayerModel';
                id: string;
                virtual?: string | null;
              };
            }>;
          }>;
          abilities: Array<{
            __typename?: 'GameAbilityModel';
            abilityId: string;
            gameId: string;
            id: string;
            totalUses: number;
            usesThisRound: number;
            ability: {
              __typename?: 'RoleAbilityModel';
              description: string;
              id: string;
              name: string;
              roleId: string;
              totalUses: number;
              usesPerRound: number;
            };
          }>;
        };
      };
};

export type QueryQuery = {
  __typename?: 'Query';
  quests:
    | {
        __typename?: 'ErrorOutput';
        errors: any;
        message: string;
      }
    | {
        __typename?: 'QuestModelList';
        message: string;
        data: Array<{ __typename?: 'QuestModel'; bannerUrl: string }>;
      };
};

export type Query2Query = {
  __typename?: 'Query';
  quest:
    | { __typename?: 'ErrorOutput'; message: string }
    | {
        __typename?: 'QuestModelSingle';
        message: string;
        data?: { __typename?: 'QuestModel'; bannerUrl: string } | null;
      }
    | null;
};

export type ExtractDataType<T> = T extends {
  __typename?: Exclude<String, 'ErrorOutput'>;
  data?: infer D;
}
  ? D extends {}
    ? keyof D extends never
      ? never
      : D
    : never
  : never;

type A = ExtractDataType<Query2Query['quest']>;
