import { DistanceMetric } from "../../generated/prisma/enums.js";

export type QdrantDistanceMetric = "Cosine" | "Dot" | "Euclid" | "Manhattan";

export const qdrantDistanceMetricByPrismaMetric: Record<
  DistanceMetric,
  QdrantDistanceMetric
> = {
  [DistanceMetric.COSINE]: "Cosine",
  [DistanceMetric.DOT]: "Dot",
  [DistanceMetric.EUCLID]: "Euclid",
  [DistanceMetric.MANHATTAN]: "Manhattan",
};
