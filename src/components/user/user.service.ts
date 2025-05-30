import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createSaltAndHash, genSalt } from '../../utils/hash.util';
import { User } from './entities/user.entity';
import { Auth } from '../auth/entities/auth.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { WinstonLogger as Logger } from '../../config/logger.config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly logger: Logger
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const { email, password, ...userData } = createUserDto;

      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException({
          message: 'Email already in use',
          code: 'EMAIL_ALREADY_IN_USE',
        });
      }

      const user = this.userRepository.create({
        email: email,
        role: createUserDto.role,
      });

      const savedUser = await this.userRepository.save(user);

      const salt = await genSalt();
      const hashedPassword = await createSaltAndHash(password, salt);

      const auth = this.authRepository.create({
        password: hashedPassword,
        userId: savedUser,
      });

      await this.authRepository.save(auth);

      return savedUser;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async update(
    id: number,
    updateUserDto: Partial<UpdateUserDto>
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      Object.assign(user, updateUserDto);

      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(`Error updating user with ID ${id}`, error);
      throw new InternalServerErrorException('Error updating user');
    }
  }
}
