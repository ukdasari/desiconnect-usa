import { Inject, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { timingSafeEqual } from "node:crypto";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Rate limits per visitor. The website calls the API from its own server, so without this every website visitor
 * would share one limit. The website forwards the visitor's IP in `x-client-ip`, proven by the shared
 * `INTERNAL_API_KEY` in `x-internal-key`; anyone else is limited by their own connection's IP.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  @Inject(APP_CONFIG) private readonly appConfig!: AppConfig;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ThrottlerGuard's signature
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const key = this.appConfig?.INTERNAL_API_KEY;
    const sent = req.headers?.["x-internal-key"];
    const client = req.headers?.["x-client-ip"];
    if (key && typeof sent === "string" && sameSecret(sent, key) && typeof client === "string" && IP_RE.test(client)) return `client:${client}`;
    return req.ip ?? "unknown";
  }
}
