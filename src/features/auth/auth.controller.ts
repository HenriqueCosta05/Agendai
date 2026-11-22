import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { Public, TokenService } from '@nestjs/authentication';
import {
  refreshTokenSchema,
  signInSchema,
  signUpSchema,
  type RefreshTokenDto,
  type SignInDto,
  type SignUpDto,
} from './auth.schemas.js';
import { CredentialsService } from './credentials.service.js';

const passwordLogin = { method: 'password', claims: { amr: ['pwd'] } };

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('sign-up')
  async signUp(@Body({ schema: signUpSchema }) body: SignUpDto) {
    const user = await this.credentialsService.registerTenant(body);
    return this.tokenService.issue(user.id, passwordLogin);
  }

  @Post('token')
  @HttpCode(200)
  async token(@Body({ schema: signInSchema }) body: SignInDto) {
    const user = await this.credentialsService.verify(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.tokenService.issue(user.id, passwordLogin);
  }

  @Post('token/refresh')
  @HttpCode(200)
  refresh(@Body({ schema: refreshTokenSchema }) body: RefreshTokenDto) {
    return this.tokenService.refresh(body.refreshToken);
  }

  @Post('token/revoke')
  @HttpCode(204)
  async revoke(@Body({ schema: refreshTokenSchema }) body: RefreshTokenDto) {
    await this.tokenService.revoke(body.refreshToken);
  }
}
