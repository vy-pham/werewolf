import { gql } from 'apollo-angular';

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
