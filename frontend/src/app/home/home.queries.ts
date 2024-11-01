import { gql } from '../../__generated__';

export const GET_MY_USER = gql(
  `
  query  QueryMe{
    me {
      id
    }
  }
`
);

export const MUTATION_CREATE_USER = gql(`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ... on ErrorOutput {
        errors
      }
      ... on BaseResponse {
        message
        statusCode
      }
    }
  }
`);
