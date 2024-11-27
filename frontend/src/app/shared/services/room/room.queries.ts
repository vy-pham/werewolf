import { gql } from 'apollo-angular';
const RoomFragment = gql`
  fragment RoomData on RoomModel {
    id
    name
    type
    werewolfQuantity
    status
    players {
      id
      isHost
      virtual
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
  }
`;

export const MUTATION_CREATE_ROOM = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      ... on RoomModel_Mutation {
        data {
          ...RoomData
        }
      }

      ... on BaseResponse {
        message
        statusCode
      }
    }
  }
  ${RoomFragment}
`;

export const MUTATION_UPDATE_ROOM = gql`
  mutation UpdateRoom($input: UpdateRoomInput!) {
    updateRoom(input: $input) {
      ... on RoomModel_Mutation {
        data {
          ...RoomData
        }
      }

      ... on BaseResponse {
        message
        statusCode
      }
    }
  }
  ${RoomFragment}
`;
export const QUERY_CURRENT_ROOM = gql`
  query CurrentRoom {
    currentRoom {
      ... on RoomModel_Single {
        data {
          ...RoomData
        }
      }

      ... on BaseResponse {
        message
      }
    }
  }
  ${RoomFragment}
`;

export const MUTATION_ROOM_PLAYER = gql`
  mutation UpdateRoomPlayer($input: UpdateRoomPlayerInput!) {
    updateRoomPlayer(input: $input) {
      ... on RoomPlayerModel_List_Mutation {
        data {
          id
          virtual
        }
      }
    }
  }
`;
