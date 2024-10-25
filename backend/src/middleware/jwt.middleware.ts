import { Injectable, type NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request } from 'express';

@Injectable()
export class JWTMiddleWare implements NestMiddleware {
  use(req: Request, _: Response, next: NextFunction) {
    try {
      const [_, token] = req.headers.authorization.split(' ');
      req.isAuthorization = true;
      const jwtService = new JwtService();
      const payload = jwtService.verify(token, { secret: global.Config.JWT_SECRET });
      req.user = payload;
      req.isAuthorization = true;
    } catch (error) {
      req.isAuthorization = false;
    }
    next();
  }
}
