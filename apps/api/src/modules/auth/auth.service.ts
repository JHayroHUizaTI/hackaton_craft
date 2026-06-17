import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, createHash } from "node:crypto";
import * as bcrypt from "bcryptjs";
import type {
  AccessTokenClaims,
  AuthTokens,
  LoginInput,
  Platform,
  PublicUser,
  RegisterInput,
  Role,
} from "@crm/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";

interface DeviceMeta {
  platform: Platform;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl = process.env.JWT_ACCESS_TTL ?? "15m";
  private readonly refreshTtlDays = Number(process.env.REFRESH_TTL_DAYS ?? 30);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Registro ───────────────────────────────────────────────
  // El primer usuario del sistema es ADMIN (bootstrap); los siguientes son
  // AGENT (vendedores). Un vendedor recién registrado no ve ninguna
  // conversación hasta que un admin le asigne fuentes.
  async register(input: RegisterInput): Promise<PublicUser> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Ese correo ya está registrado");
    }
    const userCount = await this.prisma.user.count();
    const role: Role = (userCount === 0 ? "ADMIN" : "AGENT") as Role;
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: { name: input.name.trim(), email, passwordHash, role },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    };
  }

  // ── Login ──────────────────────────────────────────────────
  async login(input: LoginInput, meta: DeviceMeta): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciales inválidas");
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Credenciales inválidas");

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        platform: meta.platform,
        deviceName: meta.deviceName ?? null,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: this.refreshExpiry(),
      },
    });

    return this.issueTokens(user, session.id);
  }

  // ── Refresh con rotación + detección de reuso ──────────────
  async refresh(rawToken: string): Promise<AuthTokens> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });

    if (!stored) throw new UnauthorizedException("Refresh token inválido");

    const { session } = stored;

    // REUSO DETECTADO: token ya rotado o revocado → robo probable.
    // Se revoca toda la familia (la sesión completa).
    if (stored.rotatedAt || stored.revokedAt || session.revokedAt) {
      await this.revokeSession(session.id);
      throw new ForbiddenException(
        "Refresh token reutilizado. Sesión revocada por seguridad.",
      );
    }

    if (stored.expiresAt < new Date() || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesión expirada");
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException("Usuario inactivo");
    }

    // Rotación: emitir un nuevo refresh y marcar el viejo como rotado.
    const next = await this.createRefreshToken(session.id);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { rotatedAt: new Date(), replacedById: next.id },
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return this.issueTokens(session.user, session.id, next.raw);
  }

  // ── Logout (revoca la sesión asociada al refresh) ──────────
  async logout(rawToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (stored) await this.revokeSession(stored.sessionId);
  }

  // ── Listar sesiones activas del usuario ────────────────────
  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
    return sessions.map((s) => ({
      id: s.id,
      platform: s.platform as Platform,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  // Token corto (2 min) solo para el handshake del WebSocket. Evita exponer
  // el access token de 15 min al JS del navegador.
  async issueRealtimeToken(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(
      { sub: claims.sub, sid: claims.sid, role: claims.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "2m" },
    );
  }

  // Revoca una sesión concreta del usuario (cerrar un dispositivo remoto).
  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new UnauthorizedException("Sesión no encontrada");
    await this.revokeSession(sessionId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ── Helpers ────────────────────────────────────────────────
  private async issueTokens(
    user: { id: string; email: string; name: string | null; role: string },
    sessionId: string,
    existingRefresh?: string,
  ): Promise<AuthTokens> {
    const refresh = existingRefresh
      ? { raw: existingRefresh }
      : await this.createRefreshToken(sessionId);

    const claims: AccessTokenClaims = {
      sub: user.id,
      sid: sessionId,
      role: user.role as Role,
    };
    const accessToken = await this.jwt.signAsync(claims, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: this.accessTtl,
    });

    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    };

    return {
      accessToken,
      refreshToken: refresh.raw,
      expiresIn: this.ttlSeconds(this.accessTtl),
      user: publicUser,
    };
  }

  private async createRefreshToken(sessionId: string) {
    const raw = randomBytes(32).toString("hex");
    const created = await this.prisma.refreshToken.create({
      data: {
        sessionId,
        tokenHash: this.hash(raw),
        expiresAt: this.refreshExpiry(),
      },
    });
    return { id: created.id, raw };
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }

  private ttlSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
    return value * mult;
  }
}
