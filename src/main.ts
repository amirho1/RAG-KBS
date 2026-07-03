import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";

/**
 * Start the NestJS application and expose the Swagger documentation.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("RAG-KBS")
      .setDescription(
        "RAG-KBS is a framework for building knowledge bases using RAG."
      )
      .setVersion("1.0")
      .build()
  );

  SwaggerModule.setup("api/v1/swagger", app, cleanupOpenApiDoc(openApiDoc), {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
