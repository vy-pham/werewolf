import { Args, type ArgsOptions } from '@nestjs/graphql';

export const Input = (options?: ArgsOptions) => Args('input', options);
