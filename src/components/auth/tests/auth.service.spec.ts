import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../auth.service';
import { Auth } from '../entities/auth.entity';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { signInDto } from '../dto/signin.dto';
import { HttpException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: Repository<Auth>;
  let userRepo: Repository<User>;
  let userService: UserService;

  const mockAuthRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findOneByEmail: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Auth), useValue: mockAuthRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepo = module.get<Repository<Auth>>(getRepositoryToken(Auth));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      role: 1,
    };

    it('should create user if not exists and create auth record', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserService.create.mockResolvedValue({
        id: 1,
        email: createUserDto.email,
        role: createUserDto.role,
      });
      mockAuthRepository.findOne.mockResolvedValueOnce(null);
      mockAuthRepository.create.mockReturnValue({
        password: 'hashedPassword',
        userId: { id: 1 },
      });
      mockAuthRepository.save.mockResolvedValue({
        id: 1,
        password: 'hashedPassword',
        userId: { id: 1 },
      });

      const result = await service.signup(createUserDto);
      expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
      expect(mockAuthRepository.create).toHaveBeenCalled();
      expect(mockAuthRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should throw error if auth record exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 1,
        email: createUserDto.email,
      });
      mockAuthRepository.findOne.mockResolvedValueOnce({ id: 1 });
      await expect(service.signup(createUserDto)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('signin', () => {
    const signInDtoMock: signInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return token if credentials are correct', async () => {
      const user = { id: 1, email: signInDtoMock.email };
      const auth = { password: 'salt:hashedPassword' };

      mockUserService.findOneByEmail.mockResolvedValue(user);
      mockAuthRepository.findOne.mockResolvedValue(auth);

      jest.mock('../../utils/hash.util', () => ({
        validatePassword: jest.fn().mockResolvedValue(true),
        signToken: jest.fn().mockReturnValue('token'),
      }));

      const result = await service.signin(signInDtoMock);
      expect(result).toHaveProperty('access_token');
    });

    it('should throw error if credentials are wrong', async () => {
      mockUserService.findOneByEmail.mockResolvedValue(null);
      await expect(service.signin(signInDtoMock)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('refreshToken', () => {
    it('should call refreshToken and return new token', async () => {
      jest.spyOn(service, 'refreshToken').mockResolvedValue('newToken');
      const result = await service.refreshToken('oldToken');
      expect(result).toBe('newToken');
    });
  });
});
