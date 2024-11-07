import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';

Injectable();
export class AuthGuard implements CanActivate {
  @Inject() reflector: Reflector;
  @Inject() jwtService: JwtService;
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req as Request;
    return request.isAuthorization;
  }
}
