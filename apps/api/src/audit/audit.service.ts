import { Global, Injectable, Logger, Module } from "@nestjs/common";
import type { Prisma } from "@desiconnect/database";
import { PrismaService } from "../common/prisma.service";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/** Append-only audit trail. Required for every admin action and security-relevant user action. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress ?? null,
        },
      });
    } catch (err) {
      // Inside a transaction the caller must see the failure; outside, never fail the user request.
      if (tx) throw err;
      this.logger.error({ err, entry }, "Failed to write audit log");
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
