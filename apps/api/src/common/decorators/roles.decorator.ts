import { SetMetadata } from "@nestjs/common";
import type { Role } from "@crm/shared";

export const ROLES_KEY = "roles";

/** Restringe un endpoint a ciertos roles. Uso: @Roles("ADMIN") */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
