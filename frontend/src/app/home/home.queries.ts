import { gql } from 'apollo-angular';

export const GET_MY_USER = gql`
  query Me {
    me {
      ... on Me_Single {
        data {
          id
        }
      }
      ... on BaseResponse {
        statusCode
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginUserInput!) {
    login(input: $input) {
      ... on BaseResponse {
        message
        statusCode
      }
      ... on UserToken_Mutation {
        data {
          token
        }
      }
    }
  }
`;
