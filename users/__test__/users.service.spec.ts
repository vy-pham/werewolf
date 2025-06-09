import { Test, TestingModule } from '@nestjs/testing';
import { prismaMock } from '@test/helpers/prisma/singleton';
import { DatabaseService } from 'src/database/database.service';
import { UsersService } from '../users.service';

describe('UsersService (Prisma Mock Singleton)', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user', async () => {
    const mockUser = { id: 1, email: 'user1@gmail.com', username: 'username' };

    // Mock the prisma user.create method
    prismaMock.user.create.mockResolvedValue(mockUser);

    const user = await service.create({
      email: 'user1@gmail.com',
      username: 'username',
    });

    expect(user).toEqual(mockUser);
  });
});
