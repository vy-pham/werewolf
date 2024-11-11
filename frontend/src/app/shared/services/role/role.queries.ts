import { gql } from 'apollo-angular';
export const QUERY_ROLES = gql`
  query Roles {
    roles {
      ... on RoleModel_List {
        data {
          description
          enum
          id
          name
          point
          status
        }
      }
    }
  }
`;
