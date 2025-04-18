// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginUserDTO } from '../user/dto/login-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginUserDTO) {
    // 1️⃣ Validate credentials
    const user = await this.authService.validateUser(loginDto);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2️⃣ Issue JWT
    const token = await this.authService.login(user);

    // 3️⃣ Persist tokens (access + firebase)
    const addResult = await this.userService.addToken(
      user.email,
      token.access_token,
      loginDto.firebaseToken,
    );

    // 4️⃣ Normalize return value (array or single entity)
    const updatedUsers = Array.isArray(addResult) ? addResult : [addResult];

    // 5️⃣ Guard: make sure we got back at least one user
    if (!updatedUsers.length) {
      throw new UnauthorizedException('Failed to update user token');
    }

    // 6️⃣ Safe destructuring
    const updatedUser = updatedUsers[0];
    const { password, ...sanitized } = updatedUser;

    console.log('in controller', sanitized);
    return sanitized;
  }
}
