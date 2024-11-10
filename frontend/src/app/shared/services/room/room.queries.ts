import { gql } from 'apollo-angular';

export const MUTATION_CREATE_ROOM = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      ... on Room_Mutation {
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
      ... on Room_Single {
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
          status
        }
      }

      ... on BaseResponse {
        message
      }
    }
  }
`;
