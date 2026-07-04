import type { Request } from "express";

export type RequestContext = {
  requestId: string;
  method?: string;
  path?: string;
};

export type RequestWithContext = Request & {
  requestId?: string;
  requestContext?: RequestContext;
};
