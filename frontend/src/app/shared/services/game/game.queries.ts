import { gql } from 'apollo-angular';

export const GAME_FRAGMENT = gql`
  fragment GameData on GameModel {
    id
    players {
      id
      role {
        description
        enum
        id
        name
        point
        side
        status
      }
      status
      virtual
    }
    roomId
    status
  }
`;

export const CREATE_GAME_MUTATION = gql`
  mutation CreateGame($input: CreateGameInput!) {
    createGame(input: $input) {
      ... on ErrorOutput {
        message
      }
      ... on GameModel_Mutation {
        message
        data {
          ...GameData
        }
      }
    }
  }
  ${GAME_FRAGMENT}
`;

export const CURRENT_GAME_QUERY = gql`
  query CurrentGame {
    currentGame {
      ... on ErrorOutput {
        message
      }
      ... on GameModel_Single {
        message
        data {
          ...GameData
        }
      }
    }
  }
  ${GAME_FRAGMENT}
`;

export const MUTATION_CREATE_ROUND = gql`
  mutation CreateRound($input: CreateRoundInput!) {
    createRound(input: $input) {
      ... on ErrorOutput {
        message
      }
      ... on GameRoundModel_Mutation {
        data {
          id
          sequence
          time
        }
        message
      }
    }
  }
`;
