import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { User } from '../entities/user.entity';
import { Auth } from '../../auth/entities/auth.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

import { WinstonLogger as Logger } from '../../../config/logger.config';

describe('UserService', () => {
  let service: UserService;
  let userRepo: Repository<User>;
  let authRepo: Repository<Auth>;
  let logger: Logger;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockAuthRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Auth), useValue: mockAuthRepository },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    authRepo = module.get<Repository<Auth>>(getRepositoryToken(Auth));
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'strongpassword',
      role: 1,
    };

    it('should throw BadRequestException if email is missing', async () => {
      await expect(
        service.create({ ...createUserDto, email: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 1,
        email: createUserDto.email,
      });
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('should create and save a new user and auth record', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue({
        email: createUserDto.email,
        role: createUserDto.role,
      });
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        email: createUserDto.email,
        role: createUserDto.role,
      });
      mockAuthRepository.create.mockReturnValue({
        password: 'hashedPassword',
        userId: { id: 1 },
      });
      mockAuthRepository.save.mockResolvedValue({
        id: 1,
        password: 'hashedPassword',
        userId: { id: 1 },
      });

      jest.mock('../../utils/hash.util', () => ({
        genSalt: jest.fn().mockResolvedValue('salt'),
        createSaltAndHash: jest.fn().mockResolvedValue('salt:hashedPassword'),
      }));

      const result = await service.create(createUserDto);
      expect(result).toHaveProperty('id');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        role: createUserDto.role,
      });
      expect(mockAuthRepository.create).toHaveBeenCalled();
      expect(mockAuthRepository.save).toHaveBeenCalled();
    });

    it('should log and throw InternalServerErrorException on error', async () => {
      mockUserRepository.findOne.mockRejectedValueOnce(new Error('DB error'));
      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: 1, email: 'a@a.com' }];
      mockUserRepository.find.mockResolvedValue(users);
      const result = await service.findAll();
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: 1, email: 'a@a.com' };
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.findOne(1);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: 1, email: 'a@a.com' };
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.findOneByEmail('a@a.com');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOneByEmail('noexist@example.com')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: Partial<UpdateUserDto> = {
      email: 'updated@example.com',
    };

    it('should update and return the user', async () => {
      const user = { id: 1, email: 'old@example.com', role: 1 };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, ...updateUserDto });

      const result = await service.update(1, updateUserDto);
      expect(result.email).toBe(updateUserDto.email);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should log and throw InternalServerErrorException on error', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('DB error'));
      await expect(service.update(1, updateUserDto)).rejects.toThrow(
        InternalServerErrorException
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
