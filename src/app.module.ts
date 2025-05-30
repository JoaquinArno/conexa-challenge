import { Module } from '@nestjs/common';
import { ConstantsService } from './components/constants/constants.service';
import { ConstantsModule } from './components/constants/constants.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './components/auth/auth.module';
import { UserModule } from './components/user/user.module';
import { UserController } from './components/user/user.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConstantsModule],
      inject: [ConstantsService],
      useFactory: (constantsService: ConstantsService) =>
        constantsService.typeOrmConfig,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
  ],
  providers: [ConstantsService],
  exports: [ConstantsService],
  controllers: [UserController],
})
export class AppModule {}
