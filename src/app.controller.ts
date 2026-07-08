import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service.js";

/**
 * Root API reachability endpoint.
 */
@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Return the default API greeting.
   * @returns The default API greeting.
   */
  @Get()
  @ApiOperation({
    summary: "Get API greeting",
    description:
      "Returns a small default greeting that confirms the versioned API route is reachable.",
  })
  @ApiOkResponse({
    description: "Default API greeting returned.",
    content: {
      "text/plain": {
        schema: {
          type: "string",
          example: "Hello World!",
        },
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
