import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { BasePrismaService } from 'src/modules/prisma/prisma.service';
config({
  path: fs.existsSync(path.join(process.cwd(), '.env'))
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), '.env.example'),
});
declare module 'express' {
  export interface Request {
    tenant: string;
    user: JWTPayload;
    isAuthorization: boolean;
    jwt: string;
  }
}

const envConfig = {
  JWT_SECRET: process.env.JWT_SECRET || '',
};
enum PROVIDER_TOKEN {
  USER = 'USER'
};
declare global {
  var Config: {
    [k in keyof typeof envConfig]: typeof envConfig[k]
  };
  var TOKEN: typeof PROVIDER_TOKEN;
  var tenants: string[];
  export interface JWTPayload {
    id: string;
  }
  interface NestedObjectSelect {
    [k: string]: number | NestedObjectSelect;
  }

  type DataId = string | number;

  interface Pagination {
    skip: null | number;
    take: null | number;
  }

  type PrismaService = ReturnType<BasePrismaService['withExtensions']>;
}
global.Config = envConfig;

global.TOKEN = PROVIDER_TOKEN;
