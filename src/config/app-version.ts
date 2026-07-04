import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolve the application version from package.json.
 * @returns The semantic version string.
 */
export function resolveAppVersion(): string {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };

    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
