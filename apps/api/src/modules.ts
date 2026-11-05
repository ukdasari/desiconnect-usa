// Domain modules of the modular monolith. Each owns its controllers and services.
import { Module } from "@nestjs/common";
import { AdminController, ReportsController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import {
  EventRegistrationsController,
  FavoritesController,
  InquiriesController,
  JobApplicationsController,
} from "./engagement/engagement.controller";
import { EngagementService } from "./engagement/engagement.service";
import { ListingsController } from "./listings/listings.controller";
import { ListingsService } from "./listings/listings.service";
import { ProvidersController } from "./providers/providers.controller";
import { ProvidersService } from "./providers/providers.service";
import { ClaimsController } from "./claims/claims.controller";
import { ClaimsService } from "./claims/claims.service";
import { AccountService } from "./users/account.service";
import { MeController } from "./users/me.controller";

@Module({ controllers: [ListingsController], providers: [ListingsService], exports: [ListingsService] })
export class ListingsModule {}

@Module({
  controllers: [InquiriesController, EventRegistrationsController, JobApplicationsController, FavoritesController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}

@Module({ imports: [ListingsModule, EngagementModule], controllers: [MeController], providers: [AccountService] })
export class UsersModule {}

@Module({ imports: [ListingsModule], controllers: [ProvidersController], providers: [ProvidersService] })
export class ProvidersModule {}

@Module({ controllers: [ClaimsController], providers: [ClaimsService], exports: [ClaimsService] })
export class ClaimsModule {}

@Module({ imports: [ClaimsModule], controllers: [AdminController, ReportsController], providers: [AdminService] })
export class AdminModule {}
