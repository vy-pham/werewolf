import { Catch, HttpException, type ArgumentsHost } from '@nestjs/common';
import { type GqlExceptionFilter } from '@nestjs/graphql';

@Catch()

export class HttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    let message = '';
    let error: any = [];
    let statusCode = 400;
    if (exception instanceof HttpException) {
      message = (exception.getResponse() as any).error;
      error = (exception.getResponse() as any).message;
    } else {
      message = (exception as any).message;
      statusCode = 500;
    }
    return {
      message: exception.message,
      errors: error,
      statusCode
    };
  }
}