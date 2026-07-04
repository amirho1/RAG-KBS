import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  /**
   * Get the default API greeting.
   * @returns The default API greeting.
   */
  getHello(): string {
    return "Hello World!";
  }
}
