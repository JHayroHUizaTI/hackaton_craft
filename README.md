# RUBRIC

Ensaya un pitch de 45 segundos o 3 minutos contra una rúbrica publicada. RUBRIC
transcribe el audio, puntúa cinco criterios, propone exactamente tres cambios y
muestra el delta del siguiente intento. El leaderboard y los contadores se
actualizan en vivo con Convex.

## Puesta en marcha (60 segundos)

Requisitos: Node.js 20+, una cuenta de Convex y una API key de OpenAI.

```bash
npm install
cd apps/rubric
npx convex dev
```

En otra terminal:

```bash
npx convex env set OPENAI_API_KEY sk-...
npx convex env set OPENAI_SCORING_MODEL gpt-4o-mini
npm run dev
```

Abre <http://localhost:3000>. `npx convex dev` crea `.env.local` con
`NEXT_PUBLIC_CONVEX_URL`; las claves de OpenAI viven únicamente en el entorno de
Convex y nunca llegan al navegador.

## Arquitectura

```text
MediaRecorder
  -> URL de subida firmada
  -> Convex Storage
  -> Convex Action
       -> OpenAI Transcriptions (gpt-4o-mini-transcribe)
       -> OpenAI Responses (JSON Schema estricto)
  -> attempts / scores / counters en Convex
  -> suscripciones reactivas de Next.js
```

Convex es el único datastore y backend operativo. El código NestJS/Prisma de la
etapa CRM ya no forma parte del workspace ejecutable; la especificación histórica
se conserva en [`crm_prime.sams.md`](./crm_prime.sams.md).

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

La implementación sigue [`crm_prime.md`](./crm_prime.md), el PRD acotado para el
hackathon Learning by Shipping. El guion cronometrado, las preguntas de defensa
y la lista de ensayos están en [`docs/DEMO_RUNBOOK.md`](./docs/DEMO_RUNBOOK.md).
# hackaton_craft
