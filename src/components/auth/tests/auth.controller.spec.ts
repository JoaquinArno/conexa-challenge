import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    signup: jest.fn(),
    signin: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user and return it', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: '12345678',
        role: 1,
      };
      const createdUser = { id: 1, ...createUserDto };
      mockAuthService.signup.mockResolvedValue(createdUser);

      const result = await controller.signup(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockAuthService.signup).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw error if signup fails', async () => {
      mockAuthService.signup.mockRejectedValue(new BadRequestException());

      await expect(
        controller.signup({ email: 'bad', password: 'bad', role: 1 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signin', () => {
    it('should return a JWT token', async () => {
      const signInDto = { email: 'test@example.com', password: '12345678' };
      const token = 'jwt.token.here';
      mockAuthService.signin.mockResolvedValue(token);

      const result = await controller.signin(signInDto);

      expect(result).toEqual({ token });
      expect(mockAuthService.signin).toHaveBeenCalledWith(signInDto);
    });

    it('should throw error if signin fails', async () => {
      mockAuthService.signin.mockRejectedValue(new UnauthorizedException());

      await expect(
        controller.signin({ email: 'test', password: 'bad' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return a new token', async () => {
      const token = 'old.token.here';
      const newToken = 'new.token.here';
      mockAuthService.refreshToken.mockResolvedValue(newToken);

      const result = await controller.refreshToken(token);

      expect(result).toEqual({
        message: 'Token refreshed successfully',
        token: newToken,
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(token);
    });

    it('should throw error if refresh token fails', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException()
      );

      await expect(controller.refreshToken('bad.token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
