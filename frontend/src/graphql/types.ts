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

export type CreateRoomInput = {
  maxPlayers: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  rolesConfig: Array<Scalars['ID']['input']>;
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
  createRoom: ResultUnion_RoomModel_Mutation;
  createUser: ResultUnion_UserModel_Mutation;
  login: ResultUnion_UserToken_Mutation;
};


export type MutationCreateRoomArgs = {
  input: CreateRoomInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationLoginArgs = {
  input: LoginUserInput;
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

export type ResultUnion_Me_Single = ErrorOutput | Me_Single;

export type ResultUnion_RoleModel_List = ErrorOutput | RoleModel_List;

export type ResultUnion_RoomModel_List = ErrorOutput | RoomModel_List;

export type ResultUnion_RoomModel_Mutation = ErrorOutput | RoomModel_Mutation;

export type ResultUnion_RoomModel_Single = ErrorOutput | RoomModel_Single;

export type ResultUnion_UserModel_List = ErrorOutput | UserModel_List;

export type ResultUnion_UserModel_Mutation = ErrorOutput | UserModel_Mutation;

export type ResultUnion_UserToken_Mutation = ErrorOutput | UserToken_Mutation;

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
  maxPlayers: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  players: Array<RoomPlayerModel>;
  rolesConfig: Array<RoomRoleModel>;
  status: RoomStatus;
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
  user: UserModel;
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

export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

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
