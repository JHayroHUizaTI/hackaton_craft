import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true expone req.rawBody para validar la firma del webhook de Meta.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Versionado de API: todo cuelga de /api/v1
  app.setGlobalPrefix("api/v1");

  // CORS para la app móvil (la web pasa por su propio BFF en Next).
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? true,
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API escuchando en http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
