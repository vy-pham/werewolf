import { gql } from '../../__generated__';

export const GET_MY_USER = gql(
  `
  query  QueryMe{
    me {
      id
    }
    users {
      id
      email
    }
  }
`
);
