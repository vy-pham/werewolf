import * as Types from './types';

export type LoginMutationVariables = Types.Exact<{
  input: Types.LoginUserInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'UserToken_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'UserToken', token: string } } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'ErrorOutput', statusCode: Types.HttpCode } | { __typename?: 'Me_Single', statusCode: Types.HttpCode, data: { __typename?: 'Me', id: string, username: string } } };
