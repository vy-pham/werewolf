export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
};

export type BaseResponse = {
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type CreateGameInput = {
  roomId: Scalars['ID']['input'];
};

export type CreateRoomInput = {
  name: Scalars['String']['input'];
  type: RoomType;
  werewolfQuantity: Scalars['Float']['input'];
};

export type CreateRoundInput = {
  gameId: Scalars['ID']['input'];
};

export type CreateUserInput = {
  /** Password */
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type ErrorOutput = BaseResponse & {
  __typename?: 'ErrorOutput';
  errors: Scalars['JSON']['output'];
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type FilterRoomInput = {
  max: Scalars['Float']['input'];
};

export type FiltersUserInput = {
  username: Scalars['String']['input'];
};

export type GameAbilityModel = {
  __typename?: 'GameAbilityModel';
  ability: RoleAbilityModel;
  abilityId: Scalars['ID']['output'];
  gameId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  totalUses: Scalars['Float']['output'];
  usesThisRound: Scalars['Float']['output'];
};

export type GameModel = {
  __typename?: 'GameModel';
  abilities: Array<GameAbilityModel>;
  id: Scalars['ID']['output'];
  players: Array<GamePlayerModel>;
  roomId: Scalars['Float']['output'];
  rounds: Array<GameRoundModel>;
  status: GameStatus;
};

export type GameModel_Mutation = BaseResponse & {
  __typename?: 'GameModel_Mutation';
  data: GameModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type GameModel_Single = BaseResponse & {
  __typename?: 'GameModel_Single';
  data: GameModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type GamePlayerModel = {
  __typename?: 'GamePlayerModel';
  id: Scalars['ID']['output'];
  role: RoleModel;
  status: GamePlayerStatus;
  virtual?: Maybe<Scalars['String']['output']>;
};

export type GamePlayerModel_List_Mutation = BaseResponse & {
  __typename?: 'GamePlayerModel_List_Mutation';
  data: Array<GamePlayerModel>;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export enum GamePlayerStatus {
  Alive = 'alive',
  Dead = 'dead',
  Guarded = 'guarded'
}

export type GameRoundActionInput = {
  abilityId: Scalars['ID']['input'];
  roundId: Scalars['ID']['input'];
  targetId?: InputMaybe<Scalars['ID']['input']>;
  turnOf: Roles;
};

export type GameRoundActionModel = {
  __typename?: 'GameRoundActionModel';
  booleanResult?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  statusResult?: Maybe<GamePlayerStatus>;
  target: GamePlayerModel;
  turnOf: Roles;
};

export type GameRoundActionModel_Mutation = BaseResponse & {
  __typename?: 'GameRoundActionModel_Mutation';
  data: GameRoundActionModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type GameRoundModel = {
  __typename?: 'GameRoundModel';
  actions: Array<GameRoundActionModel>;
  id: Scalars['ID']['output'];
  sequence: Scalars['Float']['output'];
  time: GameRoundTime;
};

export type GameRoundModel_Mutation = BaseResponse & {
  __typename?: 'GameRoundModel_Mutation';
  data: GameRoundModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export enum GameRoundTime {
  Day = 'day',
  Night = 'night'
}

export enum GameStatus {
  End = 'end',
  Playing = 'playing',
  Waiting = 'waiting'
}

export enum HttpCode {
  Accepted = 'ACCEPTED',
  Ambiguous = 'AMBIGUOUS',
  BadGateway = 'BAD_GATEWAY',
  BadRequest = 'BAD_REQUEST',
  Conflict = 'CONFLICT',
  Continue = 'CONTINUE',
  Created = 'CREATED',
  Earlyhints = 'EARLYHINTS',
  ExpectationFailed = 'EXPECTATION_FAILED',
  FailedDependency = 'FAILED_DEPENDENCY',
  Forbidden = 'FORBIDDEN',
  Found = 'FOUND',
  GatewayTimeout = 'GATEWAY_TIMEOUT',
  Gone = 'GONE',
  HttpVersionNotSupported = 'HTTP_VERSION_NOT_SUPPORTED',
  InternalServerError = 'INTERNAL_SERVER_ERROR',
  IAmATeapot = 'I_AM_A_TEAPOT',
  LengthRequired = 'LENGTH_REQUIRED',
  MethodNotAllowed = 'METHOD_NOT_ALLOWED',
  Misdirected = 'MISDIRECTED',
  MovedPermanently = 'MOVED_PERMANENTLY',
  NonAuthoritativeInformation = 'NON_AUTHORITATIVE_INFORMATION',
  NotAcceptable = 'NOT_ACCEPTABLE',
  NotFound = 'NOT_FOUND',
  NotImplemented = 'NOT_IMPLEMENTED',
  NotModified = 'NOT_MODIFIED',
  NoContent = 'NO_CONTENT',
  Ok = 'OK',
  PartialContent = 'PARTIAL_CONTENT',
  PayloadTooLarge = 'PAYLOAD_TOO_LARGE',
  PaymentRequired = 'PAYMENT_REQUIRED',
  PermanentRedirect = 'PERMANENT_REDIRECT',
  PreconditionFailed = 'PRECONDITION_FAILED',
  PreconditionRequired = 'PRECONDITION_REQUIRED',
  Processing = 'PROCESSING',
  ProxyAuthenticationRequired = 'PROXY_AUTHENTICATION_REQUIRED',
  RequestedRangeNotSatisfiable = 'REQUESTED_RANGE_NOT_SATISFIABLE',
  RequestTimeout = 'REQUEST_TIMEOUT',
  ResetContent = 'RESET_CONTENT',
  SeeOther = 'SEE_OTHER',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  SwitchingProtocols = 'SWITCHING_PROTOCOLS',
  TemporaryRedirect = 'TEMPORARY_REDIRECT',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  Unauthorized = 'UNAUTHORIZED',
  UnprocessableEntity = 'UNPROCESSABLE_ENTITY',
  UnsupportedMediaType = 'UNSUPPORTED_MEDIA_TYPE',
  UriTooLong = 'URI_TOO_LONG'
}

export type LoginUserInput = {
  /** Password */
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Me = {
  __typename?: 'Me';
  id: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type Me_Single = BaseResponse & {
  __typename?: 'Me_Single';
  data: Me;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type Mutation = {
  __typename?: 'Mutation';
  createGame: ResultUnion_GameModel_Mutation;
  createGameRoundAction: ResultUnion_GameRoundActionModel_Mutation;
  createRoom: ResultUnion_RoomModel_Mutation;
  createRound: ResultUnion_GameRoundModel_Mutation;
  createUser: ResultUnion_UserModel_Mutation;
  login: ResultUnion_UserToken_Mutation;
  updateManyGamePlayer: ResultUnion_GamePlayerModel_List_Mutation;
  updateManyRoomPlayer: ResultUnion_RoomPlayerModel_List_Mutation;
  updateRoom: ResultUnion_RoomModel_Mutation;
};


export type MutationCreateGameArgs = {
  input: CreateGameInput;
};


export type MutationCreateGameRoundActionArgs = {
  input: GameRoundActionInput;
};


export type MutationCreateRoomArgs = {
  input: CreateRoomInput;
};


export type MutationCreateRoundArgs = {
  input: CreateRoundInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationLoginArgs = {
  input: LoginUserInput;
};


export type MutationUpdateManyGamePlayerArgs = {
  input: UpdateManyGamePlayer;
};


export type MutationUpdateManyRoomPlayerArgs = {
  input: UpdateManyRoomPlayer;
};


export type MutationUpdateRoomArgs = {
  input: UpdateRoomInput;
};

export type PaginationData = {
  __typename?: 'PaginationData';
  cursorLeft?: Maybe<Scalars['Float']['output']>;
  cursorRight?: Maybe<Scalars['Float']['output']>;
  page: Scalars['Float']['output'];
  pageSize: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

export type PaginationInput = {
  page?: Scalars['Float']['input'];
  pageSize?: Scalars['Float']['input'];
};

export type Query = {
  __typename?: 'Query';
  currentGame: ResultUnion_GameModel_Single;
  currentRoom?: Maybe<ResultUnion_RoomModel_Single>;
  me: ResultUnion_Me_Single;
  roles: ResultUnion_RoleModel_List;
  rooms: ResultUnion_RoomModel_List;
  users: ResultUnion_UserModel_List;
};


export type QueryRoomsArgs = {
  filter?: InputMaybe<FilterRoomInput>;
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryUsersArgs = {
  filter?: InputMaybe<FiltersUserInput>;
  pagination?: InputMaybe<PaginationInput>;
};

export type ResultUnion_GameModel_Mutation = ErrorOutput | GameModel_Mutation;

export type ResultUnion_GameModel_Single = ErrorOutput | GameModel_Single;

export type ResultUnion_GamePlayerModel_List_Mutation = ErrorOutput | GamePlayerModel_List_Mutation;

export type ResultUnion_GameRoundActionModel_Mutation = ErrorOutput | GameRoundActionModel_Mutation;

export type ResultUnion_GameRoundModel_Mutation = ErrorOutput | GameRoundModel_Mutation;

export type ResultUnion_Me_Single = ErrorOutput | Me_Single;

export type ResultUnion_RoleModel_List = ErrorOutput | RoleModel_List;

export type ResultUnion_RoomModel_List = ErrorOutput | RoomModel_List;

export type ResultUnion_RoomModel_Mutation = ErrorOutput | RoomModel_Mutation;

export type ResultUnion_RoomModel_Single = ErrorOutput | RoomModel_Single;

export type ResultUnion_RoomPlayerModel_List_Mutation = ErrorOutput | RoomPlayerModel_List_Mutation;

export type ResultUnion_UserModel_List = ErrorOutput | UserModel_List;

export type ResultUnion_UserModel_Mutation = ErrorOutput | UserModel_Mutation;

export type ResultUnion_UserToken_Mutation = ErrorOutput | UserToken_Mutation;

export type RoleAbilityModel = {
  __typename?: 'RoleAbilityModel';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  roleId: Scalars['ID']['output'];
  totalUses: Scalars['Float']['output'];
  usesPerRound: Scalars['Float']['output'];
};

export type RoleModel = {
  __typename?: 'RoleModel';
  description: Scalars['String']['output'];
  enum: Roles;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  point: Scalars['Float']['output'];
  side: RoleSide;
  status: Status;
};

export type RoleModel_List = BaseResponse & {
  __typename?: 'RoleModel_List';
  data: Array<RoleModel>;
  message: Scalars['String']['output'];
  pagination: PaginationData;
  statusCode: HttpCode;
};

export enum RoleSide {
  Villager = 'villager',
  Werewolf = 'werewolf'
}

export enum Roles {
  Guard = 'guard',
  Hunter = 'hunter',
  Seer = 'seer',
  Villager = 'villager',
  Werewolf = 'werewolf',
  Witch = 'witch'
}

export type RoomModel = {
  __typename?: 'RoomModel';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  players: Array<RoomPlayerModel>;
  rolesConfig: Array<RoomRoleModel>;
  status: RoomStatus;
  type: RoomType;
  werewolfQuantity: Scalars['Float']['output'];
};

export type RoomModel_List = BaseResponse & {
  __typename?: 'RoomModel_List';
  data: Array<RoomModel>;
  message: Scalars['String']['output'];
  pagination: PaginationData;
  statusCode: HttpCode;
};

export type RoomModel_Mutation = BaseResponse & {
  __typename?: 'RoomModel_Mutation';
  data: RoomModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type RoomModel_Single = BaseResponse & {
  __typename?: 'RoomModel_Single';
  data?: Maybe<RoomModel>;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type RoomPlayerModel = {
  __typename?: 'RoomPlayerModel';
  id: Scalars['ID']['output'];
  isHost: Scalars['Boolean']['output'];
  role?: Maybe<RoleModel>;
  user?: Maybe<UserModel>;
  virtual?: Maybe<Scalars['String']['output']>;
};

export type RoomPlayerModel_List_Mutation = BaseResponse & {
  __typename?: 'RoomPlayerModel_List_Mutation';
  data: Array<RoomPlayerModel>;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type RoomRoleModel = {
  __typename?: 'RoomRoleModel';
  id: Scalars['ID']['output'];
  role: RoleModel;
};

export enum RoomStatus {
  Finished = 'finished',
  Playing = 'playing',
  Waiting = 'waiting'
}

export enum RoomType {
  Multiplayer = 'multiplayer',
  Support = 'support'
}

export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

export type UpdateGamePlayer = {
  id: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type UpdateManyGamePlayer = {
  data: Array<UpdateGamePlayer>;
};

export type UpdateManyRoomPlayer = {
  data: Array<UpdateRoomPlayer>;
  roomId: Scalars['ID']['input'];
};

export type UpdateRoomInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  werewolfQuantity: Scalars['Float']['input'];
};

export type UpdateRoomPlayer = {
  id?: InputMaybe<Scalars['ID']['input']>;
  roleId: Scalars['ID']['input'];
  virtual: Scalars['String']['input'];
};

export type UserModel = {
  __typename?: 'UserModel';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type UserModel_List = BaseResponse & {
  __typename?: 'UserModel_List';
  data: Array<UserModel>;
  message: Scalars['String']['output'];
  pagination: PaginationData;
  statusCode: HttpCode;
};

export type UserModel_Mutation = BaseResponse & {
  __typename?: 'UserModel_Mutation';
  data: UserModel;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};

export type UserToken = {
  __typename?: 'UserToken';
  token: Scalars['String']['output'];
};

export type UserToken_Mutation = BaseResponse & {
  __typename?: 'UserToken_Mutation';
  data: UserToken;
  message: Scalars['String']['output'];
  statusCode: HttpCode;
};
