import { BullModule, Processor, WorkerHost } from "@nestjs/bullmq";
import { type DynamicModule, Global, Module } from "@nestjs/common";
import type { Job } from "bullmq";
import { loadEnv } from "../config/env";
import { EmailService } from "./email.service";
import { NOTIFICATIONS_QUEUE, NotificationsService, type NotificationJob } from "./notifications.service";

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsWorker extends WorkerHost {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    await this.notifications.deliver(job.data);
  }
}

@Global()
@Module({})
export class NotificationsModule {
  /** Registers BullMQ only when Redis is configured and inline delivery is off. */
  static register(): DynamicModule {
    const env = loadEnv();
    const useQueue = !!env.REDIS_URL && !env.NOTIFICATIONS_INLINE;
    if (!useQueue) {
      return { module: NotificationsModule, providers: [NotificationsService, EmailService], exports: [NotificationsService, EmailService] };
    }
    const url = new URL(env.REDIS_URL);
    return {
      module: NotificationsModule,
      imports: [
        BullModule.forRoot({
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === "rediss:" ? {} : undefined,
          },
        }),
        BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
      ],
      providers: [NotificationsService, EmailService, NotificationsWorker],
      exports: [NotificationsService, EmailService],
    };
  }
}
