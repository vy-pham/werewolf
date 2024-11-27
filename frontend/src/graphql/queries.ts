import * as Types from './types';

export type LoginMutationVariables = Types.Exact<{
  input: Types.LoginUserInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'UserToken_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'UserToken', token: string } } };

export type RolesQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RolesQuery = { __typename?: 'Query', roles: { __typename?: 'ErrorOutput' } | { __typename?: 'RoleModel_List', data: Array<{ __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, status: Types.Status }> } };

export type RoomDataFragment = { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> };

export type CreateRoomMutationVariables = Types.Exact<{
  input: Types.CreateRoomInput;
}>;


export type CreateRoomMutation = { __typename?: 'Mutation', createRoom: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'RoomModel_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } } };

export type UpdateRoomMutationVariables = Types.Exact<{
  input: Types.UpdateRoomInput;
}>;


export type UpdateRoomMutation = { __typename?: 'Mutation', updateRoom: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'RoomModel_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } } };

export type CurrentRoomQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type CurrentRoomQuery = { __typename?: 'Query', currentRoom?: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'RoomModel_Single', message: string, data?: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } | null } | null };

export type UpdateRoomPlayerMutationVariables = Types.Exact<{
  input: Types.UpdateRoomPlayerInput;
}>;


export type UpdateRoomPlayerMutation = { __typename?: 'Mutation', updateRoomPlayer: { __typename?: 'ErrorOutput' } | { __typename?: 'RoomPlayerModel_List_Mutation', data: Array<{ __typename?: 'RoomPlayerModel', id: string, virtual?: string | null }> } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'ErrorOutput', statusCode: Types.HttpCode } | { __typename?: 'Me_Single', statusCode: Types.HttpCode, data: { __typename?: 'Me', id: string, username: string } } };
