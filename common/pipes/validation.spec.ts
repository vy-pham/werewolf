import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { HttpValidationPipe } from './validation.pipe';

describe('HttpValidationPipe', () => {
  let pipe: HttpValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: Object,
    data: '',
  };

  beforeEach(() => {
    const schema = z.object({
      name: z.string().min(3, 'Name must be at least 3 characters'),
      email: z.string().email('Invalid email'),
      age: z.number().min(18, 'Age must be at least 18'),
    });

    pipe = new HttpValidationPipe(schema);
  });

  it('should pass valid data', () => {
    const validData = { name: 'Alice', email: 'alice@example.com', age: 25 };
    expect(pipe.transform(validData, metadata)).toEqual(validData);
  });

  it('should throw error for invalid name', () => {
    const invalidData = { name: 'Al', email: 'alice@example.com', age: 25 };

    expect(() => {
      pipe.transform(invalidData, metadata);
    }).toThrow(BadRequestException);
  });

  it('should throw error for invalid email', () => {
    const invalidData = { name: 'Alice', email: 'invalid-email', age: 25 };

    expect(() => {
      pipe.transform(invalidData, metadata);
    }).toThrow(BadRequestException);
  });

  it('should throw error for invalid age', () => {
    const invalidData = { name: 'Alice', email: 'alice@example.com', age: 16 };

    expect(() => {
      pipe.transform(invalidData, metadata);
    }).toThrow(BadRequestException);
  });
});
