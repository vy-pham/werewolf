import { PipeTransform, Type } from '@nestjs/common';
import { Args, ArgsOptions } from '@nestjs/graphql';


export const Filters = (options?: ArgsOptions, ...pipes : (Type<PipeTransform> | PipeTransform)[] ) => {
  if (options) return Args('filter', options, ...pipes);
  return Args('filter', ...pipes);
};
