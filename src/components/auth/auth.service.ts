import {
  Injectable,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { User } from '../user/entities/user.entity';
import { createSaltAndHash, genSalt } from '../../utils/hash.util';
import { verifyToken, createToken } from '../../utils/jwt.util';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { signInDto } from './dto/signin.dto';
import { UserService } from '../user/user.service';
import { WinstonLogger as Logger } from '../../config/logger.config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  async signup(createAuthDto: CreateUserDto): Promise<Auth> {
    try {
      const { email, password } = createAuthDto;

      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        const existingAuth = await this.authRepository.findOne({
          where: { userId: existingUser },
        });

        if (existingAuth) {
          throw new ConflictException(
            'Authentication record already exists for this user'
          );
        }

        throw new ConflictException(
          'User already exists without authentication'
        );
      }

      const user = await this.userService.create(createAuthDto);

      const salt = await genSalt();
      const hashedPassword = await createSaltAndHash(password, salt);

      const auth = this.authRepository.create({
        userId: user,
        password: hashedPassword,
      });

      return await this.authRepository.save(auth);
    } catch (error) {
      this.logger.error('Error signing up user:', error);
      throw new InternalServerErrorException('Error signing up user');
    }
  }

  async signin(signInDto: signInDto): Promise<string> {
    const { email, password } = signInDto;

    try {
      const user = await this.userService.findOneByEmail(email);

      const auth = await this.authRepository.findOne({
        where: { userId: { id: user.id } },
        relations: ['userId'],
      });

      if (!auth) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const [salt] = auth.password.split(':');
      const hashedPassword = await createSaltAndHash(password, salt);

      if (hashedPassword !== auth.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = createToken({ id: auth.userId.id, role: auth.userId.role });
      return token;
    } catch (error) {
      this.logger.error('Error during user sign in:', error);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Error during user sign in');
    }
  }

  async refreshToken(token: string): Promise<string> {
    try {
      const payload = verifyToken(token);

      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }

      const { id, role } = payload;
      return createToken({ id, role });
    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
