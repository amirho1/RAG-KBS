import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service.js";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Return the default API greeting.
   * @returns The default API greeting.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
