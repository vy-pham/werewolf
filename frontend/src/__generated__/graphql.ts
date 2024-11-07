/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type CreateRoomInput = {
  a: Scalars['Float']['input'];
};

export type CreateUserInput = {
  /** Password */
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
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

export type PaginationInput = {
  page?: Scalars['Float']['input'];
  pageSize?: Scalars['Float']['input'];
};

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'ErrorOutput', statusCode: HttpCode } | { __typename?: 'Me_Single', statusCode: HttpCode, data: { __typename?: 'Me', id: string } } };

export type LoginMutationVariables = Exact<{
  input: LoginUserInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'ErrorOutput', message: string, statusCode: HttpCode } | { __typename?: 'UserToken_Mutation', message: string, statusCode: HttpCode, data: { __typename?: 'UserToken', token: string } } };


export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Me_Single"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BaseResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"statusCode"}}]}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BaseResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"statusCode"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserToken_Mutation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;