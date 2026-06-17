import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Protege endpoints validando el access token (JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
