import 'src/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JWTMiddleWare } from './middleware/jwt.middleware';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(new JWTMiddleWare().use);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();
  await app.listen(process.env.PORT ?? 4300);
}
bootstrap();
