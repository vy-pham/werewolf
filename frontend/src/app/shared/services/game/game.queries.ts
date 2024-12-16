import { gql } from 'apollo-angular';

export const PLAYER_FRAGMENT = gql`
  fragment Player on GamePlayerModel {
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
`;

export const ACTION_FRAGMENT = gql`
  fragment Action on GameRoundActionModel {
    booleanResult
    id
    statusResult
    target {
      id
      virtual
    }
    turnOf
  }
`;

export const ROUND_FRAGMENT = gql`
  fragment Round on GameRoundModel {
    id
    sequence
    time
    actions {
      ...Action
    }
  }
  ${ACTION_FRAGMENT}
`;

export const GAME_FRAGMENT = gql`
  fragment Game on GameModel {
    id
    players {
      ...Player
    }
    rounds {
      ...Round
    }
    abilities {
      ability {
        description
        id
        name
        roleId
        totalUses
        usesPerRound
      }
      abilityId
      gameId
      id
      totalUses
      usesThisRound
    }
    roomId
    status
  }
  ${ROUND_FRAGMENT}
  ${PLAYER_FRAGMENT}
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
          ...Game
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
          ...Game
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
          ...Round
        }
        message
      }
    }
  }
  ${ROUND_FRAGMENT}
`;

export const CREATE_ACTION = gql`
  mutation CreateGameRoundAction($input: GameRoundActionInput!) {
    createGameRoundAction(input: $input) {
      ... on ErrorOutput {
        message
      }
      ... on GameRoundActionModel_Mutation {
        data {
          booleanResult
          id
          statusResult
          target {
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
          turnOf
        }
        message
      }
    }
  }
`;
