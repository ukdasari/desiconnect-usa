import { Global, Inject, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@desiconnect/database";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ datasourceUrl: config.DATABASE_URL, log: ["warn", "error"] });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
