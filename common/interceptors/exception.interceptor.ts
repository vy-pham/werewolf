import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
} from '@nestjs/common';
import { type GqlExceptionFilter } from '@nestjs/graphql';

@Catch()
export class HttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    let message = '';
    let errors: any = [];
    let statusCode = exception.getStatus();

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      message = response.message;
      errors = response.errors;
    } else {
      message = (exception as any).message;
    }

    return {
      message,
      errors: errors || message,
      statusCode,
    };
  }
}
