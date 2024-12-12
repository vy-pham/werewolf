import * as Types from './types';

export type LoginMutationVariables = Types.Exact<{
  input: Types.LoginUserInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'UserToken_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'UserToken', token: string } } };

export type GameDataFragment = { __typename?: 'GameModel', id: string, roomId: number, status: Types.GameStatus, players: Array<{ __typename?: 'GamePlayerModel', id: string, status: Types.GamePlayerStatus, virtual?: string | null, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, side: Types.RoleSide, status: Types.Status } }>, rounds: Array<{ __typename?: 'GameRoundModel', id: string, sequence: number, time: Types.GameRoundTime }>, abilities: Array<{ __typename?: 'GameAbilityModel', abilityId: string, gameId: string, id: string, totalUses: number, usesThisRound: number, ability: { __typename?: 'RoleAbilityModel', description: string, id: string, name: string, roleId: string, totalUses: number, usesPerRound: number } }> };

export type CreateGameMutationVariables = Types.Exact<{
  input: Types.CreateGameInput;
}>;


export type CreateGameMutation = { __typename?: 'Mutation', createGame: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'GameModel_Mutation', message: string, data: { __typename?: 'GameModel', id: string, roomId: number, status: Types.GameStatus, players: Array<{ __typename?: 'GamePlayerModel', id: string, status: Types.GamePlayerStatus, virtual?: string | null, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, side: Types.RoleSide, status: Types.Status } }>, rounds: Array<{ __typename?: 'GameRoundModel', id: string, sequence: number, time: Types.GameRoundTime }>, abilities: Array<{ __typename?: 'GameAbilityModel', abilityId: string, gameId: string, id: string, totalUses: number, usesThisRound: number, ability: { __typename?: 'RoleAbilityModel', description: string, id: string, name: string, roleId: string, totalUses: number, usesPerRound: number } }> } } };

export type CurrentGameQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type CurrentGameQuery = { __typename?: 'Query', currentGame: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'GameModel_Single', message: string, data: { __typename?: 'GameModel', id: string, roomId: number, status: Types.GameStatus, players: Array<{ __typename?: 'GamePlayerModel', id: string, status: Types.GamePlayerStatus, virtual?: string | null, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, side: Types.RoleSide, status: Types.Status } }>, rounds: Array<{ __typename?: 'GameRoundModel', id: string, sequence: number, time: Types.GameRoundTime }>, abilities: Array<{ __typename?: 'GameAbilityModel', abilityId: string, gameId: string, id: string, totalUses: number, usesThisRound: number, ability: { __typename?: 'RoleAbilityModel', description: string, id: string, name: string, roleId: string, totalUses: number, usesPerRound: number } }> } } };

export type CreateRoundMutationVariables = Types.Exact<{
  input: Types.CreateRoundInput;
}>;


export type CreateRoundMutation = { __typename?: 'Mutation', createRound: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'GameRoundModel_Mutation', message: string, data: { __typename?: 'GameRoundModel', id: string, sequence: number, time: Types.GameRoundTime } } };

export type CreateGameRoundActionMutationVariables = Types.Exact<{
  input: Types.GameRoundActionInput;
}>;


export type CreateGameRoundActionMutation = { __typename?: 'Mutation', createGameRoundAction: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'GameRoundActionModel_Mutation', data: { __typename?: 'GameRoundActionModel', booleanResult: boolean, id: string, statusResult: Types.GamePlayerStatus, turnOf: Types.Roles, target: { __typename?: 'GamePlayerModel', id: string, status: Types.GamePlayerStatus, virtual?: string | null, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, side: Types.RoleSide, status: Types.Status } } } } };

export type RolesQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RolesQuery = { __typename?: 'Query', roles: { __typename?: 'ErrorOutput' } | { __typename?: 'RoleModel_List', data: Array<{ __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, status: Types.Status }> } };

export type RoomDataFragment = { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, role?: { __typename?: 'RoleModel', id: string, name: string } | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> };

export type CreateRoomMutationVariables = Types.Exact<{
  input: Types.CreateRoomInput;
}>;


export type CreateRoomMutation = { __typename?: 'Mutation', createRoom: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'RoomModel_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, role?: { __typename?: 'RoleModel', id: string, name: string } | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } } };

export type UpdateRoomMutationVariables = Types.Exact<{
  input: Types.UpdateRoomInput;
}>;


export type UpdateRoomMutation = { __typename?: 'Mutation', updateRoom: { __typename?: 'ErrorOutput', message: string, statusCode: Types.HttpCode } | { __typename?: 'RoomModel_Mutation', message: string, statusCode: Types.HttpCode, data: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, role?: { __typename?: 'RoleModel', id: string, name: string } | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } } };

export type CurrentRoomQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type CurrentRoomQuery = { __typename?: 'Query', currentRoom?: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'RoomModel_Single', message: string, data?: { __typename?: 'RoomModel', id: string, name: string, type: Types.RoomType, werewolfQuantity: number, status: Types.RoomStatus, players: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, role?: { __typename?: 'RoleModel', id: string, name: string } | null, user?: { __typename?: 'UserModel', email: string, id: string, username: string } | null }>, rolesConfig: Array<{ __typename?: 'RoomRoleModel', id: string, role: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number } }> } | null } | null };

export type UpdateManyRoomPlayerMutationVariables = Types.Exact<{
  input: Types.UpdateManyRoomPlayer;
}>;


export type UpdateManyRoomPlayerMutation = { __typename?: 'Mutation', updateManyRoomPlayer: { __typename?: 'ErrorOutput', message: string } | { __typename?: 'RoomPlayerModel_List_Mutation', message: string, data: Array<{ __typename?: 'RoomPlayerModel', id: string, isHost: boolean, virtual?: string | null, role?: { __typename?: 'RoleModel', description: string, enum: Types.Roles, id: string, name: string, point: number, side: Types.RoleSide, status: Types.Status } | null }> } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'ErrorOutput', statusCode: Types.HttpCode } | { __typename?: 'Me_Single', statusCode: Types.HttpCode, data: { __typename?: 'Me', id: string, username: string } } };
