import { gql } from 'apollo-angular';

export const MUTATION_CREATE_ROOM = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      ... on RoomModel_Mutation {
        data {
          id
          maxPlayers
          name
          players {
            id
            isHost
            user {
              email
              id
              username
            }
          }
          rolesConfig {
            id
            role {
              description
              enum
              id
              name
              point
            }
          }
          status
        }
      }

      ... on BaseResponse {
        message
        statusCode
      }
    }
  }
`;

export const QUERY_CURRENT_ROOM = gql`
  query CurrentRoom {
    currentRoom {
      ... on RoomModel_Single {
        data {
          id
          maxPlayers
          name
          players {
            id
            isHost
            user {
              email
              id
              username
            }
          }
          rolesConfig {
            id
            role {
              description
              enum
              id
              name
              point
            }
          }
          status
        }
      }

      ... on BaseResponse {
        message
      }
    }
  }
`;
