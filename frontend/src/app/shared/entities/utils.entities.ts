export type ExtractDataType<T> = T extends {
  __typename?: Exclude<String, 'ErrorOutput'>;
  data: infer D;
}
  ? D
  : never;
