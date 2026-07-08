import { VersioningType, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "../../app.module.js";
import { completeOpenApiDoc } from "./openapi-doc-completion.js";

type OpenApiSchema = {
  $ref?: string;
  description?: string;
  example?: unknown;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
};

type OpenApiContent = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
};

type OpenApiResponse = {
  description?: string;
  content?: Record<string, OpenApiContent>;
};

type OpenApiRequestBody = {
  description?: string;
  content?: Record<string, OpenApiContent>;
};

type OpenApiParameter = {
  name: string;
  description?: string;
  example?: unknown;
  examples?: Record<string, unknown>;
  schema?: OpenApiSchema;
};

type OpenApiOperation = {
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
};

type OpenApiPathItem = {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
};

type OperationEntry = {
  method: string;
  path: string;
  operation: OpenApiOperation;
};

describe("completeOpenApiDoc", function () {
  let app: INestApplication;
  let openApiDoc: OpenAPIObject;

  beforeAll(async function () {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: "api/v",
      defaultVersion: "1",
    });
    await app.init();

    openApiDoc = createCompletedOpenApiDocument(app);
  });

  afterAll(async function () {
    await app.close();
  });

  it("documents every generated operation with examples and schemas", function () {
    const operations = getOperations(openApiDoc);

    expect(operations).toHaveLength(50);
    expect(findOperationDocumentationIssues(operations)).toEqual([]);
  });

  it("documents component schema properties with descriptions and examples", function () {
    expect(findComponentSchemaIssues(openApiDoc)).toEqual([]);
  });
});

/**
 * Create the completed OpenAPI document used by Swagger UI.
 * @param app - Nest application.
 * @returns Completed OpenAPI document.
 */
function createCompletedOpenApiDocument(app: INestApplication): OpenAPIObject {
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

  return completeOpenApiDoc(cleanupOpenApiDoc(openApiDoc));
}

/**
 * Get all HTTP operations from the OpenAPI document.
 * @param openApiDoc - OpenAPI document.
 * @returns Operation entries.
 */
function getOperations(openApiDoc: OpenAPIObject): OperationEntry[] {
  const operations: OperationEntry[] = [];
  const paths = openApiDoc.paths as Record<string, OpenApiPathItem>;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathItem[method as keyof OpenApiPathItem];

      if (operation) {
        operations.push({ method, path, operation });
      }
    }
  }

  return operations;
}

/**
 * Find missing operation-level Swagger documentation.
 * @param operations - OpenAPI operation entries.
 * @returns Documentation issues.
 */
function findOperationDocumentationIssues(
  operations: OperationEntry[]
): string[] {
  return operations.flatMap((entry) => [
    ...findOperationSummaryIssues(entry),
    ...findParameterIssues(entry),
    ...findRequestBodyIssues(entry),
    ...findResponseIssues(entry),
  ]);
}

/**
 * Find missing summaries or descriptions.
 * @param entry - Operation entry.
 * @returns Documentation issues.
 */
function findOperationSummaryIssues(entry: OperationEntry): string[] {
  const issues: string[] = [];
  const label = createOperationLabel(entry);

  if (!isNonEmptyString(entry.operation.summary)) {
    issues.push(`${label}: missing summary`);
  }

  if (!isNonEmptyString(entry.operation.description)) {
    issues.push(`${label}: missing description`);
  }

  return issues;
}

/**
 * Find missing parameter descriptions or examples.
 * @param entry - Operation entry.
 * @returns Documentation issues.
 */
function findParameterIssues(entry: OperationEntry): string[] {
  const issues: string[] = [];
  const label = createOperationLabel(entry);

  for (const parameter of entry.operation.parameters ?? []) {
    if (!isNonEmptyString(parameter.description)) {
      issues.push(`${label}: parameter ${parameter.name} missing description`);
    }

    if (!hasExample(parameter) && !hasExample(parameter.schema)) {
      issues.push(`${label}: parameter ${parameter.name} missing example`);
    }
  }

  return issues;
}

/**
 * Find missing request body schemas or examples.
 * @param entry - Operation entry.
 * @returns Documentation issues.
 */
function findRequestBodyIssues(entry: OperationEntry): string[] {
  const issues: string[] = [];
  const label = createOperationLabel(entry);
  const requestBody = entry.operation.requestBody;

  if (!requestBody) {
    return issues;
  }

  if (!isNonEmptyString(requestBody.description)) {
    issues.push(`${label}: request body missing description`);
  }

  for (const [contentType, content] of Object.entries(
    requestBody.content ?? {}
  )) {
    if (!content.schema) {
      issues.push(`${label}: request body ${contentType} missing schema`);
    }

    if (!hasExample(content)) {
      issues.push(`${label}: request body ${contentType} missing example`);
    }
  }

  return issues;
}

/**
 * Find missing response schemas or examples.
 * @param entry - Operation entry.
 * @returns Documentation issues.
 */
function findResponseIssues(entry: OperationEntry): string[] {
  const issues: string[] = [];
  const label = createOperationLabel(entry);

  for (const [statusCode, response] of Object.entries(
    entry.operation.responses ?? {}
  )) {
    if (!isNonEmptyString(response.description)) {
      issues.push(`${label}: response ${statusCode} missing description`);
    }

    if (statusCode === "204") {
      continue;
    }

    const contentEntries = Object.entries(response.content ?? {});

    if (contentEntries.length === 0) {
      issues.push(`${label}: response ${statusCode} missing content`);
      continue;
    }

    for (const [contentType, content] of contentEntries) {
      if (!content.schema) {
        issues.push(
          `${label}: response ${statusCode} ${contentType} missing schema`
        );
      }

      if (!hasExample(content)) {
        issues.push(
          `${label}: response ${statusCode} ${contentType} missing example`
        );
      }
    }
  }

  return issues;
}

/**
 * Find missing component schema property descriptions or examples.
 * @param openApiDoc - OpenAPI document.
 * @returns Documentation issues.
 */
function findComponentSchemaIssues(openApiDoc: OpenAPIObject): string[] {
  const issues: string[] = [];
  const schemas = (openApiDoc.components?.schemas ?? {}) as Record<
    string,
    OpenApiSchema
  >;

  for (const [schemaName, schema] of Object.entries(schemas)) {
    collectSchemaIssues(schema, schemaName, issues);
  }

  return issues;
}

/**
 * Collect missing schema property documentation issues recursively.
 * @param schema - Current schema.
 * @param path - Current property path.
 * @param issues - Mutable issue list.
 */
function collectSchemaIssues(
  schema: OpenApiSchema,
  path: string,
  issues: string[]
): void {
  if (schema.$ref) {
    return;
  }

  for (const [propertyName, propertySchema] of Object.entries(
    schema.properties ?? {}
  )) {
    const propertyPath = `${path}.${propertyName}`;

    if (!propertySchema.$ref && !isNonEmptyString(propertySchema.description)) {
      issues.push(`${propertyPath}: missing description`);
    }

    if (!propertySchema.$ref && !hasExample(propertySchema)) {
      issues.push(`${propertyPath}: missing example`);
    }

    collectSchemaIssues(propertySchema, propertyPath, issues);
  }

  if (schema.items) {
    collectSchemaIssues(schema.items, `${path}[]`, issues);
  }

  for (const nestedSchema of [
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.allOf ?? []),
  ]) {
    collectSchemaIssues(nestedSchema, path, issues);
  }
}

/**
 * Check whether a documentation object has an example or allowed enum/default value.
 * @param value - Value to inspect.
 * @returns True when an example-like value exists.
 */
function hasExample(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    example?: unknown;
    examples?: unknown;
    enum?: unknown[];
    default?: unknown;
  };

  return (
    candidate.example !== undefined ||
    candidate.examples !== undefined ||
    candidate.default !== undefined ||
    Boolean(candidate.enum && candidate.enum.length > 0)
  );
}

/**
 * Check whether a value is a non-empty string.
 * @param value - Value to inspect.
 * @returns True when the value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Create a readable operation label.
 * @param entry - Operation entry.
 * @returns Operation label.
 */
function createOperationLabel(entry: OperationEntry): string {
  return `${entry.method.toUpperCase()} ${entry.path}`;
}
