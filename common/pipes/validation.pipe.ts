import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class HttpValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema<any>) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value) return value; // Skip validation if value is empty

    try {
      if (
        metadata.type === 'body' ||
        metadata.type === 'query' ||
        metadata.type === 'param'
      ) {
        return this.schema.parse(value);
      }
      return value;
    } catch (error) {
      if (error instanceof ZodError) {        
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw new BadRequestException('Invalid request data');
    }
  }
}
