import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AccessTokenClaims } from "@crm/shared";

/** Inyecta el usuario autenticado (claims del JWT) resuelto por JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenClaims => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
