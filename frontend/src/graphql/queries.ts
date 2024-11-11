import * as Types from './types';

export type LoginMutationVariables = Types.Exact<{
  input: Types.LoginUserInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'UserToken_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'UserToken', token: string } } };

export type RolesQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RolesQuery = { __typename?: 'Query', roles: { __typename?: 'ErrorOutput' } | { __typename?: 'RoleModel_List', data: Array<{ __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, status: Types.Status }> } };

export type CreateRoomMutationVariables = Types.Exact<{
  input: Types.CreateRoomInput;
}>;


export type CreateRoomMutation = { __typename?: 'Mutation', createRoom: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'RoomModel_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'RoomModel', id: string, maxPlayers: number, name: string, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayer', id: string, isHost: boolean, user: { __typename?: 'UserModel', email: string, id: string, username: string } }> } } };

export type CurrentRoomQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type CurrentRoomQuery = { __typename?: 'Query', currentRoom?: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'RoomModel_Single', message: string, data?: { __typename?: 'RoomModel', id: string, maxPlayers: number, name: string, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayer', id: string, isHost: boolean, user: { __typename?: 'UserModel', email: string, id: string, username: string } }> } | null } | null };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'ErrorOutput', statusCode: Types.HttpCode } | { __typename?: 'Me_Single', statusCode: Types.HttpCode, data: { __typename?: 'Me', id: string, username: string } } };
