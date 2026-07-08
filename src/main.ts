import { VersioningType } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module.js";
import { configureApiApplication } from "./bootstrap/api-bootstrap.js";
import { completeOpenApiDoc } from "./common/swagger/openapi-doc-completion.js";
import appConfig from "./config/app.config.js";

/**
 * Start the NestJS application and expose the Swagger documentation.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApiApplication(app);
  app.enableShutdownHooks();

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "api/v",
    defaultVersion: "1",
  });

  // allow cors
  app.enableCors();

  // Create the Swagger document
  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("RAG-KBS")
      .setDescription(
        "RAG-KBS is a backend-only Retrieval-Augmented Generation knowledge base service. It manages tenant-scoped metadata, binary storage references, ingestion jobs, chunk debugging, semantic retrieval, and dependency health checks."
      )
      .setVersion("1.0")
      .addTag("App", "Basic API reachability endpoint.")
      .addTag(
        "Health",
        "Version-neutral liveness, readiness, and dependency checks."
      )
      .addTag("Knowledge Bases", "Tenant-scoped logical RAG knowledge bases.")
      .addTag("Sources", "Logical sources inside knowledge bases.")
      .addTag(
        "Storage",
        "Multipart binary upload and storage metadata creation."
      )
      .addTag("Storage Objects", "Physical object storage metadata.")
      .addTag("Files", "Logical document file metadata attached to sources.")
      .addTag("Tags", "Searchable metadata tags and source/file assignments.")
      .addTag("Chunks", "Safe read-only chunk and embedding debug endpoints.")
      .addTag("Ingestion", "BullMQ-backed ingestion job lifecycle endpoints.")
      .addTag(
        "Retrieval",
        "Semantic retrieval and query traceability endpoints."
      )
      .build()
  );

  SwaggerModule.setup(
    "api/v1/swagger",
    app,
    completeOpenApiDoc(cleanupOpenApiDoc(openApiDoc)),
    {
      swaggerOptions: {
        persistAuthorization: true,
      },
    }
  );

  const { port } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  await app.listen(port);
}
void bootstrap();
