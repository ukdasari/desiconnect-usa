import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

/** Create a Prisma client. The API wraps this in a Nest provider; scripts can use it directly. */
export function createPrismaClient(options?: { databaseUrl?: string; log?: boolean }): PrismaClient {
  return new PrismaClient({
    datasourceUrl: options?.databaseUrl,
    log: options?.log ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

/** Distance conversion used by radius search. */
export const METERS_PER_MILE = 1609.344;
