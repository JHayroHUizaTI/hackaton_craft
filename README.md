# CRM Prime — CRM para WhatsApp con Agentes IA

Monorepo Turborepo. Backend NestJS (única fuente de lógica), frontend Next.js
(cliente web + BFF), futura app móvil React Native (Expo). Ver
[`proyecto.md`](./proyecto.md) para el plan completo.

```
apps/
  api/        NestJS — API REST, Prisma, auth, IA, WhatsApp
  web/        Next.js — UI web + BFF (reenvía a la API con el token en cookie httpOnly)
packages/
  shared/     Zod + tipos compartidos (validación única para web y móvil)
```

## Requisitos

- Node.js ≥ 20
- Docker (para Postgres con pgvector + Redis)

## Puesta en marcha

```bash
# 1. Instalar dependencias (raíz del monorepo)
npm install

# 2. Levantar base de datos y Redis
docker compose up -d

# 3. Compilar el paquete compartido (lo consumen api y web)
npm run build -w @crm/shared

# 4. Generar el cliente Prisma, migrar y sembrar datos
npm run db:generate
npm run db:migrate          # crea las tablas
npm run db:seed             # admin + etapas de pipeline + agente IA

# 5. Arrancar todo en desarrollo (api + web)
npm run dev
```

- API: http://localhost:3001/api/v1 (health: `/api/v1/health`)
- Web: http://localhost:3000
- Login de prueba: **admin@crm.local** / **admin1234**

## Habilitar pgvector

Tras la primera migración, habilita la extensión y crea el índice vectorial
(Prisma no lo expresa en el schema):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
```

> La imagen `pgvector/pgvector` ya trae la extensión instalada; solo falta el
> `CREATE EXTENSION` y el índice cuando empieces la Fase 5 (RAG).

## Auth (resumen)

- `POST /api/v1/auth/login` → `{ accessToken, refreshToken, expiresIn, user }`
- `POST /api/v1/auth/refresh` → rota el refresh token (detección de reuso)
- `POST /api/v1/auth/logout` → revoca la sesión
- `GET  /api/v1/auth/sessions` → dispositivos conectados (requiere Bearer)

La web usa NextAuth (cookie httpOnly); la futura app móvil pega directo a estos
endpoints guardando el token en SecureStore/Keychain.
