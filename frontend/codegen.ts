import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4300/graphql',
  documents: ['src/**/*.queries.ts'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {},
    },
  },
  ignoreNoDocuments: true,
};

export default config;
