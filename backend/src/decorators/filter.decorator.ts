import { Args } from '@nestjs/graphql';

export const Filters = () => Args('filter', { nullable: true });