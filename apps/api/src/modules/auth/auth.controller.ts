import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  type LoginInput,
  type RegisterInput,
  type RefreshInput,
  type LogoutInput,
  type AccessTokenClaims,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @HttpCode(201)
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ) {
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
  ) {
    return this.auth.login(body, {
      platform: body.platform,
      deviceName: body.deviceName,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Body(new ZodValidationPipe(logoutSchema)) body: LogoutInput,
  ): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  sessions(@CurrentUser() user: AccessTokenClaims) {
    return this.auth.listSessions(user.sub, user.sid);
  }

  @Delete("sessions/:id")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser() user: AccessTokenClaims,
    @Param("id") id: string,
  ): Promise<void> {
    await this.auth.revokeUserSession(user.sub, id);
  }

  @Get("realtime-token")
  @UseGuards(JwtAuthGuard)
  async realtimeToken(@CurrentUser() user: AccessTokenClaims) {
    return { token: await this.auth.issueRealtimeToken(user) };
  }
}
