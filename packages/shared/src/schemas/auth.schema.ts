import { z } from "zod";
import { Platform, Role } from "../enums.js";

// ── Login ────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // metadatos del dispositivo (para la Session). Opcionales: el server
  // completa con userAgent/ip si no llegan.
  platform: z.nativeEnum(Platform).default(Platform.WEB),
  deviceName: z.string().max(120).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── Registro ─────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ── Refresh ──────────────────────────────────────────────────
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// ── Logout ───────────────────────────────────────────────────
export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutInput = z.infer<typeof logoutSchema>;

// ── Perfil de la cuenta ──────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── Respuestas ───────────────────────────────────────────────
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.nativeEnum(Role),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(), // segundos de vida del access token
  user: publicUserSchema,
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  platform: z.nativeEnum(Platform),
  deviceName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  current: z.boolean(),
});
export type SessionDto = z.infer<typeof sessionSchema>;

// Claims del JWT de acceso.
export interface AccessTokenClaims {
  sub: string; // userId
  sid: string; // sessionId
  role: Role;
}
