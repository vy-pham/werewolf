import { gql } from 'apollo-angular';
export const GET_MY_USER = gql`
  query Me {
    me {
      ... on Me_Single {
        data {
          id
          username
        }
      }
      ... on BaseResponse {
        statusCode
      }
    }
  }
`;
